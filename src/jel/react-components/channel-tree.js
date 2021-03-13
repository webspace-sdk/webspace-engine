import PropTypes from "prop-types";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { FormattedMessage } from "react-intl";
import Tree from "rc-tree";
import styled from "styled-components";
import { useScrollToSelectedTreeNode } from "../utils/tree-utils";
import ChannelNodeTitle from "./channel-node-title";
import { navigateToHubUrl } from "../utils/jel-url-utils";
import "../../assets/jel/stylesheets/atom-tree.scss";

function ChannelTree({
  channelMetadata,
  history,
  spaceId,
  spaceCan,
  setChannelRenameReferenceElement,
  showChannelContextMenuPopup
}) {
  const [treeData, setTreeData] = useState([]);

  const channelTitleControl = useCallback(
    data => (
      <ChannelNodeTitle
        channelId={data.atomId}
        channelMetadata={channelMetadata}
        showDots={true}
        onDotsClick={(e, ref) => {
          e.stopPropagation(); // Otherwise this will perform a tree node click event
          showChannelContextMenuPopup(data.atomId, ref, "bottom-start", [0, 0], {
            hideRename: false
          });

          setChannelRenameReferenceElement(ref);
        }}
      />
    ),
    [channelMetadata, showChannelContextMenuPopup, setChannelRenameReferenceElement]
  );

  // Ensure current selected node is always visible
  //
  // TODO needs to handle channel changes
  // useScrollToSelectedTreeNode(navTreeData, hub);
  //
  useEffect(
    () => {
      const { matrix } = window.APP;

      if (!matrix) return () => {};

      const handleTreeData = () => setTreeData(matrix.getChannelTreeDataForSpaceId(spaceId, channelTitleControl));

      // Tree itself changed because effect was fired
      setTreeData(matrix.getChannelTreeDataForSpaceId(spaceId, channelTitleControl));

      // Tree internal state changed
      matrix.addEventListener("current_space_channels_changed", handleTreeData);
      return () => matrix.removeEventListener("current_space_channels_changed", handleTreeData);
    },
    [spaceId, setTreeData, channelTitleControl]
  );

  //const onDrop = useTreeDropHandler(treeManager, tree);
  const onSelect = useCallback(
    (selectedKeys, { node: { atomId } }) => {
      const metadata = channelMetadata.getMetadata(atomId);

      if (metadata) {
        navigateToHubUrl(history, metadata.url);
      }
    },
    [history, channelMetadata]
  );

  const navSelectedKeys = useMemo(() => []);

  const onDrop = useCallback(({ dragNode, node, dropPosition }) => {
    const dropPos = node.pos.split("-");
    const dropOffset = dropPosition - Number(dropPos[dropPos.length - 1]);
    const { matrix } = window.APP;

    switch (dropOffset) {
      case -1:
        matrix.moveChannelAbove(dragNode.key, node.key);
        break;
      case 1:
        matrix.moveChannelBelow(dragNode.key, node.key);
        break;
    }
  }, []);

  return (
    <div>
      <Tree
        prefixCls="atom-tree"
        treeData={treeData}
        selectable={true}
        selectedKeys={navSelectedKeys}
        draggable={spaceCan("create_channel")}
        allowDrop={false}
        onDrop={onDrop}
        onSelect={onSelect}
      />
    </div>
  );
}

ChannelTree.propTypes = {
  channelMetadata: PropTypes.object,
  history: PropTypes.object,
  channelCan: PropTypes.func,
  spaceCan: PropTypes.func,
  spaceId: PropTypes.string,
  setChannelRenameReferenceElement: PropTypes.func,
  showChannelContextMenuPopup: PropTypes.func
};

export default ChannelTree;
