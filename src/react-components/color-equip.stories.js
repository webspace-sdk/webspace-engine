import React from "react";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
import classNames from "classnames";

import {rgbToStoredColor} from "../storage/store";

import ColorEquip from "./color-equip";

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
    colorSlot10: rgbToStoredColor({ r: 0, g: 0, b: 0 }),
    // Magenta
    colorSlot11: rgbToStoredColor({ r: 98, g: 0, b: 66 }),
    colorSlot12: rgbToStoredColor({ r: 135, g: 5, b: 87 }),
    colorSlot13: rgbToStoredColor({ r: 163, g: 6, b: 100 }),
    colorSlot14: rgbToStoredColor({ r: 188, g: 10, b: 111 }),
    colorSlot15: rgbToStoredColor({ r: 218, g: 18, b: 125 }),
    colorSlot16: rgbToStoredColor({ r: 232, g: 54, b: 143 }),
    colorSlot17: rgbToStoredColor({ r: 243, g: 100, b: 162 }),
    colorSlot18: rgbToStoredColor({ r: 255, g: 140, b: 186 }),
    colorSlot19: rgbToStoredColor({ r: 255, g: 184, b: 210 }),
    // Red
    colorSlot20: rgbToStoredColor({ r: 255, g: 227, b: 236 }),
    colorSlot21: rgbToStoredColor({ r: 97, g: 3, b: 22 }),
    colorSlot22: rgbToStoredColor({ r: 138, g: 4, b: 26 }),
    colorSlot23: rgbToStoredColor({ r: 171, g: 9, b: 30 }),
    colorSlot24: rgbToStoredColor({ r: 207, g: 17, b: 36 }),
    colorSlot25: rgbToStoredColor({ r: 225, g: 45, b: 57 }),
    colorSlot26: rgbToStoredColor({ r: 239, g: 78, b: 78 }),
    colorSlot27: rgbToStoredColor({ r: 248, g: 106, b: 106 }),
    colorSlot28: rgbToStoredColor({ r: 255, g: 155, b: 155 }),
    colorSlot29: rgbToStoredColor({ r: 255, g: 189, b: 189 }),
    // Orange
    colorSlot30: rgbToStoredColor({ r: 255, g: 227, b: 227 }),
    colorSlot31: rgbToStoredColor({ r: 132, g: 16, b: 3 }),
    colorSlot32: rgbToStoredColor({ r: 173, g: 29, b: 7 }),
    colorSlot33: rgbToStoredColor({ r: 197, g: 39, b: 7 }),
    colorSlot34: rgbToStoredColor({ r: 222, g: 58, b: 17 }),
    colorSlot35: rgbToStoredColor({ r: 243, g: 86, b: 39 }),
    colorSlot36: rgbToStoredColor({ r: 249, g: 112, b: 62 }),
    colorSlot37: rgbToStoredColor({ r: 255, g: 148, b: 102 }),
    colorSlot38: rgbToStoredColor({ r: 255, g: 176, b: 136 }),
    colorSlot39: rgbToStoredColor({ r: 255, g: 208, b: 181 }),
    // Yellow
    colorSlot40: rgbToStoredColor({ r: 255, g: 232, b: 217 }),
    colorSlot41: rgbToStoredColor({ r: 141, g: 43, b: 11 }),
    colorSlot42: rgbToStoredColor({ r: 180, g: 77, b: 18 }),
    colorSlot43: rgbToStoredColor({ r: 203, g: 110, b: 23 }),
    colorSlot44: rgbToStoredColor({ r: 222, g: 145, b: 29 }),
    colorSlot45: rgbToStoredColor({ r: 240, g: 180, b: 41 }),
    colorSlot46: rgbToStoredColor({ r: 247, g: 201, b: 72 }),
    colorSlot47: rgbToStoredColor({ r: 250, g: 219, b: 95 }),
    colorSlot48: rgbToStoredColor({ r: 252, g: 229, b: 136 }),
    colorSlot49: rgbToStoredColor({ r: 255, g: 243, b: 196 }),
    // Green
    colorSlot50: rgbToStoredColor({ r: 255, g: 251, b: 234 }),
    colorSlot51: rgbToStoredColor({ r: 1, g: 77, b: 64 }),
    colorSlot52: rgbToStoredColor({ r: 12, g: 107, b: 88 }),
    colorSlot53: rgbToStoredColor({ r: 20, g: 125, b: 100 }),
    colorSlot54: rgbToStoredColor({ r: 25, g: 148, b: 115 }),
    colorSlot55: rgbToStoredColor({ r: 39, g: 171, b: 131 }),
    colorSlot56: rgbToStoredColor({ r: 62, g: 189, b: 147 }),
    colorSlot57: rgbToStoredColor({ r: 101, g: 214, b: 173 }),
    colorSlot58: rgbToStoredColor({ r: 142, g: 237, b: 199 }),
    colorSlot59: rgbToStoredColor({ r: 198, g: 247, b: 226 }),
    // Cyan
    colorSlot60: rgbToStoredColor({ r: 239, g: 252, b: 246 }),
    colorSlot61: rgbToStoredColor({ r: 5, g: 96, b: 110 }),
    colorSlot62: rgbToStoredColor({ r: 7, g: 129, b: 143 }),
    colorSlot63: rgbToStoredColor({ r: 9, g: 154, b: 164 }),
    colorSlot64: rgbToStoredColor({ r: 15, g: 181, b: 186 }),
    colorSlot65: rgbToStoredColor({ r: 28, g: 212, b: 212 }),
    colorSlot66: rgbToStoredColor({ r: 58, g: 231, b: 225 }),
    colorSlot67: rgbToStoredColor({ r: 98, g: 224, b: 235 }),
    colorSlot68: rgbToStoredColor({ r: 146, g: 253, b: 242 }),
    colorSlot69: rgbToStoredColor({ r: 193, g: 254, b: 246 }),
    // Indigo
    colorSlot70: rgbToStoredColor({ r: 225, g: 252, b: 248 }),
    colorSlot71: rgbToStoredColor({ r: 6, g: 17, b: 120 }),
    colorSlot72: rgbToStoredColor({ r: 11, g: 29, b: 150 }),
    colorSlot73: rgbToStoredColor({ r: 19, g: 45, b: 173 }),
    colorSlot74: rgbToStoredColor({ r: 29, g: 61, b: 191 }),
    colorSlot75: rgbToStoredColor({ r: 34, g: 81, b: 204 }),
    colorSlot76: rgbToStoredColor({ r: 58, g: 102, b: 219 }),
    colorSlot77: rgbToStoredColor({ r: 94, g: 138, b: 238 }),
    colorSlot78: rgbToStoredColor({ r: 136, g: 177, b: 252 }),
    colorSlot79: rgbToStoredColor({ r: 176, g: 208, b: 255 }),
    // Violet
    colorSlot80: rgbToStoredColor({ r: 217, g: 232, b: 255 }),
    colorSlot81: rgbToStoredColor({ r: 68, g: 5, b: 110 }),
    colorSlot82: rgbToStoredColor({ r: 88, g: 10, b: 148 }),
    colorSlot83: rgbToStoredColor({ r: 105, g: 12, b: 176 }),
    colorSlot84: rgbToStoredColor({ r: 122, g: 14, b: 204 }),
    colorSlot85: rgbToStoredColor({ r: 135, g: 25, b: 224 }),
    colorSlot86: rgbToStoredColor({ r: 148, g: 70, b: 237 }),
    colorSlot87: rgbToStoredColor({ r: 163, g: 104, b: 252 }),
    colorSlot88: rgbToStoredColor({ r: 185, g: 144, b: 255 }),
    colorSlot89: rgbToStoredColor({ r: 218, g: 196, b: 255 }),
    // Greys
    colorSlot90: rgbToStoredColor({ r: 242, g: 235, b: 254 }),
    colorSlot91: rgbToStoredColor({ r: 0, g: 0, b: 0 }),
    colorSlot92: rgbToStoredColor({ r: 59, g: 59, b: 59 }),
    colorSlot93: rgbToStoredColor({ r: 81, g: 81, b: 81 }),
    colorSlot94: rgbToStoredColor({ r: 98, g: 98, b: 98 }),
    colorSlot95: rgbToStoredColor({ r: 126, g: 126, b: 126 }),
    colorSlot96: rgbToStoredColor({ r: 158, g: 158, b: 158 }),
    colorSlot97: rgbToStoredColor({ r: 177, g: 177, b: 177 }),
    colorSlot98: rgbToStoredColor({ r: 207, g: 207, b: 207 }),
    colorSlot99: rgbToStoredColor({ r: 225, g: 225, b: 225 }),
    colorSlot100: rgbToStoredColor({ r: 255, g: 255, b: 255 })
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
