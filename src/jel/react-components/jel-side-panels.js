import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { WrappedIntlProvider } from "../../hubs/react-components/wrapped-intl-provider";
import { FormattedMessage } from "react-intl";
import { getMessages } from "../../hubs/utils/i18n";
import PropTypes from "prop-types";
import styled from "styled-components";
import { createHub } from "../../hubs/utils/phoenix-utils";
import "../assets/stylesheets/hub-tree.scss";
import "../assets/stylesheets/space-tree.scss";
import sharedStyles from "../assets/stylesheets/shared.scss";
import Tree from "rc-tree";
import { pushHistoryPath, replaceHistoryPath } from "../../hubs/utils/history";
import PanelSectionHeader from "./panel-section-header";
import ActionButton from "./action-button";
import SpaceNodeIcon from "./space-node-icon";
import scrollIntoView from "scroll-into-view-if-needed";
import addIcon from "../assets/images/icons/add.svgi";
import trashIcon from "../assets/images/icons/trash.svgi";
import HubNodeTitle from "./hub-node-title";
import { PopupMenu, PopupMenuItem } from "./popup-menu";
import { usePopper } from "react-popper";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";

let popupRoot = null;

waitForDOMContentLoaded().then(() => {
  popupRoot = document.getElementById("jel-popup-root");
});

const JelWrap = styled.div`
  color: var(--panel-text-color);
  background-color: var(--panel-background-color);
  font-size: var(--panel-text-size);
  font-weight: var(--panel-text-weight);
  position: absolute;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
  z-index: 2;
  pointer-events: none;
  display: flex;
  justify-content: space-between;
  overflow: hidden;
  user-select: none;
`;

const Nav = styled.div`
  pointer-events: auto;
  width: var(--nav-width);
  display: flex;
  flex-direction: column;
  box-shadow: 0px 0px 4px;
`;

const Presence = styled.div`
  pointer-events: auto;
  width: var(--presence-width);
  box-shadow: 0px 0px 4px;
  display: flex;
  flex-direction: row;
`;

const PresenceContent = styled.div`
  flex: 1 1 auto;
`;

const NavHead = styled.div`
  flex: 0 0 auto;
  margin-bottom: 32px;
`;

const SpaceBanner = styled.div`
  font-size: var(--panel-banner-text-size);
  font-weight: var(--panel-banner-text-weight);
  color: var(--panel-banner-text-color);
  margin: 32px 0px 0px 32px;
`;

const NavFoot = styled.div`
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  margin-top: 16px;
`;

const NavSpill = styled.div`
  overflow-x: hidden;
  overflow-y: auto;

  scrollbar-color: transparent transparent;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
    visibility: hidden;
  }

  &::-webkit-scrollbar-thumb {
    background-clip: padding-box;
    border: 2px solid transparent;
    border-radius: 4px;
    background-color: transparent;
    transition: background-color 0.25s;
    min-height: 40px;
  }

  &::-webkit-scrollbar-corner {
    background-color: transparent;
  }

  &::-webkit-scrollbar-track {
    border-color: transparent;
    background-color: transparent;
    border: 2px solid transparent;
    visibility: hidden;
  }

  &:hover {
    scrollbar-color: var(--scroll-thumb-color) transparent;

    &::-webkit-scrollbar-thumb {
      background-color: var(--scroll-thumb-color);
      transition: background-color 0.25s;
    }
  }
`;

const SpaceTreeSpill = styled.div`
  overflow-x: hidden;
  overflow-y: scroll;

  scrollbar-color: transparent transparent;
  scrollbar-width: thin;
  background-color: var(--secondary-panel-background-color);
  width: fit-content;
  height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: center;

  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
    visibility: hidden;
  }

  &::-webkit-scrollbar-thumb {
    background-clip: padding-box;
    border: 2px solid transparent;
    border-radius: 4px;
    background-color: transparent;
    transition: background-color 0.25s;
    min-height: 40px;
  }

  &::-webkit-scrollbar-corner {
    background-color: transparent;
  }

  &::-webkit-scrollbar-track {
    border-color: transparent;
    background-color: transparent;
    border: 2px solid transparent;
    visibility: hidden;
  }

  &:hover {
    scrollbar-color: var(--secondary-scroll-thumb-color) transparent;

    &::-webkit-scrollbar-thumb {
      background-color: var(--secondary-scroll-thumb-color);
      transition: background-color 0.25s;
    }
  }
`;

