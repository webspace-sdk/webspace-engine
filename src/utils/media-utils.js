import { objectTypeForOriginAndContentType, ObjectContentOrigins } from "../object-types";
import { hackyMobileSafariTest } from "./detect-touchscreen";
import mediaHighlightFrag from "./media-highlight-frag.glsl";
import { mapMaterials } from "./material-utils";
import HubsTextureLoader from "../loaders/HubsTextureLoader";
import { validMaterials } from "../components/hoverable-visuals";
import { offsetRelativeTo } from "../components/offset-relative-to";
import { getCorsProxyUrl, guessContentType, isAllowedCorsProxyContentType } from "./media-url-utils";
import { getNetworkedEntity, getNetworkId, ensureOwnership, isSynchronized } from "./ownership-utils";
import { assetFileNameForName } from "./jel-url-utils";
import { addVertexCurvingToShader } from "../systems/terrain-system";
import { SOUND_MEDIA_REMOVED } from "../systems/sound-effects-system";
import { expandByEntityObjectSpaceBoundingBox } from "./three-utils";
import { stackTargetAt, NON_FLAT_STACK_AXES } from "../systems/transform-selected-object";
import nextTick from "./next-tick";
import anime from "animejs";
import basisTranscoderUrl from "!!url-loader!three/examples/js/libs/basis/basis_transcoder.js";
import basisTranscoderWasmUrl from "!!url-loader!three/examples/js/libs/basis/basis_transcoder.wasm";
import { BasisTextureLoader } from "three/examples/jsm/loaders/BasisTextureLoader";
import { modelFromString, modelToString } from "./vox-utils";
import { voxToSvox } from "smoothvoxels";
// We use the legacy 'text' regex since it matches some items like beach_umbrella
// and thermometer which seem to not work with the default/standard regex
import createEmojiRegex from "emoji-regex/text.js";

import Linkify from "linkify-it";
import tlds from "tlds";

export const BasisLoadingManager = new THREE.LoadingManager();

BasisLoadingManager.setURLModifier(url => {
  if (url === "basis_transcoder.js") return basisTranscoderUrl;
  if (url === "basis_transcoder.wasm") return basisTranscoderWasmUrl;
  return url;
});

const emojiRegex = createEmojiRegex();

export const MEDIA_INTERACTION_TYPES = {
  PRIMARY: 0,
  NEXT: 1,
  BACK: 2,
  SNAPSHOT: 3,
  UP: 4,
  DOWN: 5,
  ROTATE: 6,
  SCALE: 7,
  TRANSFORM_RELEASE: 8,
  REMOVE: 9,
  CLONE: 10,
  EDIT: 11,
  OPEN: 12,
  SLIDE: 13,
  LIFT: 14,
  STACK: 15,
  TOGGLE_LOCK: 16,
  RESET: 17
};

export const LOCKED_MEDIA_DISALLOWED_INTERACTIONS = [
  MEDIA_INTERACTION_TYPES.ROTATE,
  MEDIA_INTERACTION_TYPES.SCALE,
  MEDIA_INTERACTION_TYPES.TRANSFORM_RELEASE,
  MEDIA_INTERACTION_TYPES.REMOVE,
  MEDIA_INTERACTION_TYPES.EDIT,
  MEDIA_INTERACTION_TYPES.SLIDE,
  MEDIA_INTERACTION_TYPES.LIFT,
  MEDIA_INTERACTION_TYPES.STACK,
  MEDIA_INTERACTION_TYPES.RESET
];

export const LOADING_EVENTS = ["model-loading", "image-loading", "text-loading", "pdf-loading"];
export const LOADED_EVENTS = ["model-loaded", "image-loaded", "text-loaded", "pdf-loaded"];
export const ERROR_EVENTS = ["model-error", "image-error", "text-error", "pdf-error"];
export const MEDIA_VIEW_COMPONENTS = [
  "media-video",
  "media-image",
  "media-text",
  "media-vox",
  "media-pdf",
  "media-emoji",
  "media-canvas",
  "gltf-model-plus"
];

export const PAGABLE_MEDIA_VIEW_COMPONENTS = ["media-video", "media-pdf"];
// Components supporting Q/E next and prev interactions
export const NEXT_PREV_MEDIA_VIEW_COMPONENTS = ["media-video", "media-pdf", "media-text", "media-video"];
export const BAKABLE_MEDIA_VIEW_COMPONENTS = ["media-video", "media-text", "media-pdf", "media-canvas", "media-vox"];
export const FLAT_MEDIA_VIEW_COMPONENTS = [
  "media-video",
  "media-text",
  "media-pdf",
  "media-canvas",
  "media-image",
  "media-emoji"
];

export const RESETABLE_MEDIA_VIEW_COMPONENTS = [
  "gltf-model-plus",
  "media-vox",
  "media-image",
  "media-pdf",
  "media-emoji"
];

export const ORBIT_ON_INSPECT_MEDIA_VIEW_COMPONENTS = ["gltf-model-plus", "media-vox", "media-emoji"];

export const shouldOrbitOnInspect = function(obj) {
  for (const component of ORBIT_ON_INSPECT_MEDIA_VIEW_COMPONENTS) {
    if (obj.el.components[component]) return true;
  }

  return false;
};

export const isFlatMedia = function(obj) {
  for (const component of FLAT_MEDIA_VIEW_COMPONENTS) {
    if (obj.el.components[component]) return true;
  }

  return false;
};

const linkify = Linkify();
linkify.tlds(tlds);

