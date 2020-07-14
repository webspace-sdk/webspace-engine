import React, { useState, useEffect, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import styled, { ThemeProvider } from "styled-components";
import { createHub } from "../../utils/phoenix-utils";
import "../assets/stylesheets/nav-tree.scss";
import Tree from "rc-tree";

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
      const handleTreeData = () => setTreeData(tree.treeData);

      tree.addEventListener("treedata_updated", handleTreeData);
      tree.rebuildTree();

      () => tree.removeEventListener("treedata_updated", handleTreeData);
    },
    [tree]
  );
}

function useExpandableTree(treeManager) {
  useEffect(
    () => {
      const handleExpandedNodeIdsChanged = () => {
        treeManager.nav.rebuildTree();
        treeManager.trash.rebuildTree();
      };

      treeManager.addEventListener("expanded_nodes_updated", handleExpandedNodeIdsChanged);

      () => treeManager.removeEventListener("expanded_nodes_updated", handleExpandedNodeIdsChanged);
    },
    [treeManager]
  );
}

function JelUI({ navExpanded = true, treeManager }) {
  let selectedNavNodeId;
  let selectedTrashNodeId;

  const onCreateClick = async () => {
    const hub = await createHub();
    treeManager.nav.addToRoot(hub.hub_id);
  };

  const onDeleteClick = async () => {
    if (!selectedNavNodeId) return;
    treeManager.moveToTrash(selectedNavNodeId);
  };

  const onRestoreClick = async () => {
    if (!selectedTrashNodeId) return;
    treeManager.restoreFromTrash(selectedTrashNodeId);
  };

  const onDestroyClick = async () => {
    if (!selectedTrashNodeId) return;
    treeManager.destroyFromTrash(selectedTrashNodeId);
  };

  const [navTreeData, setNavTreeData] = useState([]);
  const [trashTreeData, setTrashTreeData] = useState([]);

  useNavResize(navExpanded);
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
        treeManager[tree].moveWithin(dragNode.key, node.key);
        break;
    }
  };

  return (
    <ThemeProvider theme={dark}>
      <JelWrap>
        <Nav>
          <Tree
            treeData={navTreeData}
            selectable={true}
            draggable
            onDragEnter={onTreeDragEnter}
            onDrop={onTreeDrop("nav")}
            onSelect={(selectedKeys, { node: { key } }) => (selectedNavNodeId = key)}
            expandedKeys={treeManager.expandedNodeIds()}
            onExpand={(expandedKeys, { expanded, node: { key } }) => treeManager.setNodeExpanded(key, expanded)}
          />
          <TestButton onClick={onCreateClick}>Create World</TestButton>
          <TestButton onClick={onDeleteClick}>Delete World</TestButton>
          <Tree
            treeData={trashTreeData}
            selectable={true}
            draggable
            expandedKeys={treeManager.expandedNodeIds()}
            onDragEnter={onTreeDragEnter}
            onDrop={onTreeDrop}
            onSelect={(selectedKeys, { node: { key } }) => (selectedTrashNodeId = key)}
            onExpand={(expandedKeys, { expanded, node: { key } }) => treeManager.setNodeExpanded(key, expanded)}
          />
          <TestButton onClick={onRestoreClick}>Restore World</TestButton>
          <TestButton onClick={onDestroyClick}>Destroy World</TestButton>
        </Nav>
      </JelWrap>
    </ThemeProvider>
  );
}

JelUI.propTypes = {
  navExpanded: PropTypes.bool,
  treeManager: PropTypes.object
};

export default JelUI;
