import React, { useRef, useEffect } from "react";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
import classNames from "classnames";
import KeyTips, { KEY_TIP_TYPES } from "./key-tips";
let curTipType = -1;

export const IdlePanels = () => {
  const ref = useRef();

  useEffect(
    () => {
      const interval = setInterval(() => {
        curTipType = (curTipType + 1) % KEY_TIP_TYPES.length;
        ref.current.setAttribute("data-show-tips", KEY_TIP_TYPES[curTipType]);
      }, 1000);

      return () => clearInterval(interval);
    },
    [ref]
  );

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
        <KeyTips ref={ref} />
      </div>
    </div>
  );
};

export default {
  title: "Key Tips"
};
