import React from "react";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
import classNames from "classnames";

import ColorEquip from "./color-equip";
window.APP.store.update({
  equips: {
    color: [200, 0, 0],
    colorSlot1: [120, 239, 21],
    colorSlot2: [231, 200, 12],
    colorSlot3: [22, 230, 44],
    colorSlot4: [22, 230, 44],
    colorSlot5: [22, 230, 44],
    colorSlot6: [22, 230, 44],
    colorSlot7: [242, 230, 44],
    colorSlot8: [22, 230, 44],
    colorSlot9: [22, 230, 44],
    colorSlot10: [22, 230, 44]
  }
});

export const Normal = () => (
  <div
    className={classNames(sharedStyles.basePanel)}
    style={{ width: "220px", height: "400px", display: "flex", flexDirection: "column", alignItems: "flex-start" }}
  >
    <ColorEquip onSelectedColorClicked={() => console.log("Center clicked")} />
  </div>
);

export default {
  title: "Color Equip"
};