function useTreeData(tree, setTreeData) {
  useEffect(
    () => {
      if (!tree) return () => {};

      const handleTreeData = () => setTreeData(tree.filteredTreeData);

      // Tree itself changed because effect was fired
      handleTreeData();

      // Tree internal state changed
      tree.addEventListener("filtered_treedata_updated", handleTreeData);
      return () => tree.removeEventListener("filtered_treedata_updated", handleTreeData);
    },
    [tree, setTreeData]
  );
}

function useExpandableTree(treeManager) {
  useEffect(
    () => {
      if (!treeManager) return () => {};

      const handleExpandedNodeIdsChanged = () => {
        treeManager.sharedNav.rebuildFilteredTreeData();
      };

      treeManager.addEventListener("expanded_nodes_updated", handleExpandedNodeIdsChanged);

      () => treeManager.removeEventListener("expanded_nodes_updated", handleExpandedNodeIdsChanged);
    },
    [treeManager]
  );
}

function useScrollToSelectedTreeNode(atom) {
  useEffect(
    () => {
      const node = document.querySelector(".hub-tree-treenode-selected");
      if (node) {
        scrollIntoView(node, { scrollMode: "if-needed", inline: "start" });

        // Undo any horizontal scrolling, we don't want nav to horizontal scroll
        let e = node;

        while (e) {
          e.scrollLeft = 0;
          e = e.parentElement;
        }
      }
      return () => {};
    },
    [atom]
  );
}

function useHubTreeTitleControls(
  treeManager,
  hubContextMenuElement,
  setHubContextMenuHubId,
  setHubContextMenuReferenceElement
) {
  useEffect(
    () => {
      if (!treeManager) return;
      treeManager.setNavTitleControl(data => {
        return (
          <HubNodeTitle
            name={data.name}
            onDotsClick={(e, ref) => {
              setHubContextMenuHubId(data.atomId);
              setHubContextMenuReferenceElement(ref.current);
              hubContextMenuElement.querySelector("button").focus();

              e.preventDefault();
              e.stopPropagation();
            }}
          />
        );
      });
      return () => {};
    },
    [treeManager, hubContextMenuElement, setHubContextMenuReferenceElement, setHubContextMenuHubId]
  );
}

const PopperPopupMenu = function({ styles, attributes, setPopperElement, hubId, spaceCan, hubCan, onTrash }) {
  if (!popupRoot) return null;

  const popupMenu = (
    <div
      tabIndex={100} // Ensures can be focused
      className={sharedStyles.showWhenPopped}
      ref={setPopperElement}
      style={styles.popper}
      {...attributes.popper}
    >
      <PopupMenu>
        {spaceCan("edit_nav") && hubId && hubCan("trash_hub", hubId) ? (
          <PopupMenuItem
            onClick={e => {
              onTrash(hubId);
              // Blur button so menu hides
              document.activeElement.blur();
              e.preventDefault();
              e.stopPropagation();
            }}
            iconSrc={trashIcon}
          >
            <FormattedMessage id="hub-context.move-to-trash" />
          </PopupMenuItem>
        ) : (
          <PopupMenuItem>
            <div>No Actions</div>
          </PopupMenuItem>
        )}
      </PopupMenu>
    </div>
  );

  return ReactDOM.createPortal(popupMenu, popupRoot);
};

const createTreeDropHandler = treeManager => (tree, allowNesting = true) => ({ dragNode, node, dropPosition }) => {
  const dropPos = node.pos.split("-");
  const dropOffset = dropPosition - Number(dropPos[dropPos.length - 1]);
  switch (dropOffset) {
    case -1:
      treeManager[tree].moveAbove(dragNode.key, node.key);
      break;
    case 1:
      treeManager[tree].moveBelow(dragNode.key, node.key);
      break;
    case 0:
      if (allowNesting) {
        treeManager[tree].moveInto(dragNode.key, node.key);
        treeManager.setNodeExpanded(node.key, true);
      }
      break;
  }
};

function navigateToHubUrl(history, url, replace = false) {
  const search = history.location.search;
  const path = new URL(url).pathname;
  (replace ? replaceHistoryPath : pushHistoryPath)(history, path, search);
}

