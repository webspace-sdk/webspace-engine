import PropTypes from "prop-types";
import React, { useState, useCallback } from "react";
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
          console.log("restore", data.atomId);

          e.preventDefault();
          e.stopPropagation();
        }}
        onDestroyClick={e => {
          console.log("destroy", data.atomId, hub.hub_id);
          const hubIdToDestroy = data.atomId;

          if (hub.hub_id === hubIdToDestroy) {
            const homeHub = homeHubForSpaceId(hub.space_id, memberships);
            navigateToHubUrl(history, homeHub.url);
          }

          e.preventDefault();
          e.stopPropagation();
        }}
      />
    ),
    [history, memberships, hub, hubCan]
  );

  if (!treeManager || !hub) return null;

  console.log("set title control " + hub.hub_id);
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
