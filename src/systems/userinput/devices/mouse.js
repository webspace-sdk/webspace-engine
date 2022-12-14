import { paths } from "../paths";

// TODO: Where do these values (500, 10, 2) come from?
const modeMod = {
  [WheelEvent.DOM_DELTA_PIXEL]: 500,
  [WheelEvent.DOM_DELTA_LINE]: 10,
  [WheelEvent.DOM_DELTA_PAGE]: 2
};

const isInModal = (() => {
  let uiRoot = null;

  return function() {
    if (!uiRoot) {
      uiRoot = DOM_ROOT.querySelector(".ui-root");
    }

    return uiRoot && uiRoot.classList.contains("in-modal-or-overlay");
  };
})();

export class MouseDevice {
  constructor() {
    this.events = [];
    this.coords = [0, 0]; // normalized screenspace coordinates in [(-1, 1), (-1, 1)]
    this.movementXY = [0, 0]; // deltas
    this.buttonLeft = false;
    this.buttonRight = false;
    this.buttonMiddle = false;
    this.wheel = 0; // delta

    // The input system swallows the very first mouse down, since this can often trigger
    // permission popups and such due to activation checks and we don't want to lock cursor.
    this.swallowedFirstMouseDown = false;

    const queueEvent = this.events.push.bind(this.events);
    const canvas = DOM_ROOT.querySelector("canvas");
    this.canvas = canvas;

    canvas.addEventListener("contextmenu", e => {
      if (e.button === 2) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    });
    ["mousedown", "wheel"].map(x => canvas.addEventListener(x, queueEvent, { passive: false }));
    ["mousemove", "mouseup"].map(x => window.addEventListener(x, queueEvent, { passive: false }));
    document.addEventListener("dragover", queueEvent, { passive: false });

    document.addEventListener(
      "wheel",
      e => {
        // Only capture wheel events if canvas is focused
        if (DOM_ROOT.activeElement?.classList.contains("a-canvas")) {
          e.preventDefault();
        }
      },
      { passive: false }
    );
  }

  process(event) {
    if (event.type === "wheel") {
      this.wheel += (event.deltaX + event.deltaY) / modeMod[event.deltaMode];
      return true;
    }

    const left = event.button === 0;
    const middle = event.button === 1;
    const right = event.button === 2;
    const canvasLeft = this.canvas.parentElement.offsetLeft;
    const canvasRight = window.innerWidth - (this.canvas.parentElement.clientWidth + canvasLeft);
    this.coords[0] = ((event.clientX - canvasLeft) / (window.innerWidth - canvasLeft - canvasRight)) * 2 - 1;
    this.coords[1] = -(event.clientY / window.innerHeight) * 2 + 1;
    this.movementXY[0] += event.movementX;
    this.movementXY[1] += event.movementY;
    this.altKey = event.altKey;
    this.ctrlKey = event.ctrlKey;
    this.metaKey = event.metaKey;
    this.shiftKey = event.shiftKey;
    if (event.type === "mousedown" && left) {
      if (this.swallowedFirstMouseDown) {
        this.mouseDownLeftThisFrame = true;
        this.buttonLeft = true;
      } else {
        this.swallowedFirstMouseDown = true;
      }
    } else if (event.type === "mousedown" && right) {
      this.mouseDownRightThisFrame = true;
      this.buttonRight = true;
    } else if (event.type === "mousedown" && middle) {
      this.mouseDownMiddleThisFrame = true;
      this.buttonMiddle = true;
    } else if (event.type === "mouseup" && left) {
      if (this.mouseDownLeftThisFrame) {
        return false;
      }
      this.buttonLeft = false;
    } else if (event.type === "mouseup" && right) {
      if (this.mouseDownRightThisFrame) {
        return false;
      }
      this.buttonRight = false;
    } else if (event.type === "mouseup" && middle) {
      if (this.mouseDownMiddleThisFrame) {
        return false;
      }
      this.buttonMiddle = false;
    }
    return true;
  }

  write(frame) {
    this.movementXY[0] = 0; // deltas
    this.movementXY[1] = 0; // deltas
    this.wheel = 0; // delta

    this.didStopProcessingEarly = false;
    this.mouseDownLeftThisFrame = false;
    this.mouseDownRightThisFrame = false;
    this.mouseDownMiddleThisFrame = false;

    const shouldWriteModifierKeys = this.events.length > 0;

    for (let i = 0; i < this.events.length; i++) {
      const event = this.events[i];
      if (!this.process(event)) {
        this.didStopProcessingEarly = true;
        this.events.splice(0, i);
        break;
      }
    }

    if (shouldWriteModifierKeys) {
      frame.setValueType(paths.device.keyboard.key("control"), this.ctrlKey);
      frame.setValueType(paths.device.keyboard.key("alt"), this.altKey);
      frame.setValueType(paths.device.keyboard.key("meta"), this.metaKey);
      frame.setValueType(paths.device.keyboard.key("shift"), this.shiftKey);
    }

    if (!this.didStopProcessingEarly) {
      this.events.length = 0;
    }

    frame.setVector2(paths.device.mouse.coords, this.coords[0], this.coords[1]);
    frame.setVector2(paths.device.mouse.movementXY, this.movementXY[0], this.movementXY[1]);
    frame.setValueType(paths.device.mouse.buttonLeft, this.buttonLeft);
    frame.setValueType(paths.device.mouse.buttonRight, this.buttonRight);
    frame.setValueType(paths.device.mouse.buttonMiddle, this.buttonMiddle);
    frame.setValueType(paths.device.mouse.wheel, this.wheel);
  }
}

window.oncontextmenu = e => {
  if (!isInModal()) {
    e.preventDefault();
  }
};