const isMobile = AFRAME.utils.device.isMobile();
const isMobileVR = AFRAME.utils.device.isMobile();

// Map<String, Promise<Object>
const preflightUrlCache = new Map();
export const getDefaultResolveQuality = (is360 = false) => {
  const useLowerQuality = isMobile || isMobileVR;
  return !is360 ? (useLowerQuality ? "low" : "high") : useLowerQuality ? "low_360" : "high_360";
};

const runYtdl = (function() {
  let ytdl = null;
  let db;
  const req = indexedDB.open("ytdl", 1);

  const openPromise = new Promise(res => {
    req.addEventListener("success", ({ target: { result } }) => {
      db = result;
      res();
    });

    req.addEventListener("upgradeneeded", ({ target: { result: db } }) => {
      db.createObjectStore("results", { keyPath: "url" });
    });
  });

  return async (url, quality) => {
    await openPromise;
    const now = Date.now();

    let resolvedYtdl = false;
    let expiresAt = now + 24 * 60 * 60 * 1000;
    let contentUrl = null;
    let contentType = null;
    let accessibleContentUrl = null;
    let accessibleContentAudioUrl = null;

    const txn = db
      .transaction("results")
      .objectStore("results")
      .get(url);

    const { target } = await new Promise(res => txn.addEventListener("success", res));

    if (target.result) {
      if (target.result.expires_at > now - 60 * 60 * 1000) {
        return target.result.result;
      }
    }

    if (!ytdl) {
      const ytdlUrl = "https://cdn.jsdelivr.net/npm/ytdl-browser@latest/dist/ytdl.min.js";
      const scriptEl = document.createElement("script");
      scriptEl.setAttribute("type", "text/javascript");
      scriptEl.setAttribute("src", ytdlUrl);
      const waitForScript = new Promise(res => scriptEl.addEventListener("load", res));
      DOM_ROOT.append(scriptEl);
      await waitForScript;

      try {
        ytdl = window.require("ytdl-core-browser")({
          proxyUrl: getCorsProxyUrl() + "/"
        });
      } catch (e) {
        console.log("error loading ytdl", e);
      }
    }

    if (ytdl) {
      try {
        const ytdlInfo = await ytdl.getInfo(url);
        let chosenFormatVideo = null;
        let maxHeight = 720;

        switch (quality) {
          case "low":
            maxHeight = 480;
            break;
          case "low_360":
            maxHeight = 1440;
            break;
          case "high_360":
            maxHeight = 2160;
            break;
          default:
        }

        const supportsWebM = !hackyMobileSafariTest();

        for (const format of ytdlInfo.formats) {
          if (format.container !== (supportsWebM ? "webm" : "mp4")) continue;
          if (format.height > maxHeight) continue;
          if (format.codecs.indexOf("vp9") === -1) continue; // TODO check codecs

          if (!chosenFormatVideo || chosenFormatVideo.height < format.height) {
            chosenFormatVideo = format;
          }
        }

        if (chosenFormatVideo) {
          const parsedVideoUrl = new URL(chosenFormatVideo.url);
          const parsedVideoParams = new URLSearchParams(parsedVideoUrl.search);

          if (parsedVideoParams.get("expire")) {
            try {
              const videoExpires = parseInt(parsedVideoParams.get("expire")) * 1000;
              if (expiresAt > videoExpires) {
                expiresAt = videoExpires;
              }
            } catch(e) {  } // eslint-disable-line
          }

          if (chosenFormatVideo.audioBitrate === null) {
            let chosenFormatAudio = null;

            for (const format of ytdlInfo.formats) {
              if (format.audioCodec !== "opus") continue;
              if (format.hasVideo) continue;

              if (!chosenFormatAudio || chosenFormatAudio.audioSampleRate < format.audioSampleRate) {
                chosenFormatAudio = format;
              }
            }

            if (chosenFormatAudio) {
              const parsedAudioUrl = new URL(chosenFormatAudio.url);
              const parsedAudioParams = new URLSearchParams(parsedAudioUrl.search);

              if (parsedAudioParams.get("expire")) {
                try {
                  const audioExpires = parseInt(parsedAudioParams.get("expire")) * 1000;
                  if (expiresAt > audioExpires) {
                    expiresAt = audioExpires;
                  }
              } catch(e) {  } // eslint-disable-line
              }

              resolvedYtdl = true;
              contentUrl = chosenFormatVideo.url;
              accessibleContentUrl = `${getCorsProxyUrl()}/${contentUrl}`;
              contentType = chosenFormatVideo.mimeType.split(";")[0];
              accessibleContentAudioUrl = `${getCorsProxyUrl()}/${chosenFormatAudio.url}`;
            }
          } else {
            resolvedYtdl = true;
            contentUrl = chosenFormatVideo.url;
            accessibleContentUrl = `${getCorsProxyUrl()}/${contentUrl}`;
            contentType = chosenFormatVideo.mimeType.split(";")[0];
          }
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (resolvedYtdl) {
      const result = { contentUrl, accessibleContentUrl, contentType, accessibleContentAudioUrl };

      db.transaction("results", "readwrite")
        .objectStore("results")
        .put({ url, result, expires_at: expiresAt });

      return result;
    } else {
      return null;
    }
  };
})();

export const preflightUrl = async (parsedUrl, quality = "high", forceLink = false) => {
  const url = parsedUrl.toString();

  if (parsedUrl.origin === document.location.origin) {
    // No need to proxy, file extensions should be set
    return {
      contentType: guessContentType(url),
      contentUrl: url,
      accessibleContentUrl: url
    };
  }

  let metaJson;

  if (preflightUrlCache.has(url)) {
    metaJson = preflightUrlCache.get(url);
  } else {
    metaJson = await (await fetch(`${window.APP.workerUrl}/meta/${url}`)).json();
  }

  preflightUrlCache.set(url, metaJson);

  // Fetch metadata for URL from worker
  const { get_allowed: getAllowed } = metaJson;

  // Return
  // the content type
  // the content url (unproxed)
  // the accessible url (potentially proxied)

  let contentUrl = url;
  let contentType = metaJson.content_type;
  let accessibleContentUrl = contentUrl;
  let accessibleContentAudioUrl = contentUrl;

  if ((contentType && contentType.startsWith("text/html")) || forceLink) {
    if (!forceLink && (parsedUrl.origin.endsWith("youtube.com") || parsedUrl.origin.endsWith("youtu.be"))) {
      if (isAllowedCorsProxyContentType("video/mp4")) {
        const ytdlResult = await runYtdl(url, quality);

        if (ytdlResult) {
          contentUrl = ytdlResult.contentUrl;
          accessibleContentUrl = ytdlResult.accessibleContentUrl;
          accessibleContentAudioUrl = ytdlResult.accessibleContentAudioUrl;
          contentType = ytdlResult.contentType;
        } else {
          contentUrl = accessibleContentUrl = `${window.APP.workerUrl}/thumbnail/${contentUrl}`;
        }
      } else {
        console.warn(
          'To play YouTube videos, you need to configure a self hosted CORS Anywhere server by adding a meta tag like <met a name="webspace.networking.cors_anywhere_url" content="https://mycorsanywhere.com">. See: https://github.com/Rob--W/cors-anywhere'
        );

        contentUrl = accessibleContentUrl = `${window.APP.workerUrl}/thumbnail/${contentUrl}`;
      }
    } else {
      // Generate a thumbnail for websites
      contentUrl = accessibleContentUrl = `${window.APP.workerUrl}/thumbnail/${contentUrl}`;
    }
  } else if ((!contentType || isAllowedCorsProxyContentType(contentType)) && !getAllowed) {
    accessibleContentUrl = `${getCorsProxyUrl()}/${contentUrl}`;
  }

  return { contentType, contentUrl, accessibleContentUrl, accessibleContentAudioUrl };
};

// https://stackoverflow.com/questions/7584794/accessing-jpeg-exif-rotation-data-in-javascript-on-the-client-side/32490603#32490603
function getOrientation(file, callback) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const view = new DataView(e.target.result);
    if (view.getUint16(0, false) != 0xffd8) {
      return callback(-2);
    }
    const length = view.byteLength;
    let offset = 2;
    while (offset < length) {
      if (view.getUint16(offset + 2, false) <= 8) return callback(-1);
      const marker = view.getUint16(offset, false);
      offset += 2;
      if (marker == 0xffe1) {
        if (view.getUint32((offset += 2), false) != 0x45786966) {
          return callback(-1);
        }

        const little = view.getUint16((offset += 6), false) == 0x4949;
        offset += view.getUint32(offset + 4, little);
        const tags = view.getUint16(offset, little);
        offset += 2;
        for (let i = 0; i < tags; i++) {
          if (view.getUint16(offset + i * 12, little) == 0x0112) {
            return callback(view.getUint16(offset + i * 12 + 8, little));
          }
        }
      } else if ((marker & 0xff00) != 0xff00) {
        break;
      } else {
        offset += view.getUint16(offset, false);
      }
    }
    return callback(-1);
  };
  reader.readAsArrayBuffer(file);
}

function getLatestMediaVersionOfSrc(src) {
  const els = DOM_ROOT.querySelectorAll("[media-loader]");
  let version = 1;

  for (const el of els) {
    const loader = el.components["media-loader"];

    if (loader.data && loader.data.src === src) {
      version = Math.max(version, loader.data.version);
    }
  }

  return version;
}

export function coerceToUrl(urlOrText) {
  if (!linkify.test(urlOrText)) return urlOrText;

  // See: https://github.com/Soapbox/linkifyjs/blob/master/src/linkify.js#L52
  return urlOrText.indexOf("://") >= 0 ? urlOrText : `https://${urlOrText}`;
}

// Adds media. this function signature is out of control and should be refactored to take an object.
export const addMedia = options => {
  const defaults = {
    src: null,
    contents: null,
    contentOrigin: null,
    contentSubtype: null,
    template: "#interactable-media",
    fitToBox: false,
    animate: true,
    mediaOptions: {},
    networked: true,
    networkedOwner: "",
    parentEl: null,
    linkedEl: null,
    networkId: null,
    skipLoader: false,
    contentType: null,
    locked: false,
    stackAxis: 0,
    stackSnapPosition: false,
    stackSnapScale: false,
    retryFetchFromSameOrigin: true
  };

  const {
    template,
    contentOrigin,
    contentSubtype,
    fitToBox,
    animate,
    mediaOptions,
    networked,
    networkedOwner,
    parentEl,
    linkedEl,
    networkId,
    skipLoader,
    contentType,
    locked,
    stackAxis,
    stackSnapPosition,
    stackSnapScale,
    retryFetchFromSameOrigin
  } = { ...defaults, ...options };

  let { src, contents } = { ...defaults, ...options };

  const scene = AFRAME.scenes[0];

  const entity = document.createElement("a-entity");
  const isVideoShare = src instanceof MediaStream;
  const persistent = !isVideoShare;

  if (networked) {
    const networkAttributes = { template, networkId, persistent };
    if (networkedOwner) {
      networkAttributes.owner = networkedOwner;
    }

    entity.setAttribute("networked", networkAttributes);
  } else {
    const templateBody = document
      .importNode(DOM_ROOT.querySelector(template).content, true)
      .firstElementChild.cloneNode(true);
    const elAttrs = templateBody.attributes;

    // Merge root element attributes with this entity
    for (let attrIdx = 0; attrIdx < elAttrs.length; attrIdx++) {
      entity.setAttribute(elAttrs[attrIdx].name, elAttrs[attrIdx].value);
    }

    // Append all child elements
    while (templateBody.firstElementChild) {
      entity.appendChild(templateBody.firstElementChild);
    }
  }

  let needsToBeUploaded = src instanceof File;
  let uploadAsFilename = null;

  // If we're re-pasting an existing src in the scene, we should use the latest version
  // seen across any other entities. Otherwise, start with version 1.
  const version = getLatestMediaVersionOfSrc(src);

  let isEmoji = false;

  // Check for VOX. If it's a vox, convert it to SVOX
  if (src instanceof File && src.name.toLowerCase().endsWith(".vox")) {
    // TODO need to use ranodm filename
    uploadAsFilename = src.name.replace(/\.vox$/i, ".svox");

    // uploadAsset can take a promise
    src = src.arrayBuffer().then(buffer => {
      const svox = voxToSvox(buffer);
      const svoxString = modelToString(svox).replace(
        "material",
        "material type = toon, lighting = smooth, deform = 1 1"
      );
      return new Blob([svoxString], { type: "model/vnd.svox" });
    });

    needsToBeUploaded = true;
  }

  if (contents) {
    const trimmed = contents.trim();
    const match = trimmed.match(emojiRegex);
    isEmoji = match && match[0] === trimmed;

    // Special case, detect svox if there's a line that starts with "size", and a line that contains the string "vxoels
    const lines = trimmed.split("\n");
    const isSvox = lines.find(line => line.startsWith("size ")) && lines.find(line => line.trim() === "voxels");
    if (isSvox) {
      const model = modelFromString(contents, true /* skip voxels */);

      if (model.name) {
        uploadAsFilename = assetFileNameForName(model.name, "svox");
      }

      needsToBeUploaded = true;
      contents = null;

      // Set src to be a new Blob with the contents of the svox file
      src = new Blob([trimmed], { type: "model/vnd.svox" });
    }
  }

  const createdAt = Math.floor(NAF.connection.getServerTime() / 1000);

  entity.setAttribute("media-loader", {
    fitToBox,
    animate,
    src: typeof src === "string" && contents === null ? coerceToUrl(src) || src : "",
    initialContents: contents != null ? contents : null,
    addedLocally: true,
    createdAt,
    skipLoader,
    version,
    contentSubtype,
    linkedEl,
    mediaOptions,
    contentType,
    locked,
    stackAxis,
    stackSnapPosition,
    stackSnapScale,
    retryFetchFromSameOrigin
  });

  if (contents && !isEmoji) {
    window.APP.store.handleActivityFlag("mediaTextCreate");
  }

  entity.object3D.matrixNeedsUpdate = true;

  (parentEl || scene).appendChild(entity);

  const orientation = new Promise(function(resolve) {
    if (needsToBeUploaded && src instanceof File) {
      getOrientation(src, x => {
        resolve(x);
      });
    } else {
      resolve(1);
    }
  });
  if (needsToBeUploaded) {
    window.APP.atomAccessManager
      .uploadAsset(src, uploadAsFilename)
      .then(({ url, contentType }) => {
        entity.setAttribute("media-loader", { src: url, contentType });
      })
      .catch(e => {
        console.error("Media upload failed", e);
        entity.setAttribute("media-loader", { src: "error" });
      });
  } else if (isVideoShare) {
    const selfVideoShareUrl = `jel://clients/${NAF.clientId}/video`;
    entity.setAttribute("media-loader", { src: selfVideoShareUrl });
  } else if (contents !== null) {
    // If contents were set, update the src to reflect the media-text property that is bound.
    getNetworkedEntity(entity).then(el => {
      const src = `jel://entities/${getNetworkId(el)}/components/${
        isEmoji ? "media-emoji/properties/emoji" : "media-text/properties/deltaOps/contents"
      }`;
      entity.setAttribute("media-loader", { src });
    });
  }

  if (contentOrigin) {
    entity.addEventListener("media_resolved", ({ detail }) => {
      const objectType = objectTypeForOriginAndContentType(contentOrigin, detail.contentType, detail.src);
      scene.emit("object_spawned", { objectType });
    });
  }

  return { entity, orientation };
};

// Moves the given object to the terrain ground.
export const groundMedia = (sourceEl, faceUp, bbox = null, meshOffset = 0.0, animate = true, positionOnly = false) => {
  const { object3D } = sourceEl;
  const finalXRotation = faceUp ? (3.0 * Math.PI) / 2.0 : 0.0;
  const px = object3D.rotation.x;
  const pz = object3D.rotation.z;
  object3D.rotation.x = finalXRotation;
  object3D.rotation.z = 0.0;
  object3D.traverse(o => (o.matrixNeedsUpdate = true));
  object3D.updateMatrixWorld();

  if (bbox === null) {
    bbox = new THREE.Box3();
    bbox.expandByObject(object3D);
  }

  object3D.rotation.x = px;
  object3D.rotation.z = pz;
  object3D.traverse(o => (o.matrixNeedsUpdate = true));
  object3D.updateMatrixWorld();

  const objectHeight = bbox.max.y - bbox.min.y;

  const x = object3D.position.x;
  const z = object3D.position.z;

  const terrainSystem = AFRAME.scenes[0].systems["hubs-systems"].terrainSystem;
  const terrainHeight = terrainSystem.getTerrainHeightAtWorldCoord(x, z);
  const finalYPosition = objectHeight * 0.5 + meshOffset + terrainHeight;

  const floatyObject = sourceEl.components["floaty-object"];

  if (floatyObject) {
    // If physics body was dynamic, lock it so physics system won't be updating it anymore.
    floatyObject.setLocked(true);
  }

  if (animate) {
    const step = (function() {
      const lastValue = {};
      return function(anim) {
        const value = anim.animatables[0].target;

        // For animation timeline.
        if (value.x === lastValue.x && value.y === lastValue.y && value.z === lastValue.z) {
          return;
        }

        lastValue.x = value.x;
        lastValue.y = value.y;
        lastValue.z = value.z;

        object3D.rotation.x = value.x;
        object3D.position.y = value.y;
        object3D.rotation.z = value.z;
        object3D.matrixNeedsUpdate = true;
      };
    })();

    anime({
      duration: 800,
      easing: "easeOutElastic",
      elasticity: 800,
      loop: 0,
      round: false,
      x: positionOnly ? object3D.rotation.x : finalXRotation,
      y: finalYPosition,
      z: positionOnly ? object3D.rotation.z : 0.0,
      targets: [{ x: object3D.rotation.x, y: object3D.position.y, z: object3D.rotation.z }],
      update: anim => step(anim),
      complete: anim => step(anim)
    });
  } else {
    if (!positionOnly) {
      object3D.rotation.x = finalXRotation;
      object3D.rotation.z = 0.0;
    }

    object3D.position.y = finalYPosition;
    object3D.matrixNeedsUpdate = true;
  }
};

// Resets the transform rotation of the media
export const resetMediaRotation = sourceEl => {
  const { object3D } = sourceEl;

  const floatyObject = sourceEl.components["floaty-object"];

  if (floatyObject) {
    // If physics body was dynamic, lock it so physics system won't be updating it anymore.
    floatyObject.setLocked(true);
  }

  const step = (function() {
    const lastValue = {};
    return function(anim) {
      const value = anim.animatables[0].target;

      // For animation timeline.
      if (value.x === lastValue.x && value.y === lastValue.y && value.z === lastValue.z) {
        return;
      }

      lastValue.x = value.x;
      lastValue.y = value.y;
      lastValue.z = value.z;

      object3D.rotation.x = value.x;
      object3D.rotation.y = value.y;
      object3D.rotation.z = value.z;
      object3D.matrixNeedsUpdate = true;
    };
  })();

  anime({
    duration: 800,
    easing: "easeOutElastic",
    elasticity: 800,
    loop: 0,
    round: false,
    x: 0.0,
    y: 0.0,
    z: 0.0,
    targets: [{ x: object3D.rotation.x, y: object3D.rotation.y, z: object3D.rotation.z }],
    update: anim => step(anim),
    complete: anim => step(anim)
  });
};

export const cloneMedia = (sourceEl, options = {}) => {
  const { link } = options;
  let { src } = options;
  delete options.src;
  delete options.link;

  let contents = null;
  const extraMediaOptions = {};

  if (sourceEl.components["media-text"]) {
    const mediaText = sourceEl.components["media-text"];
    const { foregroundColor, backgroundColor, font } = mediaText.data;

    contents = mediaText.getContents();
    extraMediaOptions.foregroundColor = foregroundColor;
    extraMediaOptions.backgroundColor = backgroundColor;
    extraMediaOptions.font = font;
  } else if (sourceEl.components["media-emoji"]) {
    const mediaEmoji = sourceEl.components["media-emoji"];
    contents = mediaEmoji.data.emoji;
  } else {
    if (!src) {
      ({ src } = sourceEl.components["media-loader"].data);
    }
  }

  const {
    contentType,
    contentSubtype,
    fitToBox,
    mediaOptions,
    stackAxis,
    stackSnapPosition,
    stackSnapScale
  } = sourceEl.components["media-loader"].data;

  return addMedia({
    ...{
      src,
      contents,
      linkedEl: link ? sourceEl : null,
      fitToBox,
      contentOrigin: ObjectContentOrigins.URL,
      contentType,
      contentSubtype,
      stackAxis,
      stackSnapPosition,
      stackSnapScale,
      mediaOptions: { ...mediaOptions, ...extraMediaOptions }
    },
    ...options
  });
};

function onInjectedMaterialDispose(evt) {
  evt.target.onBeforeCompile = null;
}

export function injectCustomShaderChunks(obj) {
  const shaderUniforms = [];

  obj.traverse(object => {
    if (!object.material) return;

    object.material = mapMaterials(object, material => {
      if (material.hubs_InjectedCustomShaderChunks) return material;
      if (!validMaterials.includes(material.type)) {
        return material;
      }

      // HACK, this routine inadvertently leaves the A-Frame shaders wired to the old, dark
      // material, so maps cannot be updated at runtime. This breaks UI elements who have
      // hover/toggle state, so for now just skip these while we figure out a more correct
      // solution.
      if (
        object.el.classList.contains("ui") ||
        object.el.classList.contains("hud") ||
        object.el.getAttribute("text-button")
      )
        return material;

      const newMaterial = material.clone();
      // This will not run if the object is never rendered unbatched, since its unbatched shader will never be compiled
      newMaterial.onBeforeCompile = shader => {
        addVertexCurvingToShader(shader);
        if (shader.vertexShader.indexOf("#include <skinning_vertex>") == -1) return;

        shader.uniforms.hubs_IsFrozen = { value: false };
        shader.uniforms.hubs_EnableSweepingEffect = { value: false };
        shader.uniforms.hubs_SweepParams = { value: [0, 0] };
        shader.uniforms.hubs_InteractorOnePos = { value: [0, 0, 0] };
        shader.uniforms.hubs_InteractorTwoPos = { value: [0, 0, 0] };
        shader.uniforms.hubs_HighlightInteractorOne = { value: false };
        shader.uniforms.hubs_HighlightInteractorTwo = { value: false };
        shader.uniforms.hubs_Time = { value: 0 };

        shader.vertexShader =
          [
            "varying vec3 hubs_WorldPosition;",
            "uniform bool hubs_IsFrozen;",
            "uniform bool hubs_HighlightInteractorOne;",
            "uniform bool hubs_HighlightInteractorTwo;\n"
          ].join("\n") +
          shader.vertexShader.replace(
            "#include <skinning_vertex>",
            `#include <skinning_vertex>
             if (hubs_HighlightInteractorOne || hubs_HighlightInteractorTwo || hubs_IsFrozen) {
              vec4 wt = modelMatrix * vec4(transformed, 1);
              // Used in the fragment shader below.
              hubs_WorldPosition = wt.xyz;
            }`
          );

        shader.fragmentShader =
          [
            "varying vec3 hubs_WorldPosition;",
            "uniform bool hubs_IsFrozen;",
            "uniform bool hubs_EnableSweepingEffect;",
            "uniform vec2 hubs_SweepParams;",
            "uniform bool hubs_HighlightInteractorOne;",
            "uniform vec3 hubs_InteractorOnePos;",
            "uniform bool hubs_HighlightInteractorTwo;",
            "uniform vec3 hubs_InteractorTwoPos;",
            "uniform float hubs_Time;\n"
          ].join("\n") +
          shader.fragmentShader.replace(
            "#include <output_fragment>",
            "#include <output_fragment>\n" + mediaHighlightFrag
          );

        shaderUniforms.push(shader.uniforms);
      };

      newMaterial.needsUpdate = true;
      newMaterial.hubs_InjectedCustomShaderChunks = true;
      // free closure memory on dispose
      newMaterial.addEventListener("dispose", onInjectedMaterialDispose);
      return newMaterial;
    });
  });

  return shaderUniforms;
}

const mediaPos = new THREE.Vector3();

// Adds media radiating from the centerEl vertically
export function addAndArrangeRadialMedia(
  centerEl,
  media,
  contentSubtype,
  snapCount,
  mirrorOrientation = false,
  distance = 0.75
) {
  const { entity, orientation } = addMedia(media, null, "#interactable-media", undefined, contentSubtype, false);

  const pos = centerEl.object3D.position;

  entity.object3D.position.set(pos.x, pos.y, pos.z);
  entity.object3D.rotation.copy(centerEl.object3D.rotation);

  if (mirrorOrientation) {
    entity.object3D.rotateY(Math.PI);
  }

  // Generate photos in a arc around top.
  // Prevent z-fighting but place behind viewfinder
  const idx = (snapCount % 9) + 3;

  mediaPos.set(
    Math.cos(Math.PI * (2 / 3) * (idx / 6.0) - Math.PI * (1 / 3)) * distance,
    Math.sin(Math.PI * (2 / 3) * (idx / 6.0) - Math.PI * (1 / 3)) * distance,
    -0.05 + idx * 0.001
  );

  centerEl.object3D.localToWorld(mediaPos);
  entity.object3D.visible = false;

  const handler = () => {
    entity.object3D.visible = true;
    entity.setAttribute("animation__photo_pos", {
      property: "position",
      dur: 800,
      from: { x: pos.x, y: pos.y, z: pos.z },
      to: { x: mediaPos.x, y: mediaPos.y, z: mediaPos.z },
      easing: "easeOutElastic"
    });
  };

  let eventType = null;

  if (contentSubtype.startsWith("photo")) {
    entity.addEventListener("image-loaded", handler, { once: true });
    eventType = "photo";
  } else if (contentSubtype.startsWith("video")) {
    entity.addEventListener("video-loaded", handler, { once: true });
    eventType = "video";
  } else {
    console.error("invalid type " + contentSubtype);
    return;
  }

  entity.object3D.matrixNeedsUpdate = true;

  entity.addEventListener(
    "media_resolved",
    () => {
      centerEl.emit(`${eventType}_taken`, entity.components["media-loader"].data.src);
    },
    { once: true }
  );

  return { entity, orientation };
}

// Arranges media around the centerEl in X + Z, as chairs in a roundtable discussion
export function addAndArrangeRoundtableMedia(
  centerMatrixWorld,
  media,
  width,
  margin,
  numItems,
  itemIndex,
  mediaOptions = {},
  ground = false,
  phiStart = -Math.PI,
  phiEnd = Math.PI
) {
  const entities = [];

  const bbox = new THREE.Box3();
  const phiSpan = Math.abs(phiStart - phiEnd);

  const circumference = (width * numItems + (margin * numItems + 1)) * ((Math.PI * 2) / phiSpan);
  const radius = circumference / (2 * Math.PI);

  for (let phi = phiEnd, i = 0; phi >= phiStart; phi -= phiSpan / numItems, i++) {
    if (i !== itemIndex) continue;

    const { entity, orientation } = addMedia({
      src: media,
      animate: false,
      mediaOptions,
      skipLoader: true,
      locked: true
    });

    entity.addEventListener(
      "media-loaded",
      () => {
        orientation.then(async or => {
          const obj = entity.object3D;
          const offset = new THREE.Vector3(0, 0, -radius);
          const lookAt = true;

          if (isSynchronized(entity) && !ensureOwnership(entity)) {
            console.warn("Cannot arrange element because unable to become owner.");
            return;
          }

          offsetRelativeTo(obj, centerMatrixWorld, offset, lookAt, or, null, null, null, true, phi);

          // scale to width
          bbox.makeEmpty();
          expandByEntityObjectSpaceBoundingBox(bbox, entity);

          const targetScale = width / (bbox.max.x - bbox.min.x);
          entity.object3D.scale.x = entity.object3D.scale.y = entity.object3D.scale.z = targetScale;
          entity.object3D.matrixNeedsUpdate = true;

          if (ground) {
            groundMedia(entity, false, null, 0.0, false, true);
          }
        });
      },
      { once: true }
    );

    entities.push(entity);
  }

  return entities;
}

export const textureLoader = new HubsTextureLoader().setCrossOrigin("anonymous");

export async function createImageTexture(url, filter, preload = true) {
  let texture;
  let info;

  if (filter) {
    const image = new Image();
    image.crossOrigin = "anonymous";
    const load = new Promise(res => image.addEventListener("load", res, { once: true }));
    image.src = url;
    await load;
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    await filter(ctx, image.width, image.height);

    texture = new THREE.CanvasTexture(canvas);
    info = { width: image.width, height: image.height, hasAlpha: image.hasAlpha };
  } else {
    texture = new THREE.Texture();
    try {
      info = await textureLoader.loadTextureAsync(texture, url, preload);
    } catch (e) {
      throw new Error(`'${url}' could not be fetched (Error code: ${e.status}; Response: ${e.statusText})`);
    }
  }

  texture.encoding = THREE.sRGBEncoding;
  texture.anisotropy = 4;

  return [texture, info];
}

let basisLoader;

export function createBasisTexture(url) {
  if (!basisLoader) {
    basisLoader = new BasisTextureLoader(BasisLoadingManager).detectSupport(AFRAME.scenes[0].renderer);
  }
  return new Promise((resolve, reject) => {
    basisLoader.load(
      url,
      function(texture) {
        texture.encoding = THREE.sRGBEncoding;
        texture.onUpdate = function() {
          // Delete texture data once it has been uploaded to the GPU
          texture.mipmaps.length = 0;
        };
        // texture.anisotropy = 4;
        resolve(texture);
      },
      undefined,
      function(error) {
        console.error(error);
        reject(new Error(`'${url}' could not be fetched (Error: ${error}`));
      }
    );
  });
}

export function addMeshScaleAnimation(mesh, initialScale, onComplete) {
  const step = (function() {
    const lastValue = {};
    return function(anim) {
      const value = anim.animatables[0].target;

      value.x = Math.max(Number.MIN_VALUE, value.x);
      value.y = Math.max(Number.MIN_VALUE, value.y);
      value.z = Math.max(Number.MIN_VALUE, value.z);

      // For animation timeline.
      if (value.x === lastValue.x && value.y === lastValue.y && value.z === lastValue.z) {
        return;
      }

      lastValue.x = value.x;
      lastValue.y = value.y;
      lastValue.z = value.z;

      mesh.scale.set(value.x, value.y, value.z);
      mesh.matrixNeedsUpdate = true;
    };
  })();

  const config = {
    duration: 400,
    easing: "easeOutElastic",
    elasticity: 400,
    loop: 0,
    round: false,
    x: mesh.scale.x,
    y: mesh.scale.y,
    z: mesh.scale.z,
    targets: [initialScale],
    update: anim => step(anim),
    complete: anim => {
      step(anim);
      if (onComplete) onComplete();
    }
  };

  mesh.scale.copy(initialScale);
  mesh.matrixNeedsUpdate = true;

  return anime(config);
}

export function closeExistingMediaMirror() {
  const mirrorTarget = DOM_ROOT.querySelector("#media-mirror-target");

  // Remove old mirror target media element
  if (mirrorTarget.firstChild) {
    mirrorTarget.firstChild.setAttribute("animation__remove", {
      property: "scale",
      dur: 200,
      to: { x: 0.01, y: 0.01, z: 0.01 },
      easing: "easeInQuad"
    });

    return new Promise(res => {
      mirrorTarget.firstChild.addEventListener("animationcomplete", () => {
        mirrorTarget.removeChild(mirrorTarget.firstChild);
        mirrorTarget.parentEl.object3D.visible = false;
        res();
      });
    });
  }
}

export const MEDIA_PRESENCE = {
  UNKNOWN: -1,
  INIT: 0,
  PENDING: 1,
  PRESENT: 2,
  HIDDEN: 8
};

export function scaleToAspectRatio(el, ratio) {
  const width = Math.min(1.0, 1.0 / ratio);
  const height = Math.min(1.0, ratio);
  el.object3DMap.mesh.scale.set(width, height, 1);
  el.object3DMap.mesh.matrixNeedsUpdate = true;
}

export function removeMediaElement(el) {
  if (isSynchronized(el) && !ensureOwnership(el)) {
    console.warn("Cannot remove element because unable to become owner.");
    return;
  }

  if (el.parentNode) {
    SYSTEMS.domSerializeSystem.removeFromDOM(el);
    el.parentNode.removeChild(el);
  }
}

export function getMediaViewComponent(el) {
  for (let i = 0; i < MEDIA_VIEW_COMPONENTS.length; i++) {
    const c = el.components[MEDIA_VIEW_COMPONENTS[i]];
    if (c) return c;
  }

  return null;
}

export function performAnimatedRemove(el, callback) {
  const sfx = el.sceneEl.systems["hubs-systems"].soundEffectsSystem;

  const removeSoundEffect = sfx.playPositionalSoundFollowing(SOUND_MEDIA_REMOVED, el.object3D, false);

  el.setAttribute("animation__remove", {
    property: "scale",
    dur: 200,
    to: { x: 0.01, y: 0.01, z: 0.01 },
    easing: "easeInQuad"
  });

  el.addEventListener("animationcomplete", () => {
    // Let sound finish
    setTimeout(() => {
      removeMediaElement(el);
      sfx.stopPositionalAudio(removeSoundEffect);
      if (callback) callback();
    }, 500);
  });
}

export function isLockedMedia(el) {
  return !!(el && el.components["media-loader"] && el.components["media-loader"].data.locked);
}

export function isNextPrevMedia(el) {
  const component = getMediaViewComponent(el);
  return NEXT_PREV_MEDIA_VIEW_COMPONENTS.includes(component?.name);
}

export const addMediaInFrontOfPlayer = options => {
  const defaults = {
    zOffset: -2.5,
    yOffset: 0,
    fitToBox: true
  };

  const addOptions = { ...defaults, ...options };

  const media = addMedia(addOptions);

  media.orientation.then(async or => {
    while (!media.entity.sceneEl.is("entered")) {
      await nextTick();
    }

    media.entity.setAttribute("offset-relative-to", {
      target: "#avatar-pov-node",
      offset: { x: 0, y: addOptions.yOffset, z: addOptions.zOffset },
      orientation: or
    });
  });

  return media;
};

export const addMediaInFrontOfPlayerIfPermitted = options => {
  if (!window.APP.atomAccessManager.hubCan("spawn_and_move_media")) return { entity: null, orientation: null };
  if (options.src instanceof File && !window.APP.atomAccessManager.hubCan("upload_files"))
    return { entity: null, orientation: null };

  return addMediaInFrontOfPlayer(options);
};

export const hasActiveScreenShare = () => {
  const videoEls = DOM_ROOT.querySelectorAll("[media-video]");

  for (const videoEl of videoEls) {
    const component = videoEl.components["media-video"];

    if (component.data.contentType === "video/vnd.jel-webrtc") {
      return true;
    }
  }

  return false;
};

const MAX_SCREENSHARE_SNAP_TARGET_DISTANCE_PER_UNIT_VOLUME = 0.15;
const MIN_SCREENSHARE_SNAP_TARGET_DISTANCE = 25.0;

export const snapEntityToBiggestNearbyScreen = entity => {
  let bestEntity = null;
  let bestEntityVolume = -Infinity;
  const bestEntityCenter = new THREE.Vector3();

  const v = new THREE.Vector3();
  const avatarPos = new THREE.Vector3();
  DOM_ROOT.getElementById("avatar-rig").object3D.getWorldPosition(avatarPos);
  const box = new THREE.Box3();

  // Screen target is a position/scale snappable vox that snaps to walls
  for (const el of DOM_ROOT.querySelectorAll("[media-vox]")) {
    const mediaLoader = el.components["media-loader"];
    if (!mediaLoader) continue;
    if (!mediaLoader.data.stackSnapPosition) continue;
    if (!mediaLoader.data.stackSnapScale) continue;
    if (mediaLoader.data.stackAxis === null) continue;

    const axis = NON_FLAT_STACK_AXES[mediaLoader.data.stackAxis];

    // Skip over 3d snap zones, which are stacked face up along y
    if (axis.y !== 0) continue;

    box.makeEmpty();
    expandByEntityObjectSpaceBoundingBox(box, el);
    el.object3D.updateMatrices();
    box.applyMatrix4(el.object3D.matrixWorld);
    box.getSize(v);

    const volume = v.x * v.y * v.z;
    box.getCenter(v);

    const dist = v.distanceTo(avatarPos);

    const testDist = Math.max(
      MIN_SCREENSHARE_SNAP_TARGET_DISTANCE,
      volume * MAX_SCREENSHARE_SNAP_TARGET_DISTANCE_PER_UNIT_VOLUME
    );

    if (volume > bestEntityVolume && dist < testDist) {
      bestEntity = el;
      bestEntityVolume = volume;
      bestEntityCenter.copy(v);
    }
  }

  if (bestEntity) {
    v.copy(bestEntityCenter);
    v.sub(avatarPos);
    v.normalize();

    const voxSource = bestEntity.components["media-vox"].mesh;
    const intersection = SYSTEMS.voxSystem.raycastToVoxSource(avatarPos, v, voxSource);

    if (intersection) {
      box.makeEmpty();
      expandByEntityObjectSpaceBoundingBox(box, bestEntity);
      const target = entity.object3D;
      const targetBoundingBox = new THREE.Box3();
      const targetMatrix = new THREE.Matrix4();
      targetMatrix.copy(target.matrix);
      expandByEntityObjectSpaceBoundingBox(targetBoundingBox, entity);

      stackTargetAt(
        target,
        targetBoundingBox,
        targetMatrix,
        0, // stackAlongAxis
        0, // stackRotationAmount
        intersection.point,
        intersection.face.normal,
        voxSource,
        box
      );
    }
  }
};
