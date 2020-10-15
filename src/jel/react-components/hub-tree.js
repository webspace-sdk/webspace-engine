import PropTypes from "prop-types";
import React, { useState, useCallback } from "react";
import ReactDOM from "react-dom";
import Tree from "rc-tree";
import { usePopper } from "react-popper";
import {
  addNewHubToTree,
  createTreeDropHandler,
  useTreeData,
  useExpandableTree,
  useScrollToSelectedTreeNode,
  findChildrenAtomsInTreeData,
  isAtomInSubtree
} from "../utils/tree-utils";
import { homeHubForSpaceId } from "../utils/membership-utils";
import PopupMenu, { PopupMenuItem } from "./popup-menu";
import trashIcon from "../assets/images/icons/trash.svgi";
import sharedStyles from "../assets/stylesheets/shared.scss";
import HubNodeTitle from "./hub-node-title";
import PopupHubNameInput from "./popup-hub-name-input";
import { navigateToHubUrl } from "../utils/jel-url-utils";
import { FormattedMessage } from "react-intl";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import "../assets/stylesheets/hub-tree.scss";

let popupRoot = null;
waitForDOMContentLoaded().then(() => (popupRoot = document.getElementById("jel-popup-root")));

const HubRenamePopup = function({ styles, attributes, hubMetadata, setPopperElement, onNameChanged, hubId }) {
  const metadata = hubMetadata.getMetadata(hubId);

  const popupInput = (
    <div
      tabIndex={100} // Ensures can be focused
      className={sharedStyles.showWhenPopped}
      ref={setPopperElement}
      style={styles.popper}
      {...attributes.popper}
    >
      <PopupHubNameInput hubId={hubId} hubMetadata={metadata} onNameChanged={onNameChanged} />
    </div>
  );

  return ReactDOM.createPortal(popupInput, popupRoot);
};

