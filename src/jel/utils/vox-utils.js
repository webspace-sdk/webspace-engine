import { ByteBuffer } from "flatbuffers";
import { Builder } from "flatbuffers/js/builder";
import { getLocalRelativePathFromUrl } from "./jel-url-utils";
import { PVox } from "../pvox/pvox";
import { VoxChunk as PVoxChunk } from "../pvox/vox-chunk";

const flatbuilder = new Builder(1024 * 1024 * 4);

const PVOX_HEADER = [80, 86, 79, 88];

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

export function voxChunkToPVoxChunkBytes(chunk) {
  flatbuilder.clear();

  flatbuilder.finish(
    PVoxChunk.createVoxChunk(
      flatbuilder,
      chunk.size[0],
      chunk.size[1],
      chunk.size[2],
      chunk.bitsPerIndex,
      PVoxChunk.createPaletteVector(
        flatbuilder,
        new Uint8Array(chunk.palette.buffer, chunk.palette.byteOffset, chunk.palette.byteLength)
      ),
      PVoxChunk.createIndicesVector(flatbuilder, chunk.indices.view)
    )
  );

  return flatbuilder.asUint8Array().slice(0);
}

export async function voxToPVoxBytes(voxId, vox) {
  const { voxMetadata } = window.APP;
  const metadata = await voxMetadata.getOrFetchMetadata(voxId);

  flatbuilder.clear();

  const frameOffsets = [];

  for (let i = 0; i < vox.frames.length; i++) {
    const frame = vox.frames[i];
    frameOffsets.push(
      PVoxChunk.createVoxChunk(
        flatbuilder,
        frame.size[0],
        frame.size[1],
        frame.size[2],
        frame.bitsPerIndex,
        PVoxChunk.createPaletteVector(
          flatbuilder,
          new Uint8Array(frame.palette.buffer, frame.palette.byteOffset, frame.palette.byteLength)
        ),
        PVoxChunk.createIndicesVector(flatbuilder, frame.indices.view)
      )
    );
  }

  flatbuilder.finish(
    PVox.createPVox(
      flatbuilder,
      PVox.createHeaderVector(flatbuilder, PVOX_HEADER),
      flatbuilder.createSharedString(metadata.name || ""),
      0 /* version */,
      0 /* revision */,
      metadata.scale || 1.0,
      metadata.stack_axis || 0,
      metadata.stack_snap_position || false,
      metadata.stack_snap_scale || false,
      PVox.createFramesVector(flatbuilder, frameOffsets)
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
