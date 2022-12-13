import React, { useState } from "react";
import addIcon from "../assets/jel/images/icons/add.svgi";
import SegmentControl from "./segment-control";

export const WithIcons = () => {
  const [selected, setSelected] = useState(0);

  return (
    <SegmentControl
      rows={2}
      cols={3}
      selectedIndices={[selected]}
      onChange={(id, idx) => setSelected(idx)}
      items={[
        { id: "addItem", iconSrc: addIcon, title: "Add Item" },
        { id: "removeItem", iconSrc: addIcon, title: "Remove Item" },
        { id: "lastItem", iconSrc: addIcon, title: "Remove Item" },
        { id: "addItem2", iconSrc: addIcon, title: "Add Item" },
        { id: "removeItem2", iconSrc: addIcon, title: "Remove Item" },
        { id: "lastItem2", iconSrc: addIcon, title: "Remove Item" }
      ]}
    />
  );
};

export const WithIconsSingle = () => {
  const [selected, setSelected] = useState(0);

  return (
    <SegmentControl
      rows={1}
      cols={3}
      selectedIndices={[selected]}
      onChange={(id, idx) => setSelected(idx)}
      items={[
        { id: "addItem", iconSrc: addIcon, title: "Add Item" },
        { id: "removeItem", iconSrc: addIcon, title: "Remove Item" },
        { id: "lastItem", iconSrc: addIcon, title: "Remove Item" }
      ]}
    />
  );
};

export default {
  title: "Segment Control"
};
