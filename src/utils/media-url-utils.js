import { getBlobForEmojiImage } from "./emojis";
import { VOX_CONTENT_TYPE } from "./vox-utils";
import basisTranscoderUrl from "!!url-loader!three/examples/js/libs/basis/basis_transcoder.js";
import basisTranscoderWasmUrl from "!!url-loader!three/examples/js/libs/basis/basis_transcoder.wasm";
import dracoWrapperJsUrl from "!!url-loader!three/examples/js/libs/draco/gltf/draco_wasm_wrapper.js";
import dracoWasmUrl from "!!url-loader!three/examples/js/libs/draco/gltf/draco_decoder.wasm";

const commonKnownContentTypes = {
  gltf: "model/gltf",
  glb: "model/gltf-binary",
  gif: "image/gif",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  jfif: "image/jpeg",
  pdf: "application/pdf",
  mp4: "video/mp4",
  mp3: "audio/mpeg",
  basis: "image/basis",
  m3u8: "application/vnd.apple.mpegurl",
  mpd: "application/dash+xml",
  svox: VOX_CONTENT_TYPE
};

export const isWorkerCorsProxyableContentType = contentType =>
  !contentType.startsWith("video/") &&
  contentType.indexOf(".m3u8") === -1 &&
  contentType.indexOf(".mpegurl") === -1 &&
  contentType !== "application/dash";

export const getCorsProxyUrl = (contentType = null) => {
  if (contentType && isWorkerCorsProxyableContentType(contentType)) {
    return window.APP.workerUrl;
  }

  return window.APP.corsProxyUrl || window.APP.workerUrl;
};

export const isAllowedCorsProxyContentType = contentType => {
  if (window.APP.corsProxyUrl) return true; // If a CORS anywhere endpoint has been configured, use it
  return isWorkerCorsProxyableContentType(contentType);
};

// Synchronous version that doesn't actually use OPTIONS to determine if cors proxying is necessary
// Use rarely to minimize cors proxying.
export const proxiedUrlForSync = (url, contentType = null) => {
  if (!(url.startsWith("http:") || url.startsWith("https:"))) return url;

  // Skip known domains that do not require CORS proxying.
  try {
    const parsedUrl = new URL(url);
    if (document.location.origin === parsedUrl.origin) return url;
  } catch (e) {
    // Ignore
  }

  return `${getCorsProxyUrl(contentType)}/${url}`;
};

export const proxiedUrlFor = async url => {
  if (!(url.startsWith("http:") || url.startsWith("https:"))) return url;

  let contentType;

  // Skip known domains that do not require CORS proxying.
  try {
    const parsedUrl = new URL(url);
    if (document.location.origin === parsedUrl.origin) return url; // Same origin

    const meta = await (await fetch(`${window.APP.workerUrl}/meta/${parsedUrl.toString()}`)).json();

    contentType = meta.contentType;
    const getAllowed = meta.getAllowed;

    if (getAllowed) {
      return url;
    }
  } catch (e) {
    // Ignore
  }

  return `${getCorsProxyUrl(contentType)}/${url}`;
};

export function getAbsoluteUrl(baseUrl, relativeUrl) {
  return new URL(relativeUrl, baseUrl);
}

export function getAbsoluteHref(baseUrl, relativeUrl) {
  return getAbsoluteUrl(baseUrl, relativeUrl).href;
}

export const getCustomGLTFParserURLResolver = gltfUrl => url => {
  if (typeof url !== "string" || url === "") return "";
  if (url === "basis_transcoder.js") {
    return basisTranscoderUrl;
  } else if (url === "basis_transcoder.wasm") {
    return basisTranscoderWasmUrl;
  } else if (url === "draco_wasm_wrapper.js") {
    return dracoWrapperJsUrl;
  } else if (url === "draco_decoder.wasm") {
    return dracoWasmUrl;
  }
  if (/^(https?:)?\/\//i.test(url)) return proxiedUrlForSync(url);
  if (/^data:.*,.*$/i.test(url)) return url;
  if (/^blob:.*$/i.test(url)) return url;

  if (getCorsProxyUrl()) {
    // For absolute paths with a CORS proxied gltf URL, re-write the url properly to be proxied
    const corsProxyPrefix = `https://${getCorsProxyUrl()}/`;

    if (gltfUrl.startsWith(corsProxyPrefix)) {
      const originalUrl = decodeURIComponent(gltfUrl.substring(corsProxyPrefix.length));
      const originalUrlParts = originalUrl.split("/");

      // Drop the .gltf filename
      const path = new URL(url).pathname;
      const assetUrl = originalUrlParts.slice(0, originalUrlParts.length - 1).join("/") + "/" + path;
      return corsProxyPrefix + assetUrl;
    }
  }

  return url;
};

const dataUrlRegex = /data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/;

export const guessContentType = url => {
  if (!url) return;
  if (url.startsWith("webspace://") && url.endsWith("/components/media-text/properties/deltaOps/contents"))
    return "text/html";
  if (url.startsWith("webspace://") && url.endsWith("/components/media-emoji/properties/emoji")) return "text/html";
  if (url.startsWith("webspace://bridge")) return "video/vnd.webspaces-bridge";
  if (url.startsWith("webspace://") && url.endsWith("/video")) return "video/vnd.webspaces-webrtc";
  if (url.startsWith("data:")) {
    const matches = dataUrlRegex.exec(url);
    if (matches.length > 0) {
      return matches[1];
    }
  }
  const extension = new URL(url, window.location).pathname
    .split(".")
    .pop()
    .toLowerCase();
  return commonKnownContentTypes[extension];
};

// TODO SHARED
export const isWebspaceUrl = async (/*url*/) => false;

export function emojiUnicode(characters, prefix = "") {
  return [...characters]
    .reduce((accumulator, character) => {
      const unicode = character.codePointAt(undefined).toString(16);
      accumulator.push(`${prefix}${unicode}`);
      return accumulator;
    }, [])
    .join("-");
}

const emojiBlobUrls = new Map();

export function imageUrlForUnicodeEmoji(unicode) {
  if (emojiBlobUrls.has(unicode)) return emojiBlobUrls.get(unicode);

  const blob = getBlobForEmojiImage(unicode);
  const url = URL.createObjectURL(blob).toString();
  emojiBlobUrls.set(unicode, url);
  return url;
}

export function imageUrlForEmoji(emoji) {
  const unicode = emojiUnicode(emoji);
  return imageUrlForUnicodeEmoji(unicode);
}
