import { paths } from "../paths";
import { ArrayBackedSet } from "../array-backed-set";
import { isInEditableField } from "../../../../jel/utils/dom-utils";

export class KeyboardDevice {
  constructor() {
    this.seenKeys = new ArrayBackedSet();
    this.keys = {};
    this.events = [];

    ["keydown", "keyup"].map(x =>
      document.addEventListener(x, e => {
        if (!e.key) return;
        this.events.push(e);

        // Blur focused elements when a popup menu is open so it is closed
        if (e.type === "keydown" && e.key === "Escape" && document.querySelector("#jel-popup-root:focus-within")) {
          document.activeElement.blur();
        }

        // Non-repeated shift-space is cursor lock hotkey.
        if (e.type === "keydown" && e.key === " " && e.shiftKey && !e.repeat && !isInEditableField()) {
          const canvas = AFRAME.scenes[0].canvas;

          if (canvas.requestPointerLock) {
            if (document.pointerLockElement === canvas) {
              document.exitPointerLock();
            } else {
              canvas.requestPointerLock();
            }
          }
        }

        // Block browser hotkeys for chat command, media browser and freeze
        if (
          (e.type === "keydown" &&
            e.key === "/" &&
            (!isInEditableField() || document.activeElement.getAttribute("id") !== "create-select-input")) || // Cancel slash in create select input since it hides it
          (e.ctrlKey &&
            (e.key === "1" ||
              e.key === "2" ||
              e.key === "3" ||
              e.key === "4" ||
              e.key === "5" ||
              e.key === "6" ||
              e.key === "7" ||
              e.key === "8" ||
              e.key === "9" ||
              e.key === "0")) ||
          (e.key === "Tab" && document.activeElement.classList.contains("a-canvas")) ||
          (e.key === " " && document.activeElement === document.body) // Disable spacebar scrolling in main window
        ) {
          e.preventDefault();
          return false;
        }
      })
    );
    ["blur"].map(x => window.addEventListener(x, this.events.push.bind(this.events)));
  }

  write(frame) {
    for (let i = 0; i < this.events.length; i++) {
      const event = this.events[i];
      if (event.type === "blur") {
        this.keys = {};
        this.seenKeys.clear();
      } else {
        const key = event.key.toLowerCase();
        this.keys[key] = event.type === "keydown";
        this.seenKeys.add(key);

        if (event.ctrlKey) {
          this.keys["control"] = event.type === "keydown";
          this.seenKeys.add("control");
        }

        if (event.altKey) {
          this.keys["alt"] = event.type === "keydown";
          this.seenKeys.add("alt");
        }

        if (event.metaKey) {
          this.keys["meta"] = event.type === "keydown";
          this.seenKeys.add("meta");
        }

        if (event.shiftKey) {
          this.keys["shift"] = event.type === "keydown";
          this.seenKeys.add("shift");
        }
      }
    }

    this.events.length = 0;

    for (let i = 0; i < this.seenKeys.items.length; i++) {
      const key = this.seenKeys.items[i];
      const path = paths.device.keyboard.key(key);
      frame.setValueType(path, this.keys[key]);
    }
  }
}
