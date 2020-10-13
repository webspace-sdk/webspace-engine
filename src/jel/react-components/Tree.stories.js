import React from "react";
import Tree from "rc-tree";
import "../assets/stylesheets/hub-tree.scss";
import sharedStyles from "../assets/stylesheets/shared.scss";
import trashTreeStyles from "../assets/stylesheets/hub-trash-tree.scss";
import HubNodeTitle from "./hub-node-title";
import HubTrashNodeTitle from "./hub-trash-node-title";
import classNames from "classnames";
import PanelSectionHeader from "./panel-section-header";
import PanelItemButton, { PanelItemButtonSection } from "./panel-item-button";
import trashIcon from "../assets/images/icons/trash.svgi";

const createHubTitleNode = props => {
  return (
    <HubNodeTitle
      {...props}
      showAdd={true}
      onAddClick={e => {
        e.preventDefault();
        console.log("add clicked");
      }}
      onDotsClick={e => {
        e.preventDefault();
        console.log("dots clicked");
      }}
    />
  );
};

const createHubTrashTitleNode = props => {
  return (
    <HubTrashNodeTitle
      {...props}
      showAdd={true}
      onRestoreClick={e => {
        e.preventDefault();
        console.log("restore clicked");
      }}
      onDestroyClick={e => {
        e.preventDefault();
        console.log("destroy clicked");
      }}
    />
  );
};

const hubTreeData = [
  { key: "3ub5q94", title: createHubTitleNode, name: "Super Cool World", url: null, hubId: "QxRKdNF", isLeaf: true },
  {
    key: "f9g20et",
    title: createHubTitleNode,
    name: "Second Node With Really Really Long Name",
    url: null,
    hubId: "7gNqKfG",
    isLeaf: true
  },
  {
    key: "lsgr9la",
    name: "Third Node",
    title: createHubTitleNode,
    children: [
      {
        key: "nq106el",
        title: createHubTitleNode,
        name: "My Subworld",
        children: [
          { key: "l5k090y", name: "Inner Child", title: createHubTitleNode, url: null, hubId: "JRrZerh", isLeaf: true }
        ],
        url: null,
        hubId: "uxj79J5",
        isLeaf: false
      }
    ],
    url: null,
    hubId: "jPCgYSA",
    isLeaf: false
  },
  { key: "qdtt3v2", title: createHubTitleNode, name: "Fourth Node", url: null, hubId: "T6uis47", isLeaf: true },
  { key: "3ofrzv8", title: createHubTitleNode, name: "Fifth Node", url: null, hubId: "UyvPPEf", isLeaf: true }
];

const trashTreeData = [
  {
    key: "3ub5q94",
    title: createHubTrashTitleNode,
    name: "Super Cool World",
    url: null,
    hubId: "QxRKdNF",
    isLeaf: true
  },
  {
    key: "f9g20et",
    title: createHubTrashTitleNode,
    name: "Second Node With Really Really Long Name",
    url: null,
    hubId: "7gNqKfG",
    isLeaf: true
  },
  {
    key: "lsgr9la",
    name: "Third Node",
    title: createHubTrashTitleNode,
    url: null,
    hubId: "jPCgYSA",
    isLeaf: true
  },
  { key: "qdtt3v2", title: createHubTrashTitleNode, name: "Fourth Node", url: null, hubId: "T6uis47", isLeaf: true },
  { key: "3ofrzv8", title: createHubTrashTitleNode, name: "Fifth Node", url: null, hubId: "UyvPPEf", isLeaf: true }
];

export const HubTree = () => (
  <div
    className={classNames(sharedStyles.basePanel)}
    style={{ display: "flex", width: "400px", height: "600px", marginTop: "32px", flexDirection: "column" }}
  >
    <PanelSectionHeader>Section Name</PanelSectionHeader>
    <Tree prefixCls="hub-tree" treeData={hubTreeData} selectable={true} selectedKeys={["nq106el"]} />
    <PanelItemButtonSection>
      <PanelItemButton iconSrc={trashIcon}>Trash</PanelItemButton>
    </PanelItemButtonSection>
  </div>
);

export const TrashTree = () => (
  <div
    className={classNames(sharedStyles.basePanel)}
    style={{ display: "flex", width: "400px", height: "600px", marginTop: "32px", flexDirection: "column" }}
  >
    <Tree
      prefixCls="hub-tree"
      className={classNames(trashTreeStyles.trashTree)}
      treeData={trashTreeData}
      expandable={false}
      selectable={false}
      selectedKeys={["nq106el"]}
    />
  </div>
);

export default {
  title: "Tree"
};
