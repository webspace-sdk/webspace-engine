import avatarStill from "../../assets/jel/images/avatar/avatar-still.svgi";
import { objRgbToCssRgb } from "./dom-utils";

const canvas = document.createElement("canvas");
const width = 512;
const height = 512;
canvas.width = width;
canvas.height = height;

export function renderAvatarToPng(primaryR, primaryG, primaryB) {
  const el = document.createElement("div");
  el.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  el.setAttribute("style", "width: 512px; height: 512px; color: red;");
  const context = canvas.getContext("2d");

  return new Promise(resolve => {
    const img = new Image();

    const fillColor = objRgbToCssRgb({ r: primaryR, g: primaryG, b: primaryB });
    const svg = encodeURIComponent(
      avatarStill
        // Work around firefox bug with svgs
        // https://stackoverflow.com/questions/28690643/firefox-error-rendering-an-svg-image-to-html5-canvas-with-drawimage
        .replace("<svg", `<svg width="${width}px" height="${height}px"`)
        .replaceAll("currentColor", fillColor)
    );

    img.onload = () => {
      context.clearRect(0, 0, width, height);
      context.drawImage(img, 0, 0);
      img.onload = null;
      img.src = "";
      canvas.toBlob(blob => resolve([blob, width, height]));
    };

    img.src = "data:image/svg+xml," + svg;
    img.width = width;
    img.height = height;
  });
}
