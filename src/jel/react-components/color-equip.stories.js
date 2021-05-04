import React from "react";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
import classNames from "classnames";

import { rgbToStoredColor } from "../../hubs/storage/store";

import ColorEquip from "./color-equip";
window.APP.store.update({
  equips: {
    //colorSlot1: rgbToStoredColor({ r: 120, g: 239, b: 21 }),
    //colorSlot2: rgbToStoredColor({ r: 231, g: 200, b: 12 }),
    //colorSlot3: rgbToStoredColor({ r: 22, g: 230, b: 44 }),
    //colorSlot4: rgbToStoredColor({ r: 22, g: 230, b: 44 }),
    //colorSlot5: rgbToStoredColor({ r: 22, g: 230, b: 44 }),
    //colorSlot6: rgbToStoredColor({ r: 22, g: 230, b: 44 }),
    //colorSlot7: rgbToStoredColor({ r: 242, g: 230, b: 44 }),
    //colorSlot8: rgbToStoredColor({ r: 22, g: 230, b: 44 }),
    //colorSlot9: rgbToStoredColor({ r: 22, g: 230, b: 44 }),
    //colorSlot10: rgbToStoredColor({ r: 22, g: 230, b: 44 })
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
