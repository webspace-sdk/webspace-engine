import { ByteBuffer } from "flatbuffers";
import { Builder } from "flatbuffers/js/builder";
import { getLocalRelativePathFromUrl } from "./jel-url-utils";
import { SVox } from "../vox/svox";
import { SVoxChunk } from "../vox/svox-chunk";
import { VoxChunk } from "../vox/vox-chunk";

const flatbuilder = new Builder(1024 * 1024 * 4);

const SVOX_HEADER = [80, 86, 79, 88];
const MAX_FRAMES = 32;
const DEFAULT_VOX_FRAME_SIZE = 2;

export async function fetchSVoxFromUrl(voxUrl) {
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
  const svoxRef = new SVox();
  SVox.getRootAsSVox(new ByteBuffer(new Uint8Array(bytes)), svoxRef);
  return svoxRef;
}

export function voxChunkToSVoxChunkBytes(chunk) {
  flatbuilder.clear();

  flatbuilder.finish(
    SVoxChunk.createSVoxChunk(
      flatbuilder,
      chunk.size[0],
      chunk.size[1],
      chunk.size[2],
      chunk.bitsPerIndex,
      SVoxChunk.createPaletteVector(
        flatbuilder,
        new Uint8Array(chunk.palette.buffer, chunk.palette.byteOffset, chunk.palette.byteLength)
      ),
      SVoxChunk.createIndicesVector(flatbuilder, chunk.indices.view)
    )
  );

  return flatbuilder.asUint8Array().slice(0);
}

export async function voxToSVoxBytes(voxId, vox) {
  const { voxMetadata } = window.APP;
  const metadata = await voxMetadata.getOrFetchMetadata(voxId);

  flatbuilder.clear();

  const frameOffsets = [];

  for (let i = 0; i < vox.frames.length; i++) {
    const frame = vox.frames[i];
    frameOffsets.push(
      SVoxChunk.createSVoxChunk(
        flatbuilder,
        frame.size[0],
        frame.size[1],
        frame.size[2],
        frame.bitsPerIndex,
        SVoxChunk.createPaletteVector(
          flatbuilder,
          new Uint8Array(frame.palette.buffer, frame.palette.byteOffset, frame.palette.byteLength)
        ),
        SVoxChunk.createIndicesVector(flatbuilder, frame.indices.view)
      )
    );
  }

  flatbuilder.finish(
    SVox.createSVox(
      flatbuilder,
      SVox.createHeaderVector(flatbuilder, SVOX_HEADER),
      flatbuilder.createSharedString(metadata.name || ""),
      0 /* version */,
      0 /* revision */,
      metadata.scale || 1.0,
      metadata.stack_axis || 0,
      metadata.stack_snap_position || false,
      metadata.stack_snap_scale || false,
      SVox.createFramesVector(flatbuilder, frameOffsets)
    )
  );

  return flatbuilder.asUint8Array().slice(0);
}

export function getUrlFromVoxId(voxId) {
  return atob(voxId);
}

export function getVoxIdFromUrl(voxUrl) {
  // The vox id of the url is the base64 encoding of the URL. If the URL is a relative URL,
  // then we need to prepend the current URL to it.
  return btoa(new URL(voxUrl, document.location.href));
}

export function ensureVoxFrame(vox, idxFrame) {
  if (idxFrame > MAX_FRAMES - 1) return;

  if (vox.frames[idxFrame]) return;

  const indices = new Array(DEFAULT_VOX_FRAME_SIZE ** 3);
  indices.fill(0);

  const chunk = VoxChunk.fromJSON({
    size: [DEFAULT_VOX_FRAME_SIZE, DEFAULT_VOX_FRAME_SIZE, DEFAULT_VOX_FRAME_SIZE],
    palette: [],
    indices
  });

  while (vox.frames.length < idxFrame + 1) {
    vox.frames.push(null);
  }

  vox.frames[idxFrame] = chunk;
}
