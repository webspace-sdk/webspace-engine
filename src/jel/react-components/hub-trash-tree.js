import PropTypes from "prop-types";
import React, { useState, useCallback } from "react";
import styles from "../assets/stylesheets/hub-trash-tree.scss";
import classNames from "classnames";
import Tree from "rc-tree";
import styled from "styled-components";
import { navigateToHubUrl } from "../utils/jel-url-utils";
import { useTreeData, findChildrenAtomsInTreeData } from "../utils/tree-utils";
//import sharedStyles from "../assets/stylesheets/shared.scss";
import HubTrashNodeTitle from "./hub-trash-node-title";
import { homeHubForSpaceId } from "../utils/membership-utils";
import { FormattedMessage } from "react-intl";
import "../assets/stylesheets/hub-tree.scss";

const TrashWrap = styled.div``;

function HubTrashTree({ treeManager, history, hub, hubCan, memberships }) {
  const [trashTreeData, setTrashTreeData] = useState([]);

  useTreeData(treeManager && treeManager.trashNav, setTrashTreeData);

  const trashNavTitleControl = useCallback(
    data => (
      <HubTrashNodeTitle
        name={data.name}
        showRestore={hubCan("trash_hub", data.atomId)}
        showDestroy={hubCan("destroy_hub", data.atomId)}
        onRestoreClick={e => {
          e.preventDefault();
          e.stopPropagation();

          const hubId = data.atomId;
          const tree = treeManager.trashNav;
          if (!tree.getNodeIdForAtomId(hubId)) return;

          const trashTreeData = treeManager.getNestedTrashTreeData();
          console.log(trashTreeData);

          // Restore this node and all the children we have permission to restore
          const restorableHubIds = [
            hubId,
            ...findChildrenAtomsInTreeData(trashTreeData, hubId).filter(hubId => hubCan("trash_hub", hubId))
          ];

          console.log(restorableHubIds);
        }}
        onDestroyClick={e => {
          e.preventDefault();
          e.stopPropagation();

          const hubIdToDestroy = data.atomId;

          if (hub.hub_id === hubIdToDestroy) {
            const homeHub = homeHubForSpaceId(hub.space_id, memberships);
            navigateToHubUrl(history, homeHub.url);
          }
        }}
      />
    ),
    [treeManager, history, memberships, hub, hubCan]
  );

  if (!treeManager || !hub) return null;

  treeManager.setTrashNavTitleControl(trashNavTitleControl);

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
  hubCan: PropTypes.func,
  memberships: PropTypes.array
};

export default HubTrashTree;
