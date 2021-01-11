import React from "react";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
import classNames from "classnames";
import addIcon from "../../assets/jel/images/icons/add.svgi";

import EmojiEquip from "./emoji-equip";

export const Normal = () => (
  <div className={classNames(sharedStyles.basePanel)} style={{ display: "flex" }}>
    <EmojiEquip />
  </div>
);

export default {
  title: "Emoji Equip"
};
