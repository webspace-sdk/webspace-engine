import { ByteBuffer } from "flatbuffers";
import { getLocalRelativePathFromUrl } from "./jel-url-utils";
import { PVox } from "../pvox/pvox";

export async function fetchPVoxFromUrl(voxUrl) {
  const { atomAccessManager } = window.APP;
  let contentUrl = voxUrl;
  let cache = "default";

  console.log("fetchVoxFrameChunks", voxUrl);

  if (voxUrl.startsWith("file:") || voxUrl.startsWith("http:")) {
    const relativePath = getLocalRelativePathFromUrl(new URL(voxUrl));

    if (relativePath) {
      // Use no-cache, which will do a conditional request since underlying file may have changed.
      cache = "no-cache";
      contentUrl = await atomAccessManager.contentUrlForRelativePath(relativePath);
    }
  }
  console.log("fetching", contentUrl);

  const res = await fetch(contentUrl, { cache });
  console.log("got", res);
  const bytes = await res.arrayBuffer();
  console.log("got bytes", bytes);
  const pvoxRef = new PVox();
  PVox.getRootAsPVox(new ByteBuffer(new Uint8Array(bytes)), pvoxRef);
  console.log("got pvox", pvoxRef);

  console.log(bytes);
  console.log("pvoxRef.framesLength()", pvoxRef.framesLength());
  return pvoxRef;
}
