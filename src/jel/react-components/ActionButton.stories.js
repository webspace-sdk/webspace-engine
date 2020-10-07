import React from "react";
import sharedStyles from "../assets/stylesheets/shared.scss";
import classNames from "classnames";
import addIcon from "../assets/images/icons/add.svgi";

import ActionButton from "./action-button";

export const Normal = () => (
  <div className={classNames(sharedStyles.basePanel)} style={{ display: "flex" }}>
    <ActionButton>Test Button</ActionButton>
  </div>
);

export const WithIcon = () => (
  <div className={classNames(sharedStyles.basePanel)} style={{ display: "flex" }}>
    <ActionButton iconSrc={addIcon}>With An Icon</ActionButton>
  </div>
);

export default {
  title: "Action Button"
};
