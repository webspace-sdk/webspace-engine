import { objectTypeForOriginAndContentType } from "../object-types";
import { getReticulumFetchUrl, getDirectReticulumFetchUrl } from "./phoenix-utils";
import { ObjectContentOrigins } from "../object-types";
import mediaHighlightFrag from "./media-highlight-frag.glsl";
import { mapMaterials } from "./material-utils";
import HubsTextureLoader from "../loaders/HubsTextureLoader";
import { validMaterials } from "../components/hoverable-visuals";
import { proxiedUrlFor, guessContentType } from "../utils/media-url-utils";
import { getNetworkedEntity, getNetworkId, ensureOwnership } from "../../jel/utils/ownership-utils";
import { addVertexCurvingToShader } from "../../jel/systems/terrain-system";
import { getMessages } from "../../hubs/utils/i18n";

import Linkify from "linkify-it";
import tlds from "tlds";

import anime from "animejs";

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
  OPEN: 12
};

export const LOADING_EVENTS = ["model-loading", "image-loading", "text-loading", "pdf-loading"];
export const LOADED_EVENTS = ["model-loaded", "image-loaded", "text-loaded", "pdf-loaded"];
export const ERROR_EVENTS = ["model-error", "image-error", "text-error", "pdf-error"];
const MEDIA_VIEW_COMPONENTS = ["media-video", "media-image", "media-text", "media-pdf", "gltf-model-plus"];

const linkify = Linkify();
linkify.tlds(tlds);

const mediaAPIEndpoint = getReticulumFetchUrl("/api/v1/media");
const getDirectMediaAPIEndpoint = () => getDirectReticulumFetchUrl("/api/v1/media");

const isMobile = AFRAME.utils.device.isMobile();
const isMobileVR = AFRAME.utils.device.isMobile();

// Map<String, Promise<Object>
const resolveUrlCache = new Map();
export const getDefaultResolveQuality = (is360 = false) => {
  const useLowerQuality = isMobile || isMobileVR;
  return !is360 ? (useLowerQuality ? "low" : "high") : useLowerQuality ? "low_360" : "high_360";
};

export const resolveUrl = async (url, quality = null, version = 1, bustCache) => {
  const key = `${url}_${version}`;
  if (!bustCache && resolveUrlCache.has(key)) return resolveUrlCache.get(key);

  const resultPromise = fetch(mediaAPIEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ media: { url, quality: quality || getDefaultResolveQuality() }, version })
  }).then(async response => {
    if (!response.ok) {
      const message = `Error resolving url "${url}":`;
      try {
        const body = await response.text();
        throw new Error(message + " " + body);
      } catch (e) {
        throw new Error(message + " " + response.statusText);
      }
    }
    return response.json();
  });

  resolveUrlCache.set(key, resultPromise);
  return resultPromise;
};

