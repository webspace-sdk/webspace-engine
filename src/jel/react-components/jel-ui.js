import React, { useState, useCallback, forwardRef, useEffect } from "react";
import mixpanel from "mixpanel-browser";
import PropTypes from "prop-types";
import HubTrail from "./hub-trail";
import styled from "styled-components";
import mutedIcon from "../../assets/jel/images/icons/mic-muted.svgi";
import unmutedIcon from "../../assets/jel/images/icons/mic-unmuted.svgi";
import { BigIconButton } from "./icon-button";
import { isAtomInSubtree, findChildrenAtomsInTreeData, useTreeData } from "../utils/tree-utils";
import { useHubBoundPopupPopper, usePopupPopper } from "../utils/popup-utils";
import { navigateToHubUrl } from "../utils/jel-url-utils";
import { cancelEventIfFocusedWithin } from "../utils/dom-utils";
import JelSidePanels from "./jel-side-panels";
import dotsIcon from "../../assets/jel/images/icons/dots-horizontal-overlay-shadow.svgi";
import addIcon from "../../assets/jel/images/icons/add-shadow.svgi";
import HubRenamePopup from "./hub-rename-popup";
import CreateEmbedPopup from "./create-embed-popup";
import HubContextMenu from "./hub-context-menu";
import CreateSelectPopup from "./create-select-popup";
import { homeHubForSpaceId } from "../utils/membership-utils";
import { WrappedIntlProvider } from "../../hubs/react-components/wrapped-intl-provider";
import { useSceneMuteState } from "../utils/shared-effects";
import { getMessages } from "../../hubs/utils/i18n";
import Tooltip from "./tooltip";
import KeyTips from "./key-tips";
import LoadingPanel from "./loading-panel";
import { CREATE_SELECT_WIDTH, CREATE_SELECT_LIST_HEIGHT } from "./create-select";
import qsTruthy from "../../hubs/utils/qs_truthy";

const skipSidePanels = qsTruthy("skip_panels");

const Wrap = styled.div`
  pointer-events: none;
  height: 100%;
  top: 0;
  position: fixed;
  z-index: 4;
  display: flex;
  flex-direction: column;

  #jel-interface:focus-within & {
    pointer-events: auto;
  }

  body.paused & {
    pointer-events: auto;
  }
`;

const FadeEdges = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;

  background: linear-gradient(
    180deg,
    rgba(64, 64, 64, 0.4) 0%,
    rgba(32, 32, 32, 0) 128px,
    rgba(32, 32, 32, 0) calc(100% - 500px),
    rgba(64, 64, 64, 0.4) 100%
  );

  body.low-detail & {
    background: none;
  }

  pointer-events: none;
`;

const Top = styled.div`
  flex: 1;
  display: flex;
  flex-direction: row;
  width: 100%;
  align-items: flex-start;
`;

// Note the hack left: here is because the popper position update
// ends up being behind if we try to change the placement of the popper
// for the create select dropdown, which is necessary to support the top
// corner button variant. So we keep it bottom-end, and offset the ref here
// for when we want it centered.
const CreateSelectPopupRef = styled.div`
  position: absolute;
  top: calc(100% - ${Math.floor(CREATE_SELECT_LIST_HEIGHT) + 100}px);
  left: calc(50% + ${Math.floor(CREATE_SELECT_WIDTH / 2)}px);
  width: 1px;
  height: 1px;
  pointer-events: none;
`;

const CenterPopupRef = styled.div`
  position: absolute;
  top: 70%;
  left: 50%;
  width: 1px;
  height: 1px;
  pointer-events: none;
`;

const HubCornerButtonElement = styled.button`
  color: var(--canvas-overlay-text-color);
  width: content-width;
  margin: 11px 12px 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-radius: 4px;
  cursor: pointer;
  pointer-events: auto;
  padding: 6px 10px;
  border: 0;
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  outline-style: none;
  background-color: transparent;
  font-weight: var(--canvas-overlay-item-text-weight);
  text-align: left;
  max-width: fit-content;
  text-shadow: 0px 0px 4px;

  &:hover {
    background-color: var(--canvas-overlay-item-hover-background-color);
  }

  &:active {
    background-color: var(--canvas-overlay-item-active-background-color);
  }

  .panels-expanded & {
    display: none;
  }
