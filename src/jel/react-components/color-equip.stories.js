import React from "react";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
import classNames from "classnames";

import ColorEquip from "./color-equip";
window.APP.store.update({
  equips: {
    color: "#FF0000",
    colorSlot1: "#FA8C1B",
    colorSlot2: "#AC83C1",
    colorSlot3: "#FA0AB1",
    colorSlot4: "#9A8322",
    colorSlot5: "#8D1D2B",
    colorSlot6: "#0438CA",
    colorSlot7: "#FFFFFF",
    colorSlot8: "#F8A2B9",
    colorSlot9: "#93D303",
    colorSlot10: "#A2B300"
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
