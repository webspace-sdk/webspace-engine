import React from "react";
import Tree from "rc-tree";
import foo from "../assets/stylesheets/nav-tree.scss";
console.log(foo);

const treeData = [
  { key: "3ub5q94", title: "First Node", url: null, hubId: "QxRKdNF", isLeaf: true },
  { key: "f9g20et", title: "Second Node", url: null, hubId: "7gNqKfG", isLeaf: true },
  {
    key: "lsgr9la",
    title: "Third Node",
    children: [
      {
        key: "nq106el",
        title: "Child Node",
        children: [{ key: "l5k090y", title: "Inner Child", url: null, hubId: "JRrZerh", isLeaf: true }],
        url: null,
        hubId: "uxj79J5",
        isLeaf: false
      }
    ],
    url: null,
    hubId: "jPCgYSA",
    isLeaf: false
  },
  { key: "qdtt3v2", title: "Fourth Node", url: null, hubId: "T6uis47", isLeaf: true },
  { key: "3ofrzv8", title: "Fifth Node", url: null, hubId: "UyvPPEf", isLeaf: true }
];

export const Normal = () => (
  <div style={{ display: "flex" }}>
    Hello
    <Tree treeData={treeData} selectable={true} selectedKeys={["nq106el"]} />
  </div>
);

export default {
  title: "Tree"
};