`;

const HubCornerButtons = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
`;

const HubCornerButtonIcon = styled.div`
  width: 22px;
  height: 22px;
`;

const HubContextButton = forwardRef((props, ref) => {
  return (
    <HubCornerButtonElement {...props} ref={ref}>
      <HubCornerButtonIcon dangerouslySetInnerHTML={{ __html: dotsIcon }} />
    </HubCornerButtonElement>
  );
});

HubContextButton.displayName = "HubContextButton";

const HubCreateButton = forwardRef((props, ref) => {
  const messages = getMessages();

  return (
    <Tooltip content={messages["create.tip"]} placement="top" key="mute" delay={500}>
      <HubCornerButtonElement {...props} ref={ref}>
        <HubCornerButtonIcon dangerouslySetInnerHTML={{ __html: addIcon }} />
      </HubCornerButtonElement>
    </Tooltip>
  );
});

HubCreateButton.displayName = "HubCreateButton";

const KeyTipsWrap = styled.div`
  position: absolute;
  bottom: 0;
  right: 0;
`;

const BottomLeftPanels = styled.div`
  position: absolute;
  bottom: 14px;
  left: 0;
`;

const DeviceStatuses = styled.div`
  display: flex;
  flex-direction: row;
  margin: 8px 12px;
  display: none;

  .panels-expanded & {
    display: block;
  }
`;

