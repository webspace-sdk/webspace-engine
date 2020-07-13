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

function useNavSyncTreeData(navSync, setTreeData) {
  useEffect(
    () => {
      const handleTreeData = () => setTreeData(navSync.treeData);

      navSync.addEventListener("treedata_updated", handleTreeData);
      navSync.buildAndEmitTree();

      () => navSync.removeEventListener("treedata_updated", handleTreeData);
    },
    [navSync]
  );
}

function JelUI({ navExpanded = true, navSync }) {
  const onCreateClick = async () => {
    const hub = await createHub();
    navSync.addToRoot(hub.hub_id);
  };

  const [treeData, setTreeData] = useState([]);

  useNavResize(navExpanded);
  useNavSyncTreeData(navSync, setTreeData);

  const onTreeDragEnter = () => {
    // TODO store + expand
  };

  const onTreeDrop = ({ dragNode, node, dropPosition }) => {
    const dropPos = node.pos.split("-");
    const dropOffset = dropPosition - Number(dropPos[dropPos.length - 1]);
    switch (dropOffset) {
      case -1:
        navSync.moveAbove(dragNode.key, node.key);
        break;
      case 1:
        navSync.moveBelow(dragNode.key, node.key);
        break;
      case 0:
        navSync.moveWithin(dragNode.key, node.key);
        break;
    }
  };

  return (
    <ThemeProvider theme={dark}>
      <JelWrap>
        <Nav>
          <Tree treeData={treeData} selectable={true} draggable onDragEnter={onTreeDragEnter} onDrop={onTreeDrop} />
          <TestButton onClick={onCreateClick}>Create Orb</TestButton>
        </Nav>
      </JelWrap>
    </ThemeProvider>
  );
}

JelUI.propTypes = {
  navExpanded: PropTypes.bool,
  navSync: PropTypes.object
};

export default JelUI;
