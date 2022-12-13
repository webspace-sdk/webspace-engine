import React, { useEffect, useRef } from "react";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
import classNames from "classnames";

import AvatarSwatch from "./avatar-swatch";

let eyeIndex = 0;
let mouthIndex = 0;

export const Normal = () => {
  const swatchRef = useRef();

  useEffect(
    () => {
      const interval = setInterval(() => {
        eyeIndex = (eyeIndex + 1) % 8;
        mouthIndex = (mouthIndex + 1) % 12;
        swatchRef.current.setAttribute("data-eyes", eyeIndex);
        swatchRef.current.setAttribute("data-mouth", mouthIndex);
        swatchRef.current.setAttribute("style", "color: blue;");
      }, 150);

      return () => clearInterval(interval);
    },
    [swatchRef]
  );

  return (
    <div
      className={classNames(sharedStyles.basePanel)}
      style={{
        display: "flex",
        width: "300px",
        height: "60px",
        justifyContent: "flex-start",
        alignItems: "center"
      }}
    >
      <AvatarSwatch ref={swatchRef} eyeIndex={0} mouthIndex={0} color="#D52D55" />
    </div>
  );
};

export default {
  title: "Avatar Swatch"
};
