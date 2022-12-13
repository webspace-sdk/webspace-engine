import React from "react";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
import classNames from "classnames";

import ColorPicker from "./color-picker";

export const Normal = () => {
  return (
    <div
      className={classNames(sharedStyles.basePanel)}
      style={{
        display: "flex",
        width: "300px",
        height: "300px",
        justifyContent: "center",
        alignItems: "center"
      }}
    >
      <div style={{ width: "125px", height: "125px" }}>
        <ColorPicker onChangeComplete={e => console.log(e)} />
      </div>
    </div>
  );
};

export default {
  title: "Color Picker"
};
