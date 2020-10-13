import PropTypes from "prop-types";
import React, { useState, useEffect } from "react";
import styles from "../assets/stylesheets/hub-trash-tree.scss";
import classNames from "classnames";
import Tree from "rc-tree";
import styled from "styled-components";
import { useTreeData } from "../utils/tree-utils";
//import sharedStyles from "../assets/stylesheets/shared.scss";
import HubTrashNodeTitle from "./hub-trash-node-title";
//import { navigateToHubUrl } from "../utils/jel-url-utils";
import { FormattedMessage } from "react-intl";
import "../assets/stylesheets/hub-tree.scss";

const TrashWrap = styled.div``;

export function useHubTrashTreeTitleControls(
  treeManager,
  history,
  hub,
  spaceCan,
  hubContextMenuElement,
  setHubContextMenuHubId,
  setHubContextMenuReferenceElement
) {
  useEffect(
    () => {
      if (!treeManager) return;

      treeManager.setTrashNavTitleControl(data => {
        return (
          <HubTrashNodeTitle
            name={data.name}
            onRestoreClick={e => {
              e.preventDefault();
              console.log(data);
              console.log("restore clicked");
            }}
            onDestroyClick={e => {
              e.preventDefault();
              console.log(data);
              console.log("destroy clicked");
            }}
          />
        );
      });
      return () => {};
    },
    [
      treeManager,
      history,
      hub,
      spaceCan,
      hubContextMenuElement,
      setHubContextMenuReferenceElement,
      setHubContextMenuHubId
    ]
  );
}

function HubTrashTree({ treeManager, history, hub, spaceCan, hubCan, memberships }) {
  const [trashTreeData, setTrashTreeData] = useState([]);

  useTreeData(treeManager && treeManager.trashNav, setTrashTreeData);

  useHubTrashTreeTitleControls(treeManager, history, hub, spaceCan);

  if (!treeManager || !hub) return null;

  if (!trashTreeData || trashTreeData.length === 0) {
    return (
      <TrashWrap>
        <FormattedMessage id="trash.empty" />
      </TrashWrap>
    );
  }

  return (
    <TrashWrap>
      <Tree
        prefixCls="hub-tree"
        className={classNames(styles.trashTree)}
        treeData={trashTreeData}
        selectable={false}
        expandable={false}
        draggable={false}
      />
    </TrashWrap>
  );
}

HubTrashTree.propTypes = {
  treeManager: PropTypes.object,
  history: PropTypes.object,
  hub: PropTypes.object,
  spaceCan: PropTypes.func,
  hubCan: PropTypes.func,
  memberships: PropTypes.array
};

export default HubTrashTree;
