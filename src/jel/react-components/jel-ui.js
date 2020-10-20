import React, { useState, forwardRef } from "react";
import PropTypes from "prop-types";
import HubTrail from "./hub-trail";
import styled from "styled-components";
import { isAtomInSubtree, findChildrenAtomsInTreeData, useTreeData } from "../utils/tree-utils";
import { useHubBoundPopupPopper } from "../utils/popup-utils";
import { navigateToHubUrl } from "../utils/jel-url-utils";
import { cancelEventIfFocusedWithin } from "../utils/dom-utils";
import JelSidePanels from "./jel-side-panels";
import dotsIcon from "../assets/images/icons/dots-horizontal-overlay-shadow.svgi";
import HubRenamePopup from "./hub-rename-popup";
import HubContextMenu from "./hub-context-menu";
import { homeHubForSpaceId } from "../utils/membership-utils";
import { WrappedIntlProvider } from "../../hubs/react-components/wrapped-intl-provider";

const Wrap = styled.div`
  pointer-events: none;
  height: 100%;
  top: 0;
  left: var(--scene-left);
  width: calc(100% - var(--scene-right) - var(--scene-left));
  position: fixed;
  z-index: 4;
  background: linear-gradient(180deg, rgba(64, 64, 64, 0.4) 0%, rgba(32, 32, 32, 0) 128px);
  display: flex;
  flex-direction: column;
`;

const Top = styled.div`
  flex: 1;
  display: flex;
  flex-direction: row;
  width: 100%;
  align-items: flex-start;
`;

const HubContextButtonElement = styled.button`
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
`;

const HubContextButtonIcon = styled.div`
  width: 22px;
  height: 22px;
`;

const HubContextButton = forwardRef((props, ref) => {
  return (
    <HubContextButtonElement {...props} ref={ref}>
      <HubContextButtonIcon dangerouslySetInnerHTML={{ __html: dotsIcon }} />
    </HubContextButtonElement>
  );
});

HubContextButton.displayName = "HubContextButton";

function JelUI(props) {
  const { treeManager, history, spaceCan, hubCan, hub, memberships } = props;
  const tree = treeManager && treeManager.sharedNav;
  const spaceChannel = window.APP.spaceChannel;
  const hubMetadata = tree && tree.atomMetadata;
  const hubTrailHubIds = (tree && hub && tree.getAtomTrailForAtomId(hub.hub_id)) || (hub && [hub.hub_id]) || [];
  const [treeData, setTreeData] = useState([]);
  const [treeDataVersion, setTreeDataVersion] = useState(0);

  const renameFocusRef = React.createRef();
  const hubContextButtonRef = React.createRef();

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

  // Consume tree updates so redraws if user manipulates tree
  useTreeData(tree, treeDataVersion, setTreeData, setTreeDataVersion);

  return (
    <WrappedIntlProvider>
      <div>
        <Wrap>
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
                onHubNameChanged={(hubId, name) => spaceChannel.updateHub(hubId, { name })}
              />
            )}
            <HubContextButton
              ref={hubContextButtonRef}
              onMouseDown={e => cancelEventIfFocusedWithin(e, hubContextMenuElement)}
              onClick={() => {
                showHubContextMenuPopup(hub.hub_id, hubContextButtonRef, "bottom-end", [0, 8], {
                  hideRename: true,
                  toggle: true
                });
              }}
            />
          </Top>
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
        onNameChanged={name => window.APP.spaceChannel.updateHub(hubRenameHubId, { name })}
      />
      <HubContextMenu
        setPopperElement={setHubContextMenuElement}
        hideRename={!!hubContextMenuOpenOptions.hideRename}
        styles={hubContextMenuStyles}
        attributes={hubContextMenuAttributes}
        hubId={hubContextMenuHubId}
        spaceCan={spaceCan}
        hubCan={hubCan}
        onRenameClick={hubId => showHubRenamePopup(hubId, null)}
        onTrashClick={hubId => {
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

          window.APP.spaceChannel.trashHubs([...trashableChildrenHubIds, hubId]);
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
  //orgPresences: PropTypes.object,
  //hubPresences: PropTypes.object,
  //sessionId: PropTypes.string,
  //spaceId: PropTypes.string,
  memberships: PropTypes.array
};

export default JelUI;
