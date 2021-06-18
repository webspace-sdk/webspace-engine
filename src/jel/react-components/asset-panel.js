import React, { useState, useCallback } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import Tree from "rc-tree";

const AssetPanelElement = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  height: 100%;
  width: 100%;
  padding: 8px 12px;
`;

const TreeWrap = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: center;
  width: 250px;
  height: 100%;

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

const Tiles = styled.div`
  display: flex;
  height: calc(100% - 16px);
  flex: 1;
  display: flex;
  margin: 8px;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
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

const Tile = styled.div`
  margin: 4px 4px;
  position: relative;
  width: 92px;
  height: 92px;
  background-color: red;
  border-radius: 4px;
  background-color: var(--panel-background-color);
  cursor: pointer;
`;

export default function AssetPanel(props) {
  const { voxTree } = props;
  const { voxSystem } = SYSTEMS;
  const voxTreeData = voxTree && voxTree.filteredTreeData;
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState([]);
  const [voxMetas, setVoxMetas] = useState([]);

  const onSelect = useCallback(
    (selectedKeys, { node: { key } }) => {
      const voxMetas = voxTree.getVoxMetasForTreeKey(key);
      if (voxMetas.length > 0) {
        setSelectedKeys([key]);
        setVoxMetas(voxMetas);
      } else {
        if (expandedKeys.includes(key)) {
          setExpandedKeys(expandedKeys.filter(x => x !== key));
        } else {
          setExpandedKeys([...expandedKeys, key]);
        }
      }
    },
    [voxTree, expandedKeys, setExpandedKeys]
  );

  const onExpand = useCallback(
    (expandedKeys, { expanded, node: { key } }) => {
      if (expanded) {
        setExpandedKeys([...expandedKeys, key]);
      } else {
        setExpandedKeys(expandedKeys.filter(x => x !== key));
      }
    },
    [setExpandedKeys]
  );

  const onDragStart = useCallback(
    e => {
      e.dataTransfer.dropEffect = "move";
      const voxId = e.target.getAttribute("data-vox-id");
      const canvas = document.createElement("canvas");
      e.dataTransfer.setData(`jel/vox`, voxId);
      canvas.width = canvas.height = 1;
      e.dataTransfer.setDragImage(canvas, 0, 0);
      voxSystem.assetPanelDraggingVoxId = voxId;
    },
    [voxSystem]
  );

  const onDragEnd = useCallback(
    () => {
      voxSystem.assetPanelDraggingVoxId = null;
    },
    [voxSystem]
  );

  const voxMetaToTile = useCallback(
    ({ voxId }) => {
      return <Tile data-vox-id={voxId} onDragStart={onDragStart} onDragEnd={onDragEnd} key={voxId} draggable={true} />;
    },
    [onDragStart, onDragEnd]
  );

  if (!voxTree) return <div />;

  return (
    <AssetPanelElement>
      <TreeWrap>
        <Tree
          prefixCls="atom-tree"
          treeData={voxTreeData}
          selectable={true}
          selectedKeys={selectedKeys}
          draggable={false}
          onSelect={onSelect}
          expandedKeys={expandedKeys}
          onExpand={onExpand}
        />
      </TreeWrap>
      <Tiles>{voxMetas.map(voxMetaToTile)}</Tiles>
    </AssetPanelElement>
  );
}

AssetPanel.propTypes = {
  voxTree: PropTypes.object
};
