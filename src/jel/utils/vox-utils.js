import { getLocalRelativePathFromUrl } from "./jel-url-utils";
import { ModelReader, ModelWriter, voxColorForRGBT } from "smoothvoxels";
import { SVoxChunk as SerializedVoxels } from "./svox-chunk";
import { Builder } from "flatbuffers/js/builder";

const flatbuilder = new Builder(1024 * 1024 * 4);
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

export function modelFromString(string, skipVoxels = false) {
  const model = ModelReader.readFromString(string, CUSTOM_MODEL_FIELDS, skipVoxels);
  // Copy in frames for now
  model.frames = [model.voxels];

  // Ensure model has a shell

  if (!model.shell) {
    // Create shell material
    model.materials.createMaterial(
      "basic", // type
      "smooth", // lighting
      0.0, // roughness
      0.0, // shininess
      false, // fade
      true, // simplify
      1.0, // opacity
      0, // alphatest
      false, // transparent
      1.0, // refraction ration
      false, // wireframe
      "back", // side,
      null, // emissive false
      null, // emissive intensity
      true, // fog
      null, // map
      null, // normaj map
      null, // roughness map
      null, // metalness map
      null, // emissive map
      null, // matcap
      null, // reflection map
      null, // refaction map
      -1.0, // uscale (in voxels,  -1 = cover model)
      -1.0, // vscale (in voxels,  -1 = cover model)
      0.0, // uoffset
      0.0, // voffset
      0.0
    ); // rotation in degrees

    const materialIndex = model.materials.materials.length - 1;
    const voxColor = voxColorForRGBT(0, 0, 0, materialIndex);
    model.voxColorToColorId.set(voxColor, "Outline");
    model.shell = [{ colorId: "Outline", voxBgr: 0, materialIndex, distance: 0.25 }];
  }

  if (!model.revision) {
    model.revision = 0;
  }

  return model;
}

export function modelToString(model) {
  const compressed = Math.max(...model.voxels.size) >= 32;

  // TODO additiona lfiedls
  return ModelWriter.writeToString(
    model,
    compressed,
    1,
    null /* modelLine */,
    null /* materialLine */,
    CUSTOM_MODEL_FIELDS
  );
}

export async function fetchSVoxFromUrl(voxUrl, skipVoxels = false, shouldSkipRetry = () => false) {
  for (let i = 0; i < 10; i++) {
    try {
      if (shouldSkipRetry()) return null;

      const { atomAccessManager } = window.APP;
      let contentUrl = voxUrl;
      let cache = "default";

      const relativePath = getLocalRelativePathFromUrl(voxUrl);

      if (relativePath) {
        // Use no-cache, which will do a conditional request since underlying file may have changed.
        cache = "no-cache";
        contentUrl = await atomAccessManager.contentUrlForRelativePath(relativePath);
      }

      const response = await fetch(contentUrl, { cache });
      return modelFromString(await response.text(), skipVoxels);
    } catch (e) {
      console.warn("Failed to fetch vox", e);
      await new Promise(res => setTimeout(res, 1000));
    }
  }
}

export function voxelsToSerializedVoxelsBytes(voxels) {
  flatbuilder.clear();

  flatbuilder.finish(
    SerializedVoxels.createSVoxChunk(
      flatbuilder,
      voxels.size[0],
      voxels.size[1],
      voxels.size[2],
      voxels.bitsPerIndex,
      SerializedVoxels.createPaletteVector(
        flatbuilder,
        new Uint8Array(voxels.palette.buffer, voxels.palette.byteOffset, voxels.palette.byteLength)
      ),
      SerializedVoxels.createIndicesVector(flatbuilder, voxels.indices.view)
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

export function ensureModelVoxelFrame(model, idxFrame) {
  if (idxFrame > MAX_FRAMES - 1) return;

  if (model.frames[idxFrame]) return;

  const indices = new Array(DEFAULT_VOX_FRAME_SIZE ** 3);
  indices.fill(0);

  const { voxels } = modelFromString(
    ```
    origin = -y
    material type = basic, colors = A:#F00
    voxels
    -
  ```
  );

  while (model.frames.length < idxFrame + 1) {
    model.frames.push(null);
  }

  model.frames[idxFrame] = voxels;
}