function membershipForSpaceId(spaceId, memberships) {
  if (!memberships) return null;

  for (let i = 0; i < memberships.length; i++) {
    const membership = memberships[i];

    if (membership.space.space_id === spaceId) {
      return membership;
    }
  }

  return null;
}

function homeHubForSpaceId(spaceId, memberships) {
  const m = membershipForSpaceId(spaceId, memberships);
  return m ? m.home_hub : null;
}

function spaceForSpaceId(spaceId, memberships) {
  const m = membershipForSpaceId(spaceId, memberships);
  return m ? m.space : null;
}

function SpaceTree({ treeManager, history, space, memberships }) {
  const [spaceTreeData, setSpaceTreeData] = useState([]);
  useTreeData(treeManager && treeManager.privateSpace, setSpaceTreeData);
  useScrollToSelectedTreeNode(space);

  const spaceSelectedKeys = space && treeManager ? [treeManager.privateSpace.getNodeIdForAtomId(space.space_id)] : [];

  return (
    <div>
      <Tree
        prefixCls="space-tree"
        treeData={spaceTreeData}
        icon={spaceTreeData => <SpaceNodeIcon spaceTreeData={spaceTreeData} />}
        selectable={true}
        selectedKeys={spaceSelectedKeys}
        draggable
        onDrop={createTreeDropHandler(treeManager)("privateSpace", false)}
        onSelect={(selectedKeys, { node: { atomId } }) =>
          navigateToHubUrl(history, homeHubForSpaceId(atomId, memberships).url)
        }
      />
    </div>
  );
}

function HubTree({ treeManager, history, hub, spaceCan, hubCan, memberships }) {
  const [navTreeData, setNavTreeData] = useState([]);
  const [hubContextMenuHubId, setHubContextMenuHubId] = useState(null);
  const [hubContextMenuReferenceElement, setHubContextMenuReferenceElement] = useState(null);
  const [hubContextMenuElement, setHubContextMenuElement] = useState(null);

  const { styles: hubContextMenuStyles, attributes: hubContextMenuAttributes } = usePopper(
    hubContextMenuReferenceElement,
    hubContextMenuElement,
    {
      placement: "bottom-start"
    }
  );
  //const [trashTreeData, setTrashTreeData] = useState([]);

  useTreeData(treeManager && treeManager.sharedNav, setNavTreeData);
  //useTreeData(treeManager && treeManager.sharedTrash, setTrashTreeData);
  useExpandableTree(treeManager);

  // Ensure current selected node is always visible
  useScrollToSelectedTreeNode(hub);

  useHubTreeTitleControls(
    treeManager,
    hubContextMenuElement,
    setHubContextMenuHubId,
    setHubContextMenuReferenceElement
  );

  if (!treeManager || !hub) return null;

  const navSelectedKeys = hub ? [treeManager.sharedNav.getNodeIdForAtomId(hub.hub_id)] : [];

  return (
    <div>
      <Tree
        prefixCls="hub-tree"
        treeData={navTreeData}
        selectable={true}
        selectedKeys={navSelectedKeys}
        draggable
        onDragEnter={({ node }) => treeManager.setNodeExpanded(node.key, true)}
        onDrop={createTreeDropHandler(treeManager)("sharedNav")}
        onSelect={(selectedKeys, { node: { url } }) => navigateToHubUrl(history, url)}
        expandedKeys={treeManager.sharedExpandedNodeIds()}
        onExpand={(expandedKeys, { expanded, node: { key } }) => treeManager.setNodeExpanded(key, expanded)}
      />
      <PopperPopupMenu
        setPopperElement={setHubContextMenuElement}
        styles={hubContextMenuStyles}
        attributes={hubContextMenuAttributes}
        hubId={hubContextMenuHubId}
        spaceCan={spaceCan}
        hubCan={hubCan}
        onTrash={hubId => {
          const tree = treeManager.sharedNav;
          if (!tree.getNodeIdForAtomId(hubId)) return;

          // If this hub or any of its parents were deleted, go home.
          let nodeId = tree.getNodeIdForAtomId(hub.hub_id);

          if (nodeId) {
            let removedSelfSubtree = false;

            do {
              if (tree.getAtomIdForNodeId(nodeId) === hubId) {
                removedSelfSubtree = true;
              }

              nodeId = tree.getParentNodeId(nodeId);
            } while (nodeId);

            if (removedSelfSubtree) {
              const homeHub = homeHubForSpaceId(hub.space_id, memberships);
              navigateToHubUrl(history, homeHub.url);
            }
          }

          window.APP.spaceChannel.trashHub(hubId);
        }}
      />
    </div>
  );
}

