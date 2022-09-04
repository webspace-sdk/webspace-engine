import { addMedia } from "../../hubs/utils/media-utils";
import { parse as transformParse } from "transform-parser";
import { ObjectContentOrigins } from "../../hubs/object-types";
import { ensureOwnership } from "./ownership-utils";
import { WORLD_COLOR_TYPES } from "../../hubs/constants";
import { FONT_FACES } from "./quill-utils";
import { CHUNK_WORLD_SIZE } from "../systems/terrain-system";
import { getHubIdFromHistory } from "./jel-url-utils";

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
  importHtmlToCurrentWorld(html, replaceExisting = true, removeEntitiesNotInTemplate = false) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return this.importJelDocument(doc, replaceExisting, removeEntitiesNotInTemplate);
  }

  removeEntitiesFromHtmlFromCurrentWorld(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return this.removeEntitiesFromJelDocument(doc);
  }

  async applyWorldMetadataFromHtml(html) {
    const { hubChannel } = window.APP;
    const hubId = await getHubIdFromHistory();

    const [
      worldType,
      worldSeed,
      worldColors,
      spawnPosition,
      spawnRotation,
      spawnRadius
    ] = this.getWorldMetadataFromHtml(html);

    const toRgb = type => {
      return {
        r: parseFloat(worldColors[`${type}_color_r`]),
        g: parseFloat(worldColors[`${type}_color_g`]),
        b: parseFloat(worldColors[`${type}_color_b`])
      };
    };

    SYSTEMS.terrainSystem.updateWorldColors(...WORLD_COLOR_TYPES.map(toRgb));
    SYSTEMS.atmosphereSystem.updateWaterColor(toRgb("water"));
    SYSTEMS.atmosphereSystem.updateSkyColor(toRgb("sky"));

    const hubWorldColors = {};
    for (const [k, v] of Object.entries(worldColors)) {
      hubWorldColors[`world_${k}`] = parseFloat(v);
    }

    hubChannel.updateHubMeta(hubId, {
      ...hubWorldColors,
      world_type: worldType,
      world_seed: worldSeed,
      spawn_position_x: spawnPosition.x,
      spawn_position_y: spawnPosition.y,
      spawn_position_z: spawnPosition.z,
      spawn_rotation_x: spawnRotation.x,
      spawn_rotation_y: spawnRotation.y,
      spawn_rotation_z: spawnRotation.z,
      spawn_rotation_w: spawnRotation.w,
      spawn_radius: spawnRadius
    });
  }

  getWorldMetadataFromHtml(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");

    if (doc.body && doc.querySelector(`meta[name='jel-schema']`)) {
      const getMeta = key => {
        const el = doc.querySelector(`meta[name='${key}']`);

        if (el) {
          return el.getAttribute("content");
        } else {
          return null;
        }
      };

      let spawnPosition = null,
        spawnRotation = null,
        spawnRadius = null;

      const worldType = getMeta("jel-world-type");
      const worldSeed = getMeta("jel-world-seed");
      let worldColors = {};

      WORLD_COLOR_TYPES.forEach(type => {
        const r = getMeta(`jel-world-${type}-color-r`);
        const g = getMeta(`jel-world-${type}-color-g`);
        const b = getMeta(`jel-world-${type}-color-b`);

        if (r !== null && g !== null && b !== null) {
          worldColors[`${type}_color_r`] = r;
          worldColors[`${type}_color_g`] = g;
          worldColors[`${type}_color_b`] = b;
        }
      });

      if ([...Object.keys(worldColors)].length === 0) {
        // No colors in meta tags, so don't return any which will cause a preset to be used.
        worldColors = null;
      }

      const px = getMeta("jel-spawn-position-x");
      const py = getMeta("jel-spawn-position-y");
      const pz = getMeta("jel-spawn-position-z");

      const rx = getMeta("jel-spawn-rotation-x");
      const ry = getMeta("jel-spawn-rotation-y");
      const rz = getMeta("jel-spawn-rotation-z");
      const rw = getMeta("jel-spawn-rotation-w");

      const rad = getMeta("jel-spawn-radius");

      if (px !== null && py !== null && pz !== null) {
        spawnPosition = new THREE.Vector3(parseFloat(px), parseFloat(py), parseFloat(pz));
      }

      if (rx !== null && ry !== null && rz !== null && rw !== null) {
        spawnRotation = new THREE.Quaternion(parseFloat(rx), parseFloat(ry), parseFloat(rz), parseFloat(rw));
      }

      if (rad !== null) {
        spawnRadius = parseFloat(rad);
      }

      return [worldType, worldSeed, worldColors, spawnPosition, spawnRotation, spawnRadius];
    }

    return [null, null, null, null, null];
  }

  async removeEntitiesFromJelDocument(doc) {
    const promises = [];

    for (const el of doc.body.childNodes) {
      const id = el.id;
      if (!id || id.length !== 7) continue; // Sanity check

      const existingEl = DOM_ROOT.getElementById(`naf-${id}`);

      if (existingEl) {
        // Proceed once the shared component is removed so the id has been freed.
        promises.push(
          new Promise(res => {
            if (!ensureOwnership(existingEl)) res();

            existingEl.components.networked.whenInstantiated(() => {
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
            });
          })
        );
      }
    }

    await Promise.all(promises);
  }

  async importJelDocument(doc, replaceExisting = true, removeEntitiesNotInTemplate = false) {
    const { terrainSystem, autoQualitySystem } = AFRAME.scenes[0].systems["hubs-systems"];
    autoQualitySystem.stopTracking();

    if (replaceExisting) {
      await this.removeEntitiesFromJelDocument(doc);
    }

    const docEntityIds = new Set();

    for (const el of doc.body.childNodes) {
      const id = el.id;
      if (!id || id.length !== 7) continue; // Sanity check
      docEntityIds.add(`naf-${id}`);
    }

    if (removeEntitiesNotInTemplate) {
      const toRemove = [...(DOM_ROOT.querySelectorAll("[shared]") || [])].filter(
        el => !docEntityIds.has(el.getAttribute("id"))
      );

      for (const el of toRemove) {
        el.components.networked.whenInstantiated(() => {
          if (el.components["media-loader"]) {
            el.parentNode.removeChild(el);
          }
        });
      }
    }

    const getStyle = el => {
      const style = `:root { ${el.getAttribute("style") || ""}`;
      const styleEl = doc.createElement("style");
      styleEl.textContent = style;
      doc.body.appendChild(styleEl);

      if (styleEl.sheet.cssRules.length === 0) return null;
      const rule = styleEl.sheet.cssRules[0];
      const ret = rule.style;
      styleEl.remove();
      return ret;
    };

    // Terrain system needs to pre-cache all the heightmaps, since this routine
    // will need to globally reference the terrain heights to place the new media properly in Y.

    for (const el of doc.body.childNodes) {
      const id = el.id;
      if (!id || id.length !== 7) continue; // Sanity check
      if (DOM_ROOT.getElementById(`naf-${id}`)) continue;

      const style = getStyle(el);
      if (!style || !style.transform) continue;
      const { translate3d } = transformParse(style.transform);
      const x = transformUnitToMeters(translate3d[0]);
      const z = transformUnitToMeters(translate3d[2]);
      await terrainSystem.loadHeightMapAtWorldCoord(x, z);
    }

    let pendingCount = 0;

    for (const el of doc.body.childNodes) {
      const id = el.id;
      if (!id || id.length !== 7) continue; // Sanity check
      if (DOM_ROOT.getElementById(`naf-${id}`)) continue;

      const style = getStyle(el);
      if (!style) continue;
      const { fontFamily, transform, color, width, height, backgroundColor, textStroke } = style;

      let contentSubtype = null;
      const tagName = el.tagName;
      const mediaOptions = {};

      let src = null;
      let contents = null;
      let resolve = false;
      const type = el.getAttribute("type");

      if (tagName === "DIV" && fontFamily === "emoji") {
        // Voxmoji
        contents = el.innerHTML.trim();
      } else if (tagName === "IMG") {
        // Image
        src = el.getAttribute("src");
      } else if (tagName === "A") {
        // Link
        src = el.getAttribute("href");
        resolve = true;
      } else if (tagName === "EMBED" && el.getAttribute("data-index") !== null) {
        // PDF
        src = el.getAttribute("src");
        mediaOptions.index = el.getAttribute("data-index");
      } else if (tagName === "MODEL") {
        // VOX or glTF
        src = el.getAttribute("src");
        resolve = true;
      } else if (tagName === "VIDEO") {
        // Video
        src = el.getAttribute("src");
        resolve = true;

        if (el.getAttribute("currenttime") !== null) {
          mediaOptions.time = el.getAttribute("currenttime");
        }

        const autoplayAttr = el.getAttribute("autoplay");

        // autoplay="hover" will enable play-on-hover
        mediaOptions.videoPaused = autoplayAttr === null || autoplayAttr === "hover";
        mediaOptions.playOnHover = autoplayAttr === "hover";
        mediaOptions.loop = el.getAttribute("loop") !== null;

        if (el.getAttribute("muted") !== null) {
          mediaOptions.volume = 0;
        }

        if (el.getAttribute("data-audio-src") !== null) {
          mediaOptions.audioSrc = el.getAttribute("data-audio-src");
        }
      } else if (tagName === "DIV") {
        // Text
        contents = el.innerHTML;
        let font = FONT_FACES.SANS_SERIF;
        let fitContent = false;
        let mediaForegroundColor = null;
        let mediaBackgroundColor = null;

        contentSubtype = "page";

        if (width === "min-content" && height === "min-content") {
          contentSubtype = backgroundColor === "transparent" ? "banner" : "label";
          fitContent = true;
        }

        if (contentSubtype == "banner") {
          if (textStroke) {
            const textStrokeParsed = transformParse(textStroke);

            if (textStrokeParsed.rgb) {
              mediaBackgroundColor = {
                x: textStrokeParsed.rgb[0] / 255.0,
                y: textStrokeParsed.rgb[1] / 255.0,
                z: textStrokeParsed.rgb[2] / 255.0
              };
            }
          }
        } else {
          if (backgroundColor) {
            const backgroundParsed = transformParse(backgroundColor);

            if (backgroundParsed.rgb) {
              mediaBackgroundColor = {
                x: backgroundParsed.rgb[0] / 255.0,
                y: backgroundParsed.rgb[1] / 255.0,
                z: backgroundParsed.rgb[2] / 255.0
              };
            }
          }
        }

        if (color) {
          const colorParsed = transformParse(color);

          if (colorParsed.rgb) {
            mediaForegroundColor = {
              x: colorParsed.rgb[0] / 255.0,
              y: colorParsed.rgb[1] / 255.0,
              z: colorParsed.rgb[2] / 255.0
            };
          }
        }

        switch (fontFamily) {
          case "serif":
            font = FONT_FACES.SERIF;
            break;
          case "monospaced":
            font = FONT_FACES.MONO;
            break;
          case "fantasy":
            font = FONT_FACES.COMIC;
            break;
          case "ui-rounded":
            font = FONT_FACES.COMIC2;
            break;
          case "cursive":
            font = FONT_FACES.WRITING;
            break;
        }

        mediaOptions.font = font;
        mediaOptions.fitContent = fitContent;
        mediaOptions.foregroundColor = mediaForegroundColor;
        mediaOptions.backgroundColor = mediaBackgroundColor;
      }

      const isLocked = el.getAttribute("draggable") === null;

      const entity = addMedia(
        src,
        contents,
        "#interactable-media",
        ObjectContentOrigins.URL,
        contentSubtype,
        resolve,
        false,
        false,
        mediaOptions,
        true,
        null,
        null,
        id,
        true,
        type,
        isLocked
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

        pendingCount++;

        entity.addEventListener(
          "media-view-added",
          () => {
            object3D.applyMatrix(matrix);
            pendingCount--;
          },
          { once: true }
        );

        entity.addEventListener(
          "media-loader-failed",
          () => {
            pendingCount--;
          },
          { once: true }
        );
      }
    }

    // Wait until all new media is loaded before we begin tracking
    // framerate again.
    const interval = setInterval(() => {
      if (pendingCount === 0) {
        clearInterval(interval);

        // Hacky, other place where tracking is stopped is in jel.js
        // when doucment is blurred.
        if (!document.body.classList.contains("paused")) {
          autoQualitySystem.startTracking();
        }
      }
    }, 1000);
  }
}
