import { getLocalRelativePathFromUrl } from "./jel-url-utils";
import { Voxels, ModelReader, ModelWriter } from "smoothvoxels";

export const VOX_CONTENT_TYPE = "model/vnd.svox";

const MAX_FRAMES = 32;
const DEFAULT_VOX_FRAME_SIZE = 2;
const CUSTOM_MODEL_FIELDS = {
  name: "string",
  stack_axis: "string",
  stack_snap_position: "boolean",
  stack_snap_scale: "boolean",
  revision: "int"
};

export async function modelFromString(string) {
  return ModelReader.readFromString(string, CUSTOM_MODEL_FIELDS);
}

export async function modelToString(model) {
  // TODO compression
  // TODO additiona lfiedls
  return ModelWriter.writeToString(model, false);
}

export async function fetchSVoxFromUrl(voxUrl, shouldSkipRetry = () => false) {
  for (let i = 0; i < 10; i++) {
    try {
      if (shouldSkipRetry()) return null;

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

      const response = await fetch(contentUrl, { cache });
      return modelFromString(await response.text());
    } catch (e) {
      console.warn("Failed to fetch vox", e);
      await new Promise(res => setTimeout(res, 1000));
    }
  }
}

export function voxFramesFromSVoxRef(svoxRef) {}

export function voxChunkToSVoxChunkBytes(chunk) {}

export function getUrlFromVoxId(voxId) {
  return atob(voxId);
}

export function getVoxIdFromUrl(voxUrl) {
  // The vox id of the url is the base64 encoding of the URL. If the URL is a relative URL,
  // then we need to prepend the current URL to it.
  return btoa(new URL(voxUrl, document.location.href));
}

export function ensureModelVoxelFrame(model, idxFrame) {
  if (idxFrame > MAX_FRAMES - 1) return;

  if (model.frames[idxFrame]) return;

  const indices = new Array(DEFAULT_VOX_FRAME_SIZE ** 3);
  indices.fill(0);

  const voxels = Voxels.fromJSON({
    size: [DEFAULT_VOX_FRAME_SIZE, DEFAULT_VOX_FRAME_SIZE, DEFAULT_VOX_FRAME_SIZE],
    palette: [],
    indices
  });

  while (model.frames.length < idxFrame + 1) {
    model.frames.push(null);
  }

  model.frames[idxFrame] = voxels;
}
