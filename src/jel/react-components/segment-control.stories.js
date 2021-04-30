import React from "react";
import addIcon from "../../assets/jel/images/icons/add.svgi";
import SegmentControl from "./segment-control";

export const WithIcons = () => (
  <SegmentControl
    items={[
      { id: "addItem", iconSrc: addIcon, title: "Add Item" },
      { id: "removeItem", iconSrc: addIcon, title: "Remove Item" },
      { id: "lastItem", iconSrc: addIcon, title: "Remove Item" }
    ]}
  />
);

export default {
  title: "Segment Control"
};
