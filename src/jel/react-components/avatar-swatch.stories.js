import React from "react";
import sharedStyles from "../assets/stylesheets/shared.scss";
import classNames from "classnames";

import AvatarSwatch from "./avatar-swatch";

export const Normal = () => (
  <div className={classNames(sharedStyles.basePanel)} style={{ display: "flex", width: "300px", height: "60px" }}>
    <AvatarSwatch color="#D52D55" />
  </div>
);

export default {
  title: "Avatar Swatch"
};