const HubTreeContextMenu = function({
  styles,
  attributes,
  setPopperElement,
  hubId,
  spaceCan,
  hubCan,
  onRenameClick,
  onTrashClick
}) {
  if (!popupRoot) return null;

  const items = [];

  if (hubId && hubCan("update_hub_meta", hubId)) {
    items.push(
      <PopupMenuItem
        key={`rename-${hubId}`}
        onClick={e => {
          onRenameClick(hubId);
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <FormattedMessage id="hub-context.rename" />
      </PopupMenuItem>
    );
  }

  if (spaceCan("edit_nav") && hubId && hubCan("trash_hub", hubId)) {
    items.push(
      <PopupMenuItem
        key={`trash-${hubId}`}
        onClick={e => {
          onTrashClick(hubId);
          // Blur button so menu hides
          document.activeElement.blur();
          e.preventDefault();
          e.stopPropagation();
        }}
        iconSrc={trashIcon}
      >
        <FormattedMessage id="hub-context.move-to-trash" />
      </PopupMenuItem>
    );
  }

  const popupMenu = (
    <div
      tabIndex={100} // Ensures can be focused
      className={sharedStyles.showWhenPopped}
      ref={setPopperElement}
      style={styles.popper}
      {...attributes.popper}
    >
      <PopupMenu>
        {items.length > 0 ? (
          items
        ) : (
          <PopupMenuItem key={`no-actions-${hubId}`}>
            <div>No Actions</div>
          </PopupMenuItem>
        )}
      </PopupMenu>
    </div>
  );

  return ReactDOM.createPortal(popupMenu, popupRoot);
};

function HubTree({ treeManager, history, hub, spaceCan, hubCan, memberships, onHubNameChanged }) {
  const [navTreeData, setNavTreeData] = useState([]);
  const [hubContextMenuHubId, setHubContextMenuHubId] = useState(null);
  const [hubContextMenuReferenceElement, setHubContextMenuReferenceElement] = useState(null);
  const [hubContextMenuElement, setHubContextMenuElement] = useState(null);
  const [hubRenamePopupHubId, setHubRenamePopupHubId] = useState(null);
  const [hubRenamePopupElement, setHubRenamePopupElement] = useState(null);

  const { styles: hubContextMenuStyles, attributes: hubContextMenuAttributes } = usePopper(
    hubContextMenuReferenceElement,
    hubContextMenuElement,
    {
      placement: "bottom-start"
    }
  );

  const { styles: hubRenamePopupStyles, attributes: hubRenamePopupAttributes } = usePopper(
    hubContextMenuReferenceElement,
    hubRenamePopupElement,
    {
      placement: "bottom-start"
    }
  );

  useTreeData(treeManager && treeManager.sharedNav, setNavTreeData);
  useExpandableTree(treeManager);

  // Ensure current selected node is always visible
  useScrollToSelectedTreeNode(hub);

  const navTitleControl = useCallback(
    data => (
      <HubNodeTitle
        name={data.name}
        showAdd={spaceCan("create_hub")}
        onAddClick={() => addNewHubToTree(history, treeManager, hub.space_id, data.atomId)}
        onDotsClick={(e, ref) => {
          setHubContextMenuHubId(data.atomId);
          setHubContextMenuReferenceElement(ref.current);
          hubContextMenuElement.focus();
          e.preventDefault();
          e.stopPropagation();
        }}
      />
    ),
    [
      history,
      hub,
      treeManager,
      hubContextMenuElement,
      setHubContextMenuHubId,
      setHubContextMenuReferenceElement,
      spaceCan
    ]
  );

  if (!treeManager || !hub) return null;

  treeManager.setNavTitleControl(navTitleControl);
  const tree = treeManager.sharedNav;

  const navSelectedKeys = hub ? [tree.getNodeIdForAtomId(hub.hub_id)] : [];

  return (
    <div>
      <Tree
        prefixCls="hub-tree"
        treeData={navTreeData}
        selectable={true}
        selectedKeys={navSelectedKeys}
        draggable
        onDragEnter={({ node }) => treeManager.setNodeIsExpanded(node.key, true)}
        onDrop={createTreeDropHandler(treeManager, tree)}
        onSelect={(selectedKeys, { node: { url } }) => navigateToHubUrl(history, url)}
        expandedKeys={treeManager.sharedExpandedNodeIds()}
        onExpand={(expandedKeys, { expanded, node: { key } }) => treeManager.setNodeIsExpanded(key, expanded)}
        height={100}
      />
      <HubTreeContextMenu
        setPopperElement={setHubContextMenuElement}
        styles={hubContextMenuStyles}
        attributes={hubContextMenuAttributes}
        hubId={hubContextMenuHubId}
        spaceCan={spaceCan}
        hubCan={hubCan}
        onRenameClick={hubId => {
          setHubRenamePopupHubId(hubId);
          hubRenamePopupElement.querySelector("input").focus();
        }}
        onTrashClick={hubId => {
          if (!tree.getNodeIdForAtomId(hubId)) return;

          // If this hub or any of its parents were deleted, go home.
          if (isAtomInSubtree(tree, hubId, hub.hub_id)) {
            const homeHub = homeHubForSpaceId(hub.space_id, memberships);
            navigateToHubUrl(history, homeHub.url);
          }

          // All trashable children are trashed too.
          const trashableChildrenHubIds = findChildrenAtomsInTreeData(navTreeData, hubId).filter(hubId =>
            hubCan("trash_hub", hubId)
          );

          window.APP.spaceChannel.trashHubs([...trashableChildrenHubIds, hubId]);
        }}
      />
      <HubRenamePopup
        setPopperElement={setHubRenamePopupElement}
        styles={hubRenamePopupStyles}
        attributes={hubRenamePopupAttributes}
        hubId={hubRenamePopupHubId}
        hubMetadata={tree.atomMetadata}
        onNameChanged={name => onHubNameChanged(hubRenamePopupHubId, name)}
      />
    </div>
  );
}

HubTree.propTypes = {
  treeManager: PropTypes.object,
  history: PropTypes.object,
  hub: PropTypes.object,
  spaceCan: PropTypes.func,
  hubCan: PropTypes.func,
  spaceChannel: PropTypes.object,
  memberships: PropTypes.array,
  onHubNameChanged: PropTypes.func
};

export default HubTree;
