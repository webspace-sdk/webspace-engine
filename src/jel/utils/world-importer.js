import { addMedia } from "../../hubs/utils/media-utils";
import { parse as transformParse } from "transform-parser";
import { ObjectContentOrigins } from "../../hubs/object-types";
import { ensureOwnership } from "./ownership-utils";

const transformUnitToMeters = s => {
  if (!s) return 0.0;

  if (s.endsWith("cm")) {
    return parseFloat(s.replaceAll("cm", "")) / 100.0;
  }

  if (s.endsWith("mm")) {
    return parseFloat(s.replaceAll("mm", "")) / 10000.0;
  }

  return 0.0;
};

const transformUnitToRadians = s => {
  if (!s) return 0.0;

  if (s.endsWith("rad")) {
    return parseFloat(s.replaceAll("rad", ""));
  }

  if (s.endsWith("deg")) {
    return parseFloat(s.replaceAll("deg", "")) * ((2.0 * Math.PI) / 360.0);
  }

  return 0.0;
};

export default class WorldImporter {
  importHtmlToCurrentWorld(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");

    if (doc.body && doc.body.getAttribute("data-jel-format") === "world") {
      this.importJelDocument(doc);
    }
  }

  async importJelDocument(doc, replaceExisting = true) {
    const { terrainSystem } = AFRAME.scenes[0].systems["hubs-systems"];
    const prepareImportPromises = [];

    if (replaceExisting) {
      for (const el of doc.body.childNodes) {
        const id = el.id;
        if (!id || id.length !== 7) continue; // Sanity check
        const existingEl = document.getElementById(`naf-${id}`);

        if (existingEl) {
          // Proceed once the shared component is removed so the id has been freed.
          prepareImportPromises.push(
            new Promise(res => {
              if (!ensureOwnership(existingEl)) res();

              let c = 0;

              const handler = () => {
                c++;

                if (c === Object.keys(existingEl.components).length) {
                  existingEl.removeEventListener("componentremoved", handler);
                  res();
                }
              };

              existingEl.addEventListener("componentremoved", handler);

              existingEl.parentNode.removeChild(existingEl);
            })
          );
        }
      }
    }

    // Terrain system needs to pre-cache all the heightmaps, since this routine
    // will need to globally reference the terrain heights to place the new media properly in Y.
    prepareImportPromises.push(terrainSystem.loadAllHeightMaps());

    await Promise.all(prepareImportPromises);

    for (const el of doc.body.childNodes) {
      const id = el.id;
      if (!id || id.length !== 7) continue; // Sanity check
      if (document.getElementById(`naf-${id}`)) continue;

      const style = `:root { ${el.getAttribute("style") || ""}`;
      const styleEl = doc.createElement("style");
      styleEl.textContent = style;
      doc.body.appendChild(styleEl);

      if (styleEl.sheet.cssRules.length === 0) continue;
      const rule = styleEl.sheet.cssRules[0];
      const { fontFamily, transform /*, color, width, height, backgroundColor, textStroke*/ } = rule.style;

      const contentSubtype = null;
      const tagName = el.tagName;
      const mediaOptions = {};

      let src = null;
      let contents = null;

      if (tagName === "DIV" && fontFamily === "emoji") {
        // Voxmoji
        contents = el.innerHTML.trim();
      } else if (tagName === "IMG") {
        // Image
        src = el.getAttribute("src");
      } else if (tagName === "EMBED" && el.getAttribute("data-index") !== null) {
        // PDF
        src = el.getAttribute("src");
        mediaOptions.index = el.getAttribute("data-index");
      } else if (tagName === "EMBED") {
        // VOX or glTF
        src = el.getAttribute("src");
      } else if (tagName === "VIDEO") {
        src = el.getAttribute("src");

        if (el.getAttribute("currenttime") !== null) {
          mediaOptions.time = el.getAttribute("currenttime");
        }

        mediaOptions.videoPaused = el.getAttribute("autoplay") === null;
        mediaOptions.loop = el.getAttribute("loop") !== null;

        if (el.getAttribute("muted") !== null) {
          mediaOptions.volume = 0;
        }

        if (el.getAttribute("data-audio-src") !== null) {
          mediaOptions.audioSrc = el.getAttribute("data-audio-src");
        }
      }

      const entity = addMedia(
        src,
        contents,
        "#interactable-media",
        ObjectContentOrigins.URL,
        contentSubtype,
        false,
        false,
        false,
        mediaOptions,
        true,
        null,
        null,
        id
      ).entity;

      const object3D = entity.object3D;

      if (transform) {
        const { translate3d, rotate3d, scale3d } = transformParse(transform);
        const pos = new THREE.Vector3(0, 0, 0);
        const rot = new THREE.Quaternion(0, 0, 0, 1);
        const scale = new THREE.Vector3(1, 1, 1);

        if (translate3d) {
          const x = transformUnitToMeters(translate3d[0]);
          const z = transformUnitToMeters(translate3d[2]);
          const height = terrainSystem.getTerrainHeightAtWorldCoord(x, z);
          const y = transformUnitToMeters(translate3d[1]) + height;
          pos.set(x, y, z);
        }

        if (rotate3d) {
          const rx = parseFloat(rotate3d[0]);
          const ry = parseFloat(rotate3d[1]);
          const rz = parseFloat(rotate3d[2]);
          const rr = transformUnitToRadians(rotate3d[3]);
          rot.setFromAxisAngle(new THREE.Vector3(rx, ry, rz), rr);
        }

        if (scale3d) {
          const x = scale3d[0];
          const y = scale3d[1];
          const z = scale3d[2];
          scale.set(x, y, z);
        }

        const matrix = new THREE.Matrix4();
        matrix.compose(
          pos,
          rot,
          scale
        );

        entity.addEventListener(
          "media-loaded",
          () => {
            object3D.applyMatrix(matrix);
          },
          { once: true }
        );
      }

      doc.body.removeChild(styleEl);
    }
  }
}

window.WorldImporter = WorldImporter;
