import React, { useState, useCallback, forwardRef, useEffect } from "react";
import PropTypes from "prop-types";
import HubTrail from "./hub-trail";
import LayerPager from "./layer-pager";
import styled from "styled-components";
import mutedIcon from "../assets/images/icons/mic-muted.svgi";
import unmutedIcon from "../assets/images/icons/mic-unmuted.svgi";
import { BigIconButton } from "./icon-button";
import { isAtomInSubtree, findChildrenAtomsInTreeData, useTreeData } from "../utils/tree-utils";
import { useHubBoundPopupPopper, usePopupPopper } from "../utils/popup-utils";
import { navigateToHubUrl } from "../utils/jel-url-utils";
import { cancelEventIfFocusedWithin } from "../utils/dom-utils";
import { MAX_MEDIA_LAYER } from "../systems/media-presence-system";
import JelSidePanels from "./jel-side-panels";
import dotsIcon from "../assets/images/icons/dots-horizontal-overlay-shadow.svgi";
import addIcon from "../assets/images/icons/add-shadow.svgi";
import HubRenamePopup from "./hub-rename-popup";
import HubContextMenu from "./hub-context-menu";
import CreateSelectPopup from "./create-select-popup";
import { homeHubForSpaceId } from "../utils/membership-utils";
import { WrappedIntlProvider } from "../../hubs/react-components/wrapped-intl-provider";
import { useSceneMuteState } from "../utils/shared-effects";
import { getMessages } from "../../hubs/utils/i18n";
import Tooltip from "./tooltip";
import KeyTips from "./key-tips";
import { CREATE_SELECT_WIDTH, CREATE_SELECT_LIST_HEIGHT } from "./create-select";

const Wrap = styled.div`
  pointer-events: none;
  height: 100%;
  top: 0;
  position: fixed;
  z-index: 4;
  display: flex;
  flex-direction: column;
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
  const { scene, selectedMediaLayer, treeManager, history, spaceCan, hubCan, hub, memberships } = props;
  const tree = treeManager && treeManager.sharedNav;
  const spaceChannel = window.APP.spaceChannel;
  const hubMetadata = tree && tree.atomMetadata;
  const hubTrailHubIds = (tree && hub && tree.getAtomTrailForAtomId(hub.hub_id)) || (hub && [hub.hub_id]) || [];
  const [muted, setMuted] = useState(false);
  const [treeData, setTreeData] = useState([]);
  const [treeDataVersion, setTreeDataVersion] = useState(0);

  const renameFocusRef = React.createRef();
  const hubContextButtonRef = React.createRef();
  const hubCreateButtonRef = React.createRef();
  const createSelectFocusRef = React.createRef();
  const createSelectPopupRef = React.createRef();

  const {
    styles: hubRenamePopupStyles,
    attributes: hubRenamePopupAttributes,
    setPopup: setHubRenamePopupElement,
    setRef: setHubRenameReferenceElement,
    hubId: hubRenameHubId,
    show: showHubRenamePopup,
    popupElement: hubRenamePopupElement
  } = useHubBoundPopupPopper(renameFocusRef, "bottom-start", [0, 8]);

  const {
    styles: hubContextMenuStyles,
    attributes: hubContextMenuAttributes,
    hubId: hubContextMenuHubId,
    show: showHubContextMenuPopup,
    setPopup: setHubContextMenuElement,
    popupOpenOptions: hubContextMenuOpenOptions,
    popupElement: hubContextMenuElement
  } = useHubBoundPopupPopper();

  const {
    styles: createSelectPopupStyles,
    attributes: createSelectPopupAttributes,
    show: showCreateSelectPopup,
    setPopup: setCreateSelectPopupElement,
    popupElement: createSelectPopupElement
  } = usePopupPopper(".create-select-selection-search-input", "bottom-end", [0, 8]);

  useSceneMuteState(scene, setMuted);

  // Consume tree updates so redraws if user manipulates tree
  useTreeData(tree, treeDataVersion, setTreeData, setTreeDataVersion);

  // Handle create hotkey (typically /)
  useEffect(
    () => {
      const handleCreateHotkey = () => showCreateSelectPopup(createSelectPopupRef);
      scene.addEventListener("action_create", handleCreateHotkey);
      return () => scene.removeEventListener("action_create", handleCreateHotkey);
    },
    [scene, createSelectPopupRef, showCreateSelectPopup]
  );

  const onCreateActionSelected = useCallback(a => scene.emit("create_action_exec", a), [scene]);

  const onTrailHubNameChanged = useCallback((hubId, name) => spaceChannel.updateHub(hubId, { name }), [spaceChannel]);

  return (
    <WrappedIntlProvider>
      <div>
        <Wrap id="jel-ui-wrap">
          <FadeEdges />
          <CreateSelectPopupRef ref={createSelectPopupRef} />
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
            <LayerPager
              showButtons={hubCan && hub && hubCan("spawn_and_move_media", hub.hub_id)}
              page={selectedMediaLayer + 1}
              maxPage={MAX_MEDIA_LAYER + 1}
              onPageChanged={newPage => scene.systems["hubs-systems"].mediaPresenceSystem.setActiveLayer(newPage - 1)}
            />
          </BottomLeftPanels>
        </Wrap>
        <JelSidePanels
          {...props}
          showHubRenamePopup={showHubRenamePopup}
          setHubRenameReferenceElement={setHubRenameReferenceElement}
          showHubContextMenuPopup={showHubContextMenuPopup}
        />
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
  memberships: PropTypes.array
};

export default JelUI;
