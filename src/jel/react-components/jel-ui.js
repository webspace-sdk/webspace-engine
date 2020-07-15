import React, { useState, useEffect, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import styled, { ThemeProvider } from "styled-components";
import { createHub } from "../../utils/phoenix-utils";
import "../assets/stylesheets/nav-tree.scss";
import Tree from "rc-tree";
import { pushHistoryPath } from "../../utils/history";

const dark = {
  text: "white",
  panelBg: "black"
};

/*const light = {
  text: "black",
  panelBg: "white"
};*/

const JelWrap = styled.div`
  color: ${p => p.theme.text};
  position: absolute;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
`;

const Nav = styled.div``;

const TestButton = styled.button``;

function useNavResize(navExpanded) {
  const scene = useMemo(() => document.querySelector("a-scene"));

  const resizeTimeout = useRef();
  const resizeInterval = useRef();

  useEffect(
    () => {
      if (resizeTimeout.current) {
        clearInterval(resizeInterval.current);
        clearTimeout(resizeTimeout.current);
      }

      resizeTimeout.current = setTimeout(() => {
        clearInterval(resizeInterval.current);
        resizeTimeout.current = null;
      }, 800);

      // Don't run during RAF to reduce chop.
      resizeInterval.current = setInterval(() => scene.resize(), 100);
      const { body } = document;

      if (navExpanded) {
        const wasHidden = body.classList.contains("nav-hidden");
        body.classList.remove("nav-hidden");
        body.offsetHeight; // relayout
        if (wasHidden) {
          body.classList.add("nav-expanded");
        }
      } else {
        body.classList.remove("nav-expanded");
        body.offsetHeight; // relayout
        body.classList.add("nav-hidden");
      }
    },
    [navExpanded]
  );
}

function useTreeData(tree, setTreeData) {
  useEffect(
    () => {
      const handleTreeData = () => setTreeData(tree.expandedTreeData);

      tree.addEventListener("expanded_treedata_updated", handleTreeData);
      tree.rebuildExpandedTreeData();

      () => tree.removeEventListener("expanded_treedata_updated", handleTreeData);
    },
    [tree]
  );
}

function useExpandableTree(treeManager) {
  useEffect(
    () => {
      const handleExpandedNodeIdsChanged = () => {
        treeManager.nav.rebuildExpandedTreeData();
        treeManager.trash.rebuildExpandedTreeData();
      };

      treeManager.addEventListener("expanded_nodes_updated", handleExpandedNodeIdsChanged);

      () => treeManager.removeEventListener("expanded_nodes_updated", handleExpandedNodeIdsChanged);
    },
    [treeManager]
  );
}

function HubTree({ treeManager, history, hub }) {
  if (!treeManager || !hub) return null;

  const [navTreeData, setNavTreeData] = useState([]);
  const [trashTreeData, setTrashTreeData] = useState([]);

  useTreeData(treeManager.nav, setNavTreeData);
  useTreeData(treeManager.trash, setTrashTreeData);
  useExpandableTree(treeManager);

  const onTreeDragEnter = () => {
    // TODO store + expand
  };

  const onTreeDrop = tree => ({ dragNode, node, dropPosition }) => {
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
        treeManager[tree].moveInto(dragNode.key, node.key);
        break;
    }
  };

  const selectedKeys = hub ? [treeManager.nav.getNodeIdForHubId(hub.hub_id)] : [];

  return (
    <div>
      <Tree
        treeData={navTreeData}
        selectable={true}
        selectedKeys={selectedKeys}
        draggable
        onDragEnter={onTreeDragEnter}
        onDrop={onTreeDrop("nav")}
        onSelect={(selectedKeys, { node: { url } }) => {
          const search = history.location.search;
          const path = new URL(url).pathname;
          pushHistoryPath(history, path, search);
        }}
        expandedKeys={treeManager.expandedNodeIds()}
        onExpand={(expandedKeys, { expanded, node: { key } }) => treeManager.setNodeExpanded(key, expanded)}
      />
      <Tree
        treeData={trashTreeData}
        selectable={true}
        selectedKeys={selectedKeys}
        draggable
        expandedKeys={treeManager.expandedNodeIds()}
        onDragEnter={onTreeDragEnter}
        onDrop={onTreeDrop}
        onExpand={(expandedKeys, { expanded, node: { key } }) => treeManager.setNodeExpanded(key, expanded)}
      />
    </div>
  );
}

function JelUI({ navExpanded = true, treeManager, history, hub }) {
  const onCreateClick = async () => {
    const hub = await createHub();
    treeManager.nav.addToRoot(hub.hub_id);
  };

  useNavResize(navExpanded);

  return (
    <ThemeProvider theme={dark}>
      <JelWrap>
        <Nav>
          <TestButton onClick={onCreateClick}>Create World</TestButton>
          <HubTree treeManager={treeManager} hub={hub} history={history} />
        </Nav>
      </JelWrap>
    </ThemeProvider>
  );
}

JelUI.propTypes = {
  navExpanded: PropTypes.bool,
  treeManager: PropTypes.object,
  history: PropTypes.object,
  hub: PropTypes.object,
  orgPresences: PropTypes.object,
  hubPresences: PropTypes.object,
  sessionId: PropTypes.string
};

HubTree.propTypes = {
  treeManager: PropTypes.object,
  history: PropTypes.object,
  hub: PropTypes.object
};

export default JelUI;