export const upload = (file, desiredContentType, hubId) => {
  const formData = new FormData();
  formData.append("media", file);

  if (hubId) {
    formData.append("hub_id", hubId);
  }

  if (desiredContentType) {
    formData.append("desired_content_type", desiredContentType);
  }

  const headers = {};
  const { token } = window.APP.store.state.credentials;

  if (token) {
    headers.authorization = `bearer ${token}`;
  }

  // To eliminate the extra hop and avoid proxy timeouts, upload files directly
  // to a reticulum host.
  return fetch(getDirectMediaAPIEndpoint(), {
    method: "POST",
    body: formData,
    headers
  }).then(r => r.json());
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
  const els = document.querySelectorAll("[media-loader]");
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

export const addMedia = (
  src,
  contents,
  template,
  contentOrigin,
  contentSubtype = null,
  resolve = false,
  fitToBox = false,
  animate = true,
  mediaOptions = {},
  networked = true,
  parentEl = null,
  linkedEl = null
) => {
  const scene = AFRAME.scenes[0];

  const entity = document.createElement("a-entity");

  if (networked) {
    entity.setAttribute("shared", { template: template });
  } else {
    const templateBody = document
      .importNode(document.body.querySelector(template).content, true)
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

  const needsToBeUploaded = src instanceof File;
  // TODO JEL deal with text files dropped or uploaded

  // If we're re-pasting an existing src in the scene, we should use the latest version
  // seen across any other entities. Otherwise, start with version 1.
  const version = getLatestMediaVersionOfSrc(src);
  const mediaPresentingSpace = document.querySelector("[shared-media]");
  const mediaLayer =
    mediaPresentingSpace && mediaPresentingSpace.components["shared-media"]
      ? mediaPresentingSpace.components["shared-media"].data.selectedMediaLayer
      : 0;

  entity.setAttribute("media-loader", {
    fitToBox,
    resolve,
    animate,
    src: typeof src === "string" && contents === null ? coerceToUrl(src) || src : "",
    initialContents: contents != null ? contents : null,
    version,
    contentSubtype,
    linkedEl,
    mediaLayer,
    mediaOptions
  });

  entity.object3D.matrixNeedsUpdate = true;

  (parentEl || scene).appendChild(entity);

  const orientation = new Promise(function(resolve) {
    if (needsToBeUploaded) {
      getOrientation(src, x => {
        resolve(x);
      });
    } else {
      resolve(1);
    }
  });
  if (needsToBeUploaded) {
    // Video camera videos are converted to mp4 for compatibility
    const desiredContentType = contentSubtype === "video-camera" ? "video/mp4" : src.type || guessContentType(src.name);

    const hubId = window.APP.hubChannel.hubId;

    upload(src, desiredContentType, hubId)
      .then(response => {
        const srcUrl = new URL(proxiedUrlFor(response.origin));
        srcUrl.searchParams.set("token", response.meta.access_token);
        entity.setAttribute("media-loader", { resolve: false, src: srcUrl.href, fileId: response.file_id });
      })
      .catch(e => {
        console.error("Media upload failed", e);
        entity.setAttribute("media-loader", { src: "error" });
      });
  } else if (src instanceof MediaStream) {
    entity.setAttribute("media-loader", { src: `jel://clients/${NAF.clientId}/video` });
  } else if (contents !== null) {
    // If contents were set, update the src to reflect the media-text property that is bound.
    getNetworkedEntity(entity).then(el => {
      entity.setAttribute("media-loader", {
        src: `jel://entities/${getNetworkId(el)}/components/media-text/properties/deltaOps/contents`
      });
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

export const cloneMedia = (sourceEl, template, src = null, networked = true, link = false, parentEl = null) => {
  let contents = null;

  if (sourceEl.components["media-text"]) {
    contents = sourceEl.components["media-text"].getContents();
  } else {
    if (!src) {
      ({ src } = sourceEl.components["media-loader"].data);
    }
  }

  const { contentSubtype, fitToBox, mediaOptions } = sourceEl.components["media-loader"].data;

  return addMedia(
    src,
    contents,
    template,
    ObjectContentOrigins.URL,
    contentSubtype,
    true,
    fitToBox,
    false,
    mediaOptions,
    networked,
    parentEl,
    link ? sourceEl : null
  );
};

function onInjectedMaterialDispose(evt) {
  evt.target.onBeforeCompile = null;
}

export function injectCustomShaderChunks(obj) {
  const vertexRegex = /\bskinning_vertex\b/;
  const fragRegex = /\bgl_FragColor\b/;

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
        if (!vertexRegex.test(shader.vertexShader)) return;

        shader.uniforms.hubs_IsFrozen = { value: false };
        shader.uniforms.hubs_EnableSweepingEffect = { value: false };
        shader.uniforms.hubs_SweepParams = { value: [0, 0] };
        shader.uniforms.hubs_InteractorOnePos = { value: [0, 0, 0] };
        shader.uniforms.hubs_InteractorTwoPos = { value: [0, 0, 0] };
        shader.uniforms.hubs_HighlightInteractorOne = { value: false };
        shader.uniforms.hubs_HighlightInteractorTwo = { value: false };
        shader.uniforms.hubs_Time = { value: 0 };

        const vchunk = `
        if (hubs_HighlightInteractorOne || hubs_HighlightInteractorTwo || hubs_IsFrozen) {
          vec4 wt = modelMatrix * vec4(transformed, 1);

          // Used in the fragment shader below.
          hubs_WorldPosition = wt.xyz;
        }
        `;

        const vlines = shader.vertexShader.split("\n");
        const vindex = vlines.findIndex(line => vertexRegex.test(line));
        vlines.splice(vindex + 1, 0, vchunk);
        vlines.unshift("varying vec3 hubs_WorldPosition;");
        vlines.unshift("uniform bool hubs_IsFrozen;");
        vlines.unshift("uniform bool hubs_HighlightInteractorOne;");
        vlines.unshift("uniform bool hubs_HighlightInteractorTwo;");
        shader.vertexShader = vlines.join("\n");

        const flines = shader.fragmentShader.split("\n");
        const findex = flines.findIndex(line => fragRegex.test(line));
        flines.splice(findex + 1, 0, mediaHighlightFrag);
        flines.unshift("varying vec3 hubs_WorldPosition;");
        flines.unshift("uniform bool hubs_IsFrozen;");
        flines.unshift("uniform bool hubs_EnableSweepingEffect;");
        flines.unshift("uniform vec2 hubs_SweepParams;");
        flines.unshift("uniform bool hubs_HighlightInteractorOne;");
        flines.unshift("uniform vec3 hubs_InteractorOnePos;");
        flines.unshift("uniform bool hubs_HighlightInteractorTwo;");
        flines.unshift("uniform vec3 hubs_InteractorTwoPos;");
        flines.unshift("uniform float hubs_Time;");
        shader.fragmentShader = flines.join("\n");

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

export function addAndArrangeMedia(el, media, contentSubtype, snapCount, mirrorOrientation = false, distance = 0.75) {
  const { entity, orientation } = addMedia(media, null, "#interactable-media", undefined, contentSubtype, false);

  const pos = el.object3D.position;

  entity.object3D.position.set(pos.x, pos.y, pos.z);
  entity.object3D.rotation.copy(el.object3D.rotation);

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

  el.object3D.localToWorld(mediaPos);
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
      el.emit(`${eventType}_taken`, entity.components["media-loader"].data.src);
    },
    { once: true }
  );

  return { entity, orientation };
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

import HubsBasisTextureLoader from "../loaders/HubsBasisTextureLoader";
export const basisTextureLoader = new HubsBasisTextureLoader();

export function createBasisTexture(url) {
  return new Promise((resolve, reject) => {
    basisTextureLoader.load(
      url,
      function(texture, textureInfo) {
        texture.encoding = THREE.sRGBEncoding;
        texture.onUpdate = function() {
          // Delete texture data once it has been uploaded to the GPU
          texture.mipmaps.length = 0;
        };
        // texture.anisotropy = 4;
        resolve([texture, textureInfo]);
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
  const mirrorTarget = document.querySelector("#media-mirror-target");

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

// Don't batch thin images or narrow images to reduce layer busting.
const MIN_ASPECT_RATIO_TO_BATCH = 1.0 / 8.0;
const MAX_ASPECT_RATIO_TO_BATCH = 1.0 / MIN_ASPECT_RATIO_TO_BATCH;
const MAX_PIXELS_TO_BATCH = 1024 * 1024 * 4;
export const DEFAULT_HUB_NAME = getMessages()["hub.unnamed-title"];

export function meetsBatchingCriteria(textureInfo) {
  if (!textureInfo.width || !textureInfo.height) return false;

  const ratio = textureInfo.height / textureInfo.width;
  const pixels = textureInfo.height * textureInfo.width;
  const batch =
    ratio >= MIN_ASPECT_RATIO_TO_BATCH && ratio <= MAX_ASPECT_RATIO_TO_BATCH && pixels <= MAX_PIXELS_TO_BATCH;

  return batch;
}

export function hasMediaLayer(el) {
  const mediaLoader = el.components["media-loader"];
  if (!mediaLoader) return false;
  return !!(mediaLoader.data && typeof mediaLoader.data.mediaLayer === "number");
}

export function scaleToAspectRatio(el, ratio) {
  const width = Math.min(1.0, 1.0 / ratio);
  const height = Math.min(1.0, ratio);
  el.object3DMap.mesh.scale.set(width, height, 1);
  el.object3DMap.mesh.matrixNeedsUpdate = true;
}

export function removeMediaElement(el) {
  if (!ensureOwnership(el)) {
    console.warn("Cannot remove element because unable to become owner.");
    return;
  }

  const fileId = el.components["media-loader"].data.fileId;

  if (fileId) {
    window.APP.hubChannel.setFileInactive(fileId);
  }

  el.parentNode.removeChild(el);
}

export function getMediaViewComponent(el) {
  for (let i = 0; i < MEDIA_VIEW_COMPONENTS.length; i++) {
    const c = el.components[MEDIA_VIEW_COMPONENTS[i]];
    if (c) return c;
  }

  return null;
}

export function performAnimatedRemove(el, callback) {
  el.setAttribute("animation__remove", {
    property: "scale",
    dur: 200,
    to: { x: 0.01, y: 0.01, z: 0.01 },
    easing: "easeInQuad"
  });

  el.addEventListener("animationcomplete", () => {
    removeMediaElement(el);
    if (callback) callback();
  });
}
