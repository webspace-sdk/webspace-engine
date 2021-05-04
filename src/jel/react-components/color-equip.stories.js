import React from "react";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
import classNames from "classnames";

import { rgbToStoredColor } from "../../hubs/storage/store";

import ColorEquip from "./color-equip";

// Pink 9446ed
// R EF4E4E
// O f9703e
// Y fadb5f
// G 8ded2d
// C 3Ae7e1
// B/I 3A66DB
// V 9446ED
// Grey #ffffff
// Black #000000
window.APP.store.update({
  equips: {
    colorSlot1: rgbToStoredColor({ r: 237, g: 70, b: 148 }),
    colorSlot2: rgbToStoredColor({ r: 239, g: 78, b: 78 }),
    colorSlot3: rgbToStoredColor({ r: 249, g: 112, b: 62 }),
    colorSlot4: rgbToStoredColor({ r: 250, g: 219, b: 95 }),
    colorSlot5: rgbToStoredColor({ r: 141, g: 237, b: 45 }),
    colorSlot6: rgbToStoredColor({ r: 58, g: 231, b: 225 }),
    colorSlot7: rgbToStoredColor({ r: 58, g: 102, b: 219 }),
    colorSlot8: rgbToStoredColor({ r: 148, g: 70, b: 237 }),
    colorSlot9: rgbToStoredColor({ r: 255, g: 255, b: 255 }),
    colorSlot10: rgbToStoredColor({ r: 0, g: 0, b: 0 })
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