function JelSidePanels({
  treeManager,
  history,
  hub,
  hubCan = () => false,
  spaceCan = () => false,
  //onHubDestroyConfirmed,
  memberships,
  spaceId
}) {
  const messages = getMessages();

  const onCreateClick = async () => {
    const hub = await createHub(spaceId);
    treeManager.sharedNav.addToRoot(hub.hub_id);
    navigateToHubUrl(history, hub.url);
  };

  //const onRestoreClick = () => {
  //  const nodeId = treeManager.sharedTrash.getNodeIdForAtomId(hub.hub_id);
  //  if (!nodeId) return;

  //  treeManager.restoreFromTrash(nodeId);
  //};

  const homeHub = homeHubForSpaceId(spaceId, memberships);

  //const onDestroyClick = async () => {
  //  const hubId = hub.hub_id;
  //  const nodeId = treeManager.sharedTrash.getNodeIdForAtomId(hubId);
  //  if (!nodeId) return;

  //  const destroyed = await onHubDestroyConfirmed(hubId);
  //  if (destroyed) {
  //    treeManager.removeFromTrash(nodeId);
  //  }

  //  navigateToHubUrl(history, homeHub.url, true);
  //};

  // For now private tree is just home hub
  const privateSelectedKeys = hub && homeHub && hub.hub_id === homeHub.hub_id ? [hub.hub_id] : [];

  const privateTreeData = homeHub
    ? [
        {
          key: homeHub.hub_id,
          title: messages["nav.home-world"],
          url: homeHub.url,
          hubId: homeHub.hub_id,
          isLeaf: true
        }
      ]
    : [];

  const space = spaceForSpaceId(spaceId, memberships);

  return (
    <WrappedIntlProvider>
      <JelWrap>
        <Nav>
          <NavHead>
            <SpaceBanner>{space && space.name}</SpaceBanner>
          </NavHead>
          <NavSpill>
            <PanelSectionHeader>
              <FormattedMessage id="nav.private-worlds" />
            </PanelSectionHeader>
            <Tree
              prefixCls="hub-tree"
              treeData={privateTreeData}
              selectable={true}
              selectedKeys={privateSelectedKeys}
              onSelect={(selectedKeys, { node: { url } }) => navigateToHubUrl(history, url)}
            />
            <PanelSectionHeader>
              <FormattedMessage id="nav.shared-worlds" />
            </PanelSectionHeader>

            <HubTree
              treeManager={treeManager}
              hub={hub}
              history={history}
              spaceCan={spaceCan}
              hubCan={hubCan}
              memberships={memberships}
            />
          </NavSpill>
          <NavFoot>
            {spaceCan("create_hub") && (
              <ActionButton iconSrc={addIcon} onClick={onCreateClick} style={{ width: "80%" }}>
                <FormattedMessage id="nav.create-world" />
              </ActionButton>
            )}
          </NavFoot>
        </Nav>
        <Presence>
          <PresenceContent>Presence</PresenceContent>
          <SpaceTreeSpill>
            <SpaceTree treeManager={treeManager} space={space} history={history} memberships={memberships} />
          </SpaceTreeSpill>
        </Presence>
      </JelWrap>
    </WrappedIntlProvider>
  );
}

JelSidePanels.propTypes = {
  treeManager: PropTypes.object,
  history: PropTypes.object,
  hub: PropTypes.object,
  spaceCan: PropTypes.func,
  hubCan: PropTypes.func,
  orgPresences: PropTypes.object,
  hubPresences: PropTypes.object,
  sessionId: PropTypes.string,
  spaceId: PropTypes.string,
  memberships: PropTypes.array,
  onHubDestroyConfirmed: PropTypes.func
};

HubTree.propTypes = {
  treeManager: PropTypes.object,
  history: PropTypes.object,
  hub: PropTypes.object,
  spaceCan: PropTypes.func,
  hubCan: PropTypes.func,
  memberships: PropTypes.array
};

SpaceTree.propTypes = {
  treeManager: PropTypes.object,
  history: PropTypes.object,
  space: PropTypes.object,
  memberships: PropTypes.array
};

export default JelSidePanels;
