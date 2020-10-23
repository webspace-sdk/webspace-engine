import React from "react";
import sharedStyles from "../assets/stylesheets/shared.scss";
import classNames from "classnames";
import KeyTips from "./key-tips";

export const IdlePanels = () => {
  return (
    <div
      className={classNames(sharedStyles.basePanel)}
      style={{
        position: "relative",
        backgroundColor: "rgba(60, 150, 50)",
        width: "600px",
        height: "600px"
      }}
    >
      <div style={{ position: "absolute", right: 0, bottom: 0 }}>
        <KeyTips />
      </div>
    </div>
  );
};

export default {
  title: "Key Tips"
};
