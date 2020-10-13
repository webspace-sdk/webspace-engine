import PropTypes from "prop-types";
import React, { useState, useEffect } from "react";
import styles from "../assets/stylesheets/hub-trash-tree.scss";
import classNames from "classnames";
import Tree from "rc-tree";
import styled from "styled-components";
import { navigateToHubUrl } from "../utils/jel-url-utils";
import { useTreeData } from "../utils/tree-utils";
//import sharedStyles from "../assets/stylesheets/shared.scss";
import HubTrashNodeTitle from "./hub-trash-node-title";
import { homeHubForSpaceId } from "../utils/membership-utils";
import { FormattedMessage } from "react-intl";
import "../assets/stylesheets/hub-tree.scss";

const TrashWrap = styled.div``;

export function useHubTrashTreeTitleControls(treeManager, history, hub, spaceCan, hubCan, memberships) {
  useEffect(
    () => {
      if (!treeManager) return;

      treeManager.setTrashNavTitleControl(data => (
        <HubTrashNodeTitle
          name={data.name}
          showRestore={hubCan("trash_hub", data.atomId)}
          showDestroy={hubCan("destroy_hub", data.atomId)}
          onRestoreClick={e => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDestroyClick={e => {
            const hubIdToDestroy = data.atomId;

            if (hub.hub_id === hubIdToDestroy) {
              const homeHub = homeHubForSpaceId(hub.space_id, memberships);
              navigateToHubUrl(history, homeHub.url);
            }

            e.preventDefault();
            e.stopPropagation();
          }}
        />
      ));
      return () => {};
    },
    [treeManager, history, hub, spaceCan, hubCan, memberships]
  );
}

function HubTrashTree({ treeManager, history, hub, spaceCan, hubCan, memberships }) {
  const [trashTreeData, setTrashTreeData] = useState([]);

  useTreeData(treeManager && treeManager.trashNav, setTrashTreeData);

  useHubTrashTreeTitleControls(treeManager, history, hub, spaceCan, hubCan, memberships);

  if (!treeManager || !hub) return null;

  if (!trashTreeData || trashTreeData.length === 0) {
    return (
      <TrashWrap>
        <FormattedMessage id="trash.empty" />
      </TrashWrap>
    );
  }

  const navSelectedKeys = hub ? [treeManager.trashNav.getNodeIdForAtomId(hub.hub_id)] : [];

  return (
    <TrashWrap>
      <Tree
        prefixCls="hub-tree"
        className={classNames(styles.trashTree)}
        treeData={trashTreeData}
        selectedKeys={navSelectedKeys}
        onSelect={(selectedKeys, { node: { url } }) => navigateToHubUrl(history, url)}
        selectable={true}
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
