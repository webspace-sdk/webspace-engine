import { ByteBuffer } from "flatbuffers";
import { getLocalRelativePathFromUrl } from "./jel-url-utils";
import { PVox } from "../pvox/pvox";

export async function fetchPVoxFromUrl(voxUrl) {
  const { atomAccessManager } = window.APP;
  let contentUrl = voxUrl;
  let cache = "default";

  if (voxUrl.startsWith("file:") || voxUrl.startsWith("http:")) {
    const relativePath = getLocalRelativePathFromUrl(new URL(voxUrl));

    if (relativePath) {
      // Use no-cache, which will do a conditional request since underlying file may have changed.
      cache = "no-cache";
      contentUrl = await atomAccessManager.contentUrlForRelativePath(relativePath);
    }
  }

  const res = await fetch(contentUrl, { cache });
  const bytes = await res.arrayBuffer();
  const pvoxRef = new PVox();
  PVox.getRootAsPVox(new ByteBuffer(new Uint8Array(bytes)), pvoxRef);
  return pvoxRef;
}

export function getUrlFromVoxId(voxId) {
  return atob(voxId);
}

export function getVoxIdFromUrl(voxUrl) {
  // The vox id of the url is the base64 encoding of the URL. If the URL is a relative URL,
  // then we need to prepend the current URL to it.
  return btoa(new URL(voxUrl, document.location.href));
}
