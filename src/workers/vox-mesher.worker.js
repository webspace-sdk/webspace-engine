import { Voxels, SvoxMeshGenerator, ModelReader, Buffers as SvoxBuffers, Color } from "smoothvoxels";

// Based on testing with a bunch of models
const svoxBuffers = new SvoxBuffers(375000);

const EMPTY_OBJECT = {};

// The engine draws every svox mesh with one shared material, so a material's `emissive = #color intensity`
// is carried per vertex instead, as an `svoxEmissive` attribute (emissive color times intensity, zero elsewhere).
const addEmissiveAttribute = svoxMesh => {
  const { positions, indices, groups, materials } = svoxMesh;
  const emissive = new Float32Array(positions.length);

  for (const { start, count, materialIndex } of groups) {
    const material = materials[materialIndex];
    if (!material || !material.emissive) continue;

    const intensity = parseFloat(material.emissiveIntensity);
    if (!(intensity > 0)) continue;

    const { r, g, b } = Color.fromHex(material.emissive);

    for (let i = start, end = start + count; i < end; i++) {
      const v = indices[i] * 3;
      emissive[v] = r * intensity;
      emissive[v + 1] = g * intensity;
      emissive[v + 2] = b * intensity;
    }
  }

  svoxMesh.data = [...(svoxMesh.data || []), { name: "svoxEmissive", values: emissive, width: 3 }];
  return emissive;
};

self.onmessage = ({
  data: {
    id,
    payload: { voxId, iFrame, modelString, voxelPackage }
  }
}) => {
  const model = ModelReader.readFromString(modelString, EMPTY_OBJECT, true /* skip voxels */);
  model.voxels = new Voxels(...voxelPackage);

  const svoxMesh = SvoxMeshGenerator.generate(model, svoxBuffers);
  const emissive = addEmissiveAttribute(svoxMesh);

  self.postMessage({ id, result: { voxId, iFrame, svoxMesh } }, [
    svoxMesh.positions.buffer,
    svoxMesh.normals.buffer,
    svoxMesh.colors.buffer,
    svoxMesh.indices.buffer,
    svoxMesh.uvs.buffer,
    emissive.buffer
  ]);
};
