import React, { useState, useCallback, useRef, useEffect } from "react";
import { FormattedMessage } from "react-intl";
import PropTypes from "prop-types";
import styled from "styled-components";
import Tree from "rc-tree";
import PanelSectionHeader from "./panel-section-header";
import SegmentControl from "./segment-control";
import scenesOnIcon from "../assets/images/icons/scenes-on.svgi";
import scenesOffIcon from "../assets/images/icons/scenes-off.svgi";
import objectsOnIcon from "../assets/images/icons/builder-on.svgi";
import objectsOffIcon from "../assets/images/icons/builder-off.svgi";
import { getMessages } from "../utils/i18n";

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
  margin-top: 2px;
`;

const AssetPanelHeaderWrap = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: flex-start;
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
  height: 100%;
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
  height: 100%;
  flex: 1;
  flex-direction: row;
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  align-content: flex-start;
  flex-wrap: wrap;
  flex-gap: 0;
  margin: 8px;

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
  position: relative;
  margin: 4px 4px;
  width: 92px;
  height: 92px;
  border-radius: 4px;
  background-color: var(--panel-background-color);
  cursor: pointer;

  &:hover {
    opacity: 0.7;
  }

  &.active {
    opacity: 0.5;
  }
`;

export default function AssetPanel(props) {
  const { voxTree, sceneTree, expanded, scene } = props;
  const { voxSystem } = SYSTEMS;

  const [selectedKeys, setSelectedKeys] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState([]);
  const [showObjects, setShowObjects] = useState(true);
  const [metas, setMetas] = useState([]);
  const [previewId, setPreviewId] = useState(null);
  const [previewSheetX, setPreviewSheetX] = useState(0);
  const [previewSheetY, setPreviewSheetY] = useState(0);
  const tilesRef = useRef();

  const tree = showObjects ? voxTree : sceneTree;
  const treeData = tree && tree.treeData;

  useEffect(
    () => {
      if (!treeData) return;

      const collection = treeData[0];
      const expandedKeys = [];
      const selectedKeys = [];

      if (collection) {
        if (collection.isLeaf) {
          selectedKeys.push(collection.key);
        } else {
          expandedKeys.push(collection.key);

          const category = collection.children[0];

          if (category) {
            selectedKeys.push(category.key);
          }
        }
      }

      setExpandedKeys(expandedKeys);
      setSelectedKeys(selectedKeys);

      const selectedKey = selectedKeys[0];

      if (selectedKey) {
        const newMetas = tree.getMetasForTreeKey(selectedKey);
        setMetas(newMetas);
      }
    },
    [treeData, setMetas, tree]
  );

  // Show scenes when creating a new world
  useEffect(
    () => {
      const handler = () => setShowObjects(false);

      if (scene) {
        scene.addEventListener("created_world", handler);
        return () => scene.removeEventListener("created_world", handler);
      }

      return null;
    },
    [scene, setShowObjects]
  );

  const onSelect = useCallback(
    (selectedKeys, { node: { key } }) => {
      const newMetas = tree.getMetasForTreeKey(key);
      if (newMetas.length > 0) {
        setSelectedKeys([key]);
        setMetas(newMetas);
      } else {
        if (expandedKeys.includes(key)) {
          setExpandedKeys(expandedKeys.filter(x => x !== key));
        } else {
          setExpandedKeys([...expandedKeys, key]);
        }
      }
    },
    [tree, expandedKeys, setExpandedKeys]
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
      const id = e.target.getAttribute("data-item-id");
      const canvas = document.createElement("canvas");
      e.dataTransfer.setData(`webspaces/vox`, id);
      canvas.width = canvas.height = 1;
      e.dataTransfer.setDragImage(canvas, 0, 0);
      e.target.classList.remove("active");
      voxSystem.assetPanelDraggingVoxId = id;
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
      setPreviewId(null);
    },
    [setPreviewId]
  );

  const onMouseMove = useCallback(
    e => {
      if (tilesRef.current === null) return;
      const tile = tilesRef.current.querySelector(`[data-item-id='${previewId}']`);
      if (!tile) return;
      const tileRect = tile.getBoundingClientRect();
      const px = (e.clientX - tileRect.left) / (tileRect.right - tileRect.left);
      const frame = Math.floor(px / (1.0 / 24.0)); // frame 0 - 24
      setPreviewSheetX(frame % 5);
      setPreviewSheetY(Math.floor(frame / 5));
    },
    [tilesRef, previewId]
  );

  const sourceToggleOnChange = useCallback(
    () => {
      setShowObjects(!showObjects);
      setPreviewId(null);
      setExpandedKeys([]);
      setSelectedKeys([]);
      setMetas([]);
    },
    [setShowObjects, showObjects]
  );

  const idKey = showObjects ? "vox_id" : "world_template_id";
  const previewMeta = previewId ? metas.find(entry => entry[idKey] === previewId) : {};

  const metaToTile = useCallback(
    ({ [idKey]: id, thumb_url }) => {
      if (!id) return null;

      return (
        <Tile
          style={{ backgroundImage: `url("${thumb_url}")`, backgroundSize: "92px 92px" }}
          data-item-id={id}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onMouseEnter={() => {
            setPreviewId(id);
          }}
          onMouseLeave={onMouseLeave}
          onMouseDown={() => {
            tilesRef.current.querySelector(`[data-item-id='${id}']`).classList.add("active");
          }}
          onMouseMove={showObjects ? onMouseMove : null}
          onClick={() => {
            if (showObjects) {
              SYSTEMS.voxSystem.spawnVoxInFrontOfPlayer(id);
            } else {
              scene.emit("action_switch_template", { worldTemplateId: id });
            }

            tilesRef.current.querySelector(`[data-item-id='${id}']`).classList.remove("active");
          }}
          key={id}
          draggable={showObjects ? true : false}
        />
      );
    },
    [onDragStart, onDragEnd, onMouseLeave, onMouseMove, idKey, showObjects, tilesRef, scene]
  );

  if (!tree) return <div />;

  if (expanded) {
    const messages = getMessages();

    return (
      <AssetPanelElement>
        <AssetPanelTop>
          <AssetPanelHeaderWrap>
            <PanelSectionHeader style={{ marginTop: "5px", cursor: "pointer" }}>
              <FormattedMessage id="asset-panel.title" />
            </PanelSectionHeader>
          </AssetPanelHeaderWrap>
          <SearchBar />
          <SegmentControl
            rows={1}
            cols={2}
            items={[
              {
                id: "asset-panel.objects",
                text: messages["asset-panel.objects"],
                iconSrc: objectsOnIcon,
                offIconSrc: objectsOffIcon
              },
              {
                id: "asset-panel.scenes",
                text: messages["asset-panel.scenes"],
                iconSrc: scenesOnIcon,
                offIconSrc: scenesOffIcon
              }
            ]}
            hideTips={true}
            selectedIndices={showObjects ? [0] : [1]}
            onChange={sourceToggleOnChange}
          />
        </AssetPanelTop>
        <AssetPanelContent>
          <TreeWrap style={!previewId ? null : { display: "none" }}>
            <Tree
              prefixCls="atom-tree"
              treeData={treeData}
              selectable={true}
              selectedKeys={selectedKeys}
              draggable={false}
              onSelect={onSelect}
              expandedKeys={expandedKeys}
              onExpand={onExpand}
            />
          </TreeWrap>
          <PreviewWrap style={previewId ? null : { display: "none" }}>
            <PreviewImage
              style={{
                backgroundImage: `url(${previewMeta.preview_url})`,
                backgroundSize: showObjects ? "960px 960px" : "256px 256px",
                backgroundPosition: showObjects ? `left ${-previewSheetX * 192}px top ${-previewSheetY * 192}px` : null
              }}
            />
            <PreviewName>{previewMeta.name}</PreviewName>
          </PreviewWrap>
          <Tiles ref={tilesRef}>{metas.map(metaToTile)}</Tiles>
        </AssetPanelContent>
      </AssetPanelElement>
    );
  } else {
    return (
      <AssetPanelElement>
        <AssetPanelTop>
          <AssetPanelHeaderWrap>
            <FormattedMessage id="asset-panel.title" />
          </AssetPanelHeaderWrap>
        </AssetPanelTop>
      </AssetPanelElement>
    );
  }
}

AssetPanel.propTypes = {
  voxTree: PropTypes.object,
  sceneTree: PropTypes.object,
  scene: PropTypes.object,
  expanded: PropTypes.bool
};
