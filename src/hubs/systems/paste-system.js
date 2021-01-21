import { ObjectContentOrigins } from "../object-types";
import { paths } from "./userinput/paths";
import { spawnMediaInfrontOfPlayer } from "../utils/media-utils";

export class PasteSystem {
  constructor(sceneEl) {
    this.sceneEl = sceneEl;
    this.pendingPastes = [];
    this.lastMiddleClick = 0;
  }

  enqueuePaste({ target, clipboardData }) {
    if (
      target &&
      (target.matches("input, textarea") || target.contentEditable === "true") &&
      document.activeElement === target
    )
      return;

    // Quill editor
    if (document.activeElement && document.activeElement.classList.contains("ql-clipboard")) return;

    const html = clipboardData.getData("text/html");
    const text = clipboardData.getData("text/plain");
    const files = clipboardData.files && [...clipboardData.files];
    this.pendingPastes.push({ html, text, files });
  }

  tick(t) {
    const isMiddleClick = AFRAME.scenes[0].systems.userinput.get(paths.device.mouse.buttonMiddle);
    if (isMiddleClick) {
      this.lastMiddleClick = t;
    }

    if (this.pendingPastes.length === 0) return;
    const { html, text, files } = this.pendingPastes.pop();

    // Ignore middle click because of emoji launcher binding
    if (this.lastMiddleClick && t - this.lastMiddleClick < 1000) return;

    // Never paste into scene if dialog is open
    const uiRoot = document.querySelector(".ui-root");
    if (uiRoot && uiRoot.classList.contains("in-modal-or-overlay")) return;

    // Check if data or http url
    const url =
      text &&
      (text
        .substring(0, 4)
        .toLowerCase()
        .startsWith("http") ||
        text
          .substring(0, 5)
          .toLowerCase()
          .startsWith("data:"))
        ? text
        : null;
    const contents = (!url && (html || text)) || null;

    if (files && files.length > 0) {
      for (const file of files) {
        spawnMediaInfrontOfPlayer(file, null, ObjectContentOrigins.CLIPBOARD);
      }
    } else if (url) {
      spawnMediaInfrontOfPlayer(url, null, ObjectContentOrigins.URL);
    } else if (contents) {
      spawnMediaInfrontOfPlayer(null, contents, ObjectContentOrigins.CLIPBOARD);
    }
  }
}
