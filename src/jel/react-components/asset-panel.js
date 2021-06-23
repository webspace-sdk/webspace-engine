import React, { useState, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import Tree from "rc-tree";
import PanelSectionHeader from "./panel-section-header";

const AssetPanelElement = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  height: 100%;
  width: 100%;
  padding: 8px 12px;
  user-select: none;
`;

const AssetPanelTop = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
`;

const SearchBar = styled.div`
  display: flex;
  margin: 0px 16px 16px 16px;
`;

const AssetPanelContent = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  overflow: hidden;
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

const PreviewWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  width: 250px;
  height: 100%;
  margin-top: 8px;
`;

const PreviewImage = styled.div`
  width: 192px;
  height: 192px;
  margin: 4px 4px;
  border-radius: 4px;
  background-size: 960px 960px;
`;

const PreviewName = styled.div`
  margin: 8px 4px;
  color: var(--panel-small-banner-text-color);
  font-weight: var(--panel-small-banner-text-weight);
  font-size: var(--panel-small-banner-text-size);
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  flex-grow: 0;
  width: 100%;
  text-align: center;
  min-height: calc(var(--panel-small-banner-text-size) + 4px);
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
  const [previewVoxId, setPreviewVoxId] = useState(null);
  const [previewSheetX, setPreviewSheetX] = useState(0);
  const [previewSheetY, setPreviewSheetY] = useState(0);
  const tilesRef = useRef();

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

  const onMouseLeave = useCallback(
    () => {
      setPreviewVoxId(null);
    },
    [setPreviewVoxId]
  );

  const onMouseMove = useCallback(
    e => {
      if (tilesRef.current === null) return;
      const tile = tilesRef.current.querySelector(`[data-vox-id='${previewVoxId}']`);
      if (!tile) return;
      const tileRect = tile.getBoundingClientRect();
      const px = (e.clientX - tileRect.left) / (tileRect.right - tileRect.left);
      const frame = Math.floor(px / (1.0 / 24.0)); // frame 0 - 24
      setPreviewSheetX(frame % 5);
      setPreviewSheetY(Math.floor(frame / 5));
    },
    [tilesRef, previewVoxId]
  );

  const previewVoxMeta = previewVoxId ? voxMetas.find(({ voxId }) => voxId === previewVoxId) : {};

  const voxMetaToTile = useCallback(
    ({ voxId, thumb_url }) => {
      return (
        <Tile
          style={{ backgroundImage: `url("${thumb_url}")`, backgroundSize: "92px 92px" }}
          data-vox-id={voxId}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onMouseEnter={() => {
            setPreviewVoxId(voxId);
          }}
          onMouseLeave={onMouseLeave}
          onMouseMove={onMouseMove}
          key={voxId}
          draggable={true}
        />
      );
    },
    [onDragStart, onDragEnd, onMouseLeave, onMouseMove]
  );

  if (!voxTree) return <div />;

  return (
    <AssetPanelElement>
      <AssetPanelTop>
        <PanelSectionHeader>Objects</PanelSectionHeader>
        <SearchBar />
      </AssetPanelTop>
      <AssetPanelContent>
        <TreeWrap style={!previewVoxId ? null : { display: "none" }}>
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
        <PreviewWrap style={previewVoxId ? null : { display: "none" }}>
          <PreviewImage
            style={{
              backgroundImage: `url(${previewVoxMeta.preview_url})`,
              backgroundPosition: `left ${-previewSheetX * 192}px top ${-previewSheetY * 192}px`
            }}
          />
          <PreviewName>{previewVoxMeta.name}</PreviewName>
        </PreviewWrap>
        <Tiles ref={tilesRef}>{voxMetas.map(voxMetaToTile)}</Tiles>
      </AssetPanelContent>
    </AssetPanelElement>
  );
}

AssetPanel.propTypes = {
  voxTree: PropTypes.object
};
