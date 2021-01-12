import React from "react";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
import classNames from "classnames";

import EmojiEquip from "./emoji-equip";
window.APP.store.update({
  equips: {
    launcher: "😀",
    launcherSlot1: "😀",
    launcherSlot2: "😂",
    launcherSlot3: "🤔",
    launcherSlot4: "😍",
    launcherSlot5: "😘",
    launcherSlot6: "🥺",
    launcherSlot7: "😭",
    launcherSlot8: "👍",
    launcherSlot9: "👏",
    launcherSlot10: "❤️"
  }
});

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