function JelUI(props) {
  const { scene, treeManager, history, spaceCan, hubCan, hub, memberships, unavailableReason } = props;
  const tree = treeManager && treeManager.sharedNav;
  const spaceChannel = window.APP.spaceChannel;
  const hubMetadata = tree && tree.atomMetadata;
  const hubTrailHubIds = (tree && hub && tree.getAtomTrailForAtomId(hub.hub_id)) || (hub && [hub.hub_id]) || [];
  const [muted, setMuted] = useState(false);
  const [treeData, setTreeData] = useState([]);
  const [treeDataVersion, setTreeDataVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [createEmbedType, setCreateEmbedType] = useState("image");

  const renameFocusRef = React.createRef();
  const hubContextButtonRef = React.createRef();
  const hubCreateButtonRef = React.createRef();
  const createSelectFocusRef = React.createRef();
  const createSelectPopupRef = React.createRef();
  const centerPopupRef = React.createRef();
  const createEmbedFocusRef = React.createRef();

  const {
    styles: hubRenamePopupStyles,
    attributes: hubRenamePopupAttributes,
    setPopup: setHubRenamePopupElement,
    setRef: setHubRenameReferenceElement,
    hubId: hubRenameHubId,
    show: showHubRenamePopup,
    popupElement: hubRenamePopupElement,
    update: updateHubRenamePopup
  } = useHubBoundPopupPopper(renameFocusRef, "bottom-start", [0, 8]);

  const {
    styles: hubContextMenuStyles,
    attributes: hubContextMenuAttributes,
    hubId: hubContextMenuHubId,
    show: showHubContextMenuPopup,
    setPopup: setHubContextMenuElement,
    popupOpenOptions: hubContextMenuOpenOptions,
    popupElement: hubContextMenuElement,
    update: updateHubContextMenu
  } = useHubBoundPopupPopper();

  const {
    styles: createSelectPopupStyles,
    attributes: createSelectPopupAttributes,
    show: showCreateSelectPopup,
    setPopup: setCreateSelectPopupElement,
    popupElement: createSelectPopupElement,
    update: updateCreateSelectPopup
  } = usePopupPopper(".create-select-selection-search-input", "bottom-end", [0, 8]);

  const {
    styles: createEmbedPopupStyles,
    attributes: createEmbedPopupAttributes,
    show: showCreateEmbedPopup,
    setPopup: setCreateEmbedPopupElement,
    update: updateCreateEmbedPopup
  } = usePopupPopper(createEmbedFocusRef, "bottom", [0, 8]);

  // When panels are re-sized we need to re-layout popups
  useEffect(
    () => {
      const handleResizeComplete = () => {
        if (updateHubRenamePopup) updateHubRenamePopup();
        if (updateHubContextMenu) updateHubContextMenu();
        if (updateCreateSelectPopup) updateCreateSelectPopup();
        if (updateCreateEmbedPopup) updateCreateEmbedPopup();
      };

      scene && scene.addEventListener("animated_resize_complete", handleResizeComplete);
      () => scene && scene.removeEventListener("animated_resize_complete", handleResizeComplete);
    },
    [scene, updateHubRenamePopup, updateHubContextMenu, updateCreateSelectPopup, updateCreateEmbedPopup]
  );

  useSceneMuteState(scene, setMuted);

  // Consume tree updates so redraws if user manipulates tree
  useTreeData(tree, treeDataVersion, setTreeData, setTreeDataVersion);

  useEffect(() => {
    const handler = () => setIsLoading(false);

    scene && scene.addEventListener("terrain_chunk_loading_complete", handler);
    () => scene && scene.removeEventListener("terrain_chunk_loading_complete", handler);
  });

  // Handle create hotkey (typically /)
  useEffect(
    () => {
      const handleCreateHotkey = () => showCreateSelectPopup(createSelectPopupRef);
      scene && scene.addEventListener("action_create", handleCreateHotkey);
      return () => scene && scene.removeEventListener("action_create", handleCreateHotkey);
    },
    [scene, createSelectPopupRef, showCreateSelectPopup]
  );

  // Handle embed popup trigger
  useEffect(
    () => {
      const handleCreateEmbed = e => {
        setCreateEmbedType(e.detail);
        showCreateEmbedPopup(centerPopupRef);
      };

      scene && scene.addEventListener("action_show_create_embed", handleCreateEmbed);
      return () => scene && scene.removeEventListener("action_show_create_embed", handleCreateEmbed);
    },
    [scene, centerPopupRef, showCreateEmbedPopup]
  );

  const onCreateActionSelected = useCallback(a => scene.emit("create_action_exec", a), [scene]);

  const onTrailHubNameChanged = useCallback((hubId, name) => spaceChannel.updateHub(hubId, { name }), [spaceChannel]);

  return (
    <WrappedIntlProvider>
      <div>
        <LoadingPanel isLoading={isLoading} unavailableReason={unavailableReason} />
        <Wrap id="jel-ui-wrap">
          <FadeEdges />
          <CreateSelectPopupRef ref={createSelectPopupRef} />
          <CenterPopupRef ref={centerPopupRef} />
          <Top>
            {hubMetadata && (
              <HubTrail
                tree={tree}
                history={history}
                hubMetadata={hubMetadata}
                hubCan={hubCan}
                hubIds={hubTrailHubIds}
                hubRenamePopupElement={hubRenamePopupElement}
                showHubRenamePopup={showHubRenamePopup}
                onHubNameChanged={onTrailHubNameChanged}
              />
            )}
            <HubCornerButtons>
              <HubCreateButton
                ref={hubCreateButtonRef}
                onMouseDown={e => cancelEventIfFocusedWithin(e, createSelectPopupElement)}
                onClick={() => {
                  window.APP.store.handleActivityFlag("createMenu");
                  showCreateSelectPopup(hubCreateButtonRef, "bottom-end");
                }}
              />
              <HubContextButton
                ref={hubContextButtonRef}
                onMouseDown={e => cancelEventIfFocusedWithin(e, hubContextMenuElement)}
                onClick={() => {
                  showHubContextMenuPopup(hub.hub_id, hubContextButtonRef, "bottom-end", [0, 8], {
                    hideRename: true
                  });
                }}
              />
            </HubCornerButtons>
          </Top>
          <KeyTipsWrap
            onClick={() =>
              window.APP.store.update({ settings: { hideKeyTips: !window.APP.store.state.settings.hideKeyTips } })
            }
          >
            <KeyTips id="key-tips" />
          </KeyTipsWrap>
          <BottomLeftPanels>
            <DeviceStatuses>
              <BigIconButton tabIndex={-1} iconSrc={muted ? mutedIcon : unmutedIcon} />
            </DeviceStatuses>
          </BottomLeftPanels>
        </Wrap>
        {!skipSidePanels && (
          <JelSidePanels
            {...props}
            showHubRenamePopup={showHubRenamePopup}
            setHubRenameReferenceElement={setHubRenameReferenceElement}
            showHubContextMenuPopup={showHubContextMenuPopup}
          />
        )}
      </div>
      <HubRenamePopup
        setPopperElement={setHubRenamePopupElement}
        styles={hubRenamePopupStyles}
        attributes={hubRenamePopupAttributes}
        hubId={hubRenameHubId}
        hubMetadata={hubMetadata}
        ref={renameFocusRef}
        onNameChanged={useCallback(name => spaceChannel.updateHub(hubRenameHubId, { name }), [
          spaceChannel,
          hubRenameHubId
        ])}
      />
      <CreateEmbedPopup
        setPopperElement={setCreateEmbedPopupElement}
        styles={createEmbedPopupStyles}
        attributes={createEmbedPopupAttributes}
        embedType={createEmbedType}
        ref={createEmbedFocusRef}
        onURLEntered={useCallback(url => scene.emit("add_media", url), [scene])}
      />
      <HubContextMenu
        setPopperElement={setHubContextMenuElement}
        hideRename={!!hubContextMenuOpenOptions.hideRename}
        styles={hubContextMenuStyles}
        attributes={hubContextMenuAttributes}
        hubId={hubContextMenuHubId}
        spaceCan={spaceCan}
        hubCan={hubCan}
        onRenameClick={useCallback(hubId => showHubRenamePopup(hubId, null), [showHubRenamePopup])}
        onTrashClick={useCallback(
          hubId => {
            if (!tree.getNodeIdForAtomId(hubId)) return;

            // If this hub or any of its parents were deleted, go home.
            if (isAtomInSubtree(tree, hubId, hub.hub_id)) {
              const homeHub = homeHubForSpaceId(hub.space_id, memberships);
              navigateToHubUrl(history, homeHub.url);
            }

            // All trashable children are trashed too.
            const trashableChildrenHubIds = findChildrenAtomsInTreeData(treeData, hubId).filter(hubId =>
              hubCan("trash_hub", hubId)
            );

            spaceChannel.trashHubs([...trashableChildrenHubIds, hubId]);
          },
          [tree, hub, history, hubCan, memberships, spaceChannel, treeData]
        )}
      />
      <CreateSelectPopup
        popperElement={createSelectPopupElement}
        setPopperElement={setCreateSelectPopupElement}
        styles={createSelectPopupStyles}
        attributes={createSelectPopupAttributes}
        ref={createSelectFocusRef}
        onActionSelected={onCreateActionSelected}
      />
      <input
        id="file-upload-input"
        type="file"
        style={{ display: "none" }}
        accept={"*"}
        multiple
        onChange={e => {
          for (const file of e.target.files) {
            scene.emit("add_media", file);
          }
          e.target.value = null;
        }}
      />
    </WrappedIntlProvider>
  );
}

JelUI.propTypes = {
  treeManager: PropTypes.object,
  history: PropTypes.object,
  hub: PropTypes.object,
  spaceCan: PropTypes.func,
  hubCan: PropTypes.func,
  scene: PropTypes.object,
  spacePresences: PropTypes.object,
  selectedMediaLayer: PropTypes.number,
  //sessionId: PropTypes.string,
  spaceId: PropTypes.string,
  memberships: PropTypes.array,
  unavailableReason: PropTypes.string
};

export default JelUI;
