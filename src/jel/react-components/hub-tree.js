import PropTypes from "prop-types";
import React, { useState, useCallback } from "react";
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
import HubNodeTitle from "./hub-node-title";
import HubRenamePopup from "./hub-rename-popup";
import HubContextMenu from "./hub-context-menu";
import { navigateToHubUrl } from "../utils/jel-url-utils";
import "../assets/stylesheets/hub-tree.scss";

function HubTree({ treeManager, history, hub, spaceCan, hubCan, memberships, onHubNameChanged }) {
  const [navTreeData, setNavTreeData] = useState([]);
  const [navTreeDataVersion, setNavTreeDataVersion] = useState(0);
  const [hubContextMenuHubId, setHubContextMenuHubId] = useState(null);
  const [hubContextMenuReferenceElement, setHubContextMenuReferenceElement] = useState(null);
  const [hubContextMenuElement, setHubContextMenuElement] = useState(null);
  const [hubRenamePopupHubId, setHubRenamePopupHubId] = useState(null);
  const [hubRenamePopupElement, setHubRenamePopupElement] = useState(null);
  const hubRenameRef = React.createRef();

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

  const tree = treeManager && treeManager.sharedNav;
  const atomMetadata = tree && tree.atomMetadata;

  useTreeData(tree, navTreeDataVersion, setNavTreeData, setNavTreeDataVersion);
  useExpandableTree(treeManager);

  // Ensure current selected node is always visible
  useScrollToSelectedTreeNode(navTreeData, hub);

  const navTitleControl = useCallback(
    data => (
      <HubNodeTitle
        hubId={data.atomId}
        showAdd={spaceCan("create_hub")}
        showDots={true}
        hubMetadata={atomMetadata}
        onAddClick={e => {
          e.stopPropagation(); // Otherwise this will perform a tree node click event
          addNewHubToTree(history, treeManager, hub.space_id, data.atomId);
        }}
        onDotsClick={(e, ref) => {
          e.stopPropagation(); // Otherwise this will perform a tree node click event
          setHubContextMenuHubId(data.atomId);
          setHubContextMenuReferenceElement(ref.current);
          hubContextMenuElement.focus();

          // HACK, once popper has positioned the context/rename popups, remove this ref
          // since otherwise popper will re-render everything when the tree is scrolled.
          setTimeout(() => setHubContextMenuReferenceElement(null), 0);
        }}
      />
    ),
    [
      history,
      hub,
      treeManager,
      atomMetadata,
      hubContextMenuElement,
      setHubContextMenuHubId,
      setHubContextMenuReferenceElement,
      spaceCan
    ]
  );

  if (!treeManager || !hub) return null;

  treeManager.setNavTitleControl(navTitleControl);

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
        onSelect={(selectedKeys, { node: { atomId } }) => {
          const metadata = tree.atomMetadata.getMetadata(atomId);

          if (metadata) {
            navigateToHubUrl(history, metadata.url);
          }
        }}
        expandedKeys={treeManager.sharedExpandedNodeIds()}
        onExpand={(expandedKeys, { expanded, node: { key } }) => treeManager.setNodeIsExpanded(key, expanded)}
      />
      <HubContextMenu
        setPopperElement={setHubContextMenuElement}
        styles={hubContextMenuStyles}
        attributes={hubContextMenuAttributes}
        hubId={hubContextMenuHubId}
        spaceCan={spaceCan}
        hubCan={hubCan}
        onRenameClick={hubId => {
          setHubRenamePopupHubId(hubId);
          hubRenameRef.current.focus();
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
        ref={hubRenameRef}
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
