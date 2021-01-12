import React from "react";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
import classNames from "classnames";

import EmojiEquip from "./emoji-equip";

export const Normal = () => (
  <div
    className={classNames(sharedStyles.basePanel)}
    style={{ width: "220px", height: "400px", display: "flex", flexDirection: "column", alignItems: "flex-start" }}
  >
    <EmojiEquip />
  </div>
);

export default {
  title: "Emoji Equip"
};
