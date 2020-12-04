import { paths } from "../paths";
import { ArrayBackedSet } from "../array-backed-set";
import { isInEditableField } from "../../../../jel/utils/dom-utils";
import { isInQuillEditor } from "../../../../jel/utils/quill-utils";

export class KeyboardDevice {
  constructor() {
    this.seenKeys = new ArrayBackedSet();
    this.seenCodes = new ArrayBackedSet();
    this.keys = new Map();
    this.codes = new Map();
    this.events = [];

    ["keydown", "keyup"].map(x =>
      document.addEventListener(x, e => {
        if (!e.key) return;
        let pushEvent = true;

        // Blur focused elements when a popup menu is open so it is closed
        if (e.type === "keydown" && e.key === "Escape" && isInEditableField()) {
          AFRAME.scenes[0].canvas.focus();
          e.preventDefault();
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

          e.preventDefault();
        }

        // ` in text editor blurs it
        if (e.type === "keydown" && e.code === "Backquote" && isInQuillEditor()) {
          window.APP.store.handleActivityFlag("mediaTextEditClose");
          // Without this, quill grabs focus when others types
          document.activeElement.parentElement.__quill.blur();

          AFRAME.scenes[0].canvas.focus();
          pushEvent = false; // Prevent primary action this tick if cursor still over 3d text page
          e.preventDefault();
        }

        // / in create popup blurs it
        if (
          e.type === "keydown" &&
          e.key === "/" &&
          document.activeElement &&
          document.activeElement.classList.contains("create-select-selection-search-input")
        ) {
          AFRAME.scenes[0].canvas.focus();
          pushEvent = false; // Prevent primary action this tick if cursor still over 3d text page
          e.preventDefault();
        }

        // Block browser hotkeys for chat command, media browser and freeze
        if (
          (e.type === "keydown" && e.key === "/" && !isInEditableField()) || // Cancel slash in create select input since it hides it
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
          (e.key === " " && document.activeElement === document.body) // Disable spacebar scrolling in main window
        ) {
          e.preventDefault();
        }

        // Process event with user input system
        if (pushEvent) {
          this.events.push(e);
        }
      })
    );
    ["blur"].map(x => window.addEventListener(x, this.events.push.bind(this.events)));
  }

  write(frame) {
    for (let i = 0; i < this.events.length; i++) {
      const event = this.events[i];
      if (event.type === "blur") {
        this.keys.clear();
        this.codes.clear();
        this.seenKeys.clear();
        this.seenCodes.clear();
      } else {
        const key = event.key.toLowerCase();
        const code = event.code.toLowerCase();
        const isDown = event.type === "keydown";
        this.keys.set(key, isDown);
        this.codes.set(code, isDown);

        this.seenKeys.add(key);
        this.seenCodes.add(code);

        if (event.ctrlKey) {
          this.keys.set("control", isDown);
          this.seenKeys.add("control");
        }

        if (event.altKey) {
          this.keys.set("alt", isDown);
          this.seenKeys.add("alt");
        }

        if (event.metaKey) {
          this.keys.set("meta", isDown);
          this.seenKeys.add("meta");
        }

        if (event.shiftKey) {
          this.keys.set("shift", isDown);
          this.seenKeys.add("shift");
        }
      }
    }

    this.events.length = 0;

    for (let i = 0; i < this.seenKeys.items.length; i++) {
      const key = this.seenKeys.items[i];
      const path = paths.device.keyboard.key(key);
      frame.setValueType(path, this.keys.get(key));
    }

    for (let i = 0; i < this.seenCodes.items.length; i++) {
      const code = this.seenCodes.items[i];
      const path = paths.device.keyboard.code(code);
      frame.setValueType(path, this.codes.get(code));
    }
  }
}
