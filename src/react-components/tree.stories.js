import React from "react";
import Tree from "rc-tree";
import "../../assets/jel/stylesheets/atom-tree.scss";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
import HubNodeTitle from "./hub-node-title";
import classNames from "classnames";
import PanelSectionHeader from "./panel-section-header";
import AtomMetadata, { ATOM_TYPES } from "../utils/atom-metadata";

const hubMetadata = new AtomMetadata(ATOM_TYPES.HUB);

// TODO this needs to use the metadata API
const createHubTitleNode = props => {
  return (
    <HubNodeTitle
      {...props}
      showAdd={true}
      showDots={true}
      hubMetadata={hubMetadata}
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

const hubTreeData = [
  { key: "3ub5q94", title: createHubTitleNode, url: null, hubId: "QxRKdNF", isLeaf: true },
  {
    key: "f9g20et",
    title: createHubTitleNode,
    url: null,
    hubId: "7gNqKfG",
    isLeaf: true
  },
  {
    key: "lsgr9la",
    title: createHubTitleNode,
    children: [
      {
        key: "nq106el",
        title: createHubTitleNode,
        children: [{ key: "l5k090y", title: createHubTitleNode, url: null, hubId: "JRrZerh", isLeaf: true }],
        url: null,
        hubId: "uxj79J5",
        isLeaf: false
      }
    ],
    url: null,
    hubId: "jPCgYSA",
    isLeaf: false
  },
  { key: "qdtt3v2", title: createHubTitleNode, url: null, hubId: "T6uis47", isLeaf: true },
  { key: "3ofrzv8", title: createHubTitleNode, url: null, hubId: "UyvPPEf", isLeaf: true }
];

const fill = (metadata, children) => {
  for (let i = 0; i < children.length; i++) {
    metadata._metadata.set(children[i].hubId || children[i].channelId, {
      displayName: "Unnamed Atom"
    });

    fill(metadata, children[i].children || []);
  }
};

fill(hubMetadata, hubTreeData);

hubMetadata._metadata.set("QxRKdNF", { displayName: "Test Name" });
hubMetadata._metadata.set("JRrZerh", { displayName: "Test Very Long Name That Keeps Going and Going" });

export const HubTree = () => (
  <div
    className={classNames(sharedStyles.basePanel)}
    style={{ display: "flex", width: "400px", height: "600px", marginTop: "32px", flexDirection: "column" }}
  >
    <PanelSectionHeader>Section Name</PanelSectionHeader>
    <Tree prefixCls="atom-tree" treeData={hubTreeData} selectable={true} selectedKeys={["nq106el"]} />
  </div>
);

export default {
  title: "Tree"
};
