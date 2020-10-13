import React from "react";
import Tree from "rc-tree";
import "../assets/stylesheets/hub-tree.scss";
import sharedStyles from "../assets/stylesheets/shared.scss";
import HubNodeTitle from "./hub-node-title";
import classNames from "classnames";
import PanelSectionHeader from "./panel-section-header";
import { PanelItemButton, PanelItemButtonSection } from "./panel-item-button";
import trashIcon from "../assets/images/icons/trash.svgi";

const createTitleNode = props => {
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

const treeData = [
  { key: "3ub5q94", title: createTitleNode, name: "Super Cool World", url: null, hubId: "QxRKdNF", isLeaf: true },
  {
    key: "f9g20et",
    title: createTitleNode,
    name: "Second Node With Really Really Long Name",
    url: null,
    hubId: "7gNqKfG",
    isLeaf: true
  },
  {
    key: "lsgr9la",
    name: "Third Node",
    title: createTitleNode,
    children: [
      {
        key: "nq106el",
        title: createTitleNode,
        name: "My Subworld",
        children: [
          { key: "l5k090y", name: "Inner Child", title: createTitleNode, url: null, hubId: "JRrZerh", isLeaf: true }
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
  { key: "qdtt3v2", title: createTitleNode, name: "Fourth Node", url: null, hubId: "T6uis47", isLeaf: true },
  { key: "3ofrzv8", title: createTitleNode, name: "Fifth Node", url: null, hubId: "UyvPPEf", isLeaf: true }
];

export const HubTree = () => (
  <div
    className={classNames(sharedStyles.basePanel)}
    style={{ display: "flex", width: "400px", height: "600px", marginTop: "32px", flexDirection: "column" }}
  >
    <PanelSectionHeader>Section Name</PanelSectionHeader>
    <Tree prefixCls="hub-tree" treeData={treeData} selectable={true} selectedKeys={["nq106el"]} />
    <PanelItemButtonSection>
      <PanelItemButton iconSrc={trashIcon}>Trash</PanelItemButton>
    </PanelItemButtonSection>
  </div>
);

export default {
  title: "Tree"
};
