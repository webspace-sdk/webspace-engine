const { BufferGeometry, Float32BufferAttribute, InstancedBufferAttribute, Vector3, Vector4 } = THREE;

const OUTLINE_SIZE = 0.05;
const HIGHLIGHT_SIZE = 0.15;

class AvatarSphereBufferGeometry extends BufferGeometry {
  constructor(coreRadius, instanceCount) {
    super();

    this.type = "SphereBufferGeometry";
    this.instanceAttributes = []; // For DynamicMultiInstancedMesh

    const indices = [];
    const vertices = [];
    const normals = [];
    const uvs = [];
    const duvs = [];
    const colorScales = [];

    const addLayer = (
      radius,
      widthSegments,
      heightSegments,
      phiStart,
      phiLength,
      thetaStart,
      thetaLength,
      dw,
      colorScale,
      invert
    ) => {
      const layerIndexOffset = vertices.length / 3;
      const thetaEnd = Math.min(thetaStart + thetaLength, Math.PI);

      let ix, iy;
      let index = 0;
      const grid = [];

      const vertex = new Vector3();
      const normal = new Vector3();

      // buffers

      // generate vertices, normals and uvs
      for (iy = 0; iy <= heightSegments; iy++) {
        const verticesRow = [];

        const v = iy / heightSegments;

        // special case for the poles

        let uOffset = 0;

        if (iy == 0 && thetaStart == 0) {
          uOffset = 0.5 / widthSegments;
        } else if (iy == heightSegments && thetaEnd == Math.PI) {
          uOffset = -0.5 / widthSegments;
        }

        for (ix = 0; ix <= widthSegments; ix++) {
          const u = ix / widthSegments;

          // vertex

          vertex.x = -radius * Math.cos(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength);
          vertex.y = radius * Math.cos(thetaStart + v * thetaLength);
          vertex.z = radius * Math.sin(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength);

          vertices.push(vertex.x, vertex.y, vertex.z);
          colorScales.push(colorScale);

          // normal

          normal.copy(vertex).normalize();

          const n = invert ? -1 : 1;
          normals.push(normal.x * n, normal.y * n, normal.z * n);

          // uv

          uvs.push(u + uOffset, v);

          //const phiScale = phiLength / Math.PI;
          const thetaScale = thetaLength > Math.PI ? 2.0 : 1.0;

          const phiScale = 1.0;

          duvs.push((u + uOffset) * phiScale, v * thetaScale, dw);

          // TODO add color and decal UVs to instances
          verticesRow.push(index++);
        }

        grid.push(verticesRow);
      }

      // indices

      for (iy = 0; iy < heightSegments; iy++) {
        for (ix = 0; ix < widthSegments; ix++) {
          const a = grid[iy][ix + 1] + layerIndexOffset;
          const b = grid[iy][ix] + layerIndexOffset;
          const c = grid[iy + 1][ix] + layerIndexOffset;
          const d = grid[iy + 1][ix + 1] + layerIndexOffset;

          if (iy !== 0 || thetaStart > 0) indices.push(...(invert ? [d, b, a] : [a, b, d]));
          if (iy !== heightSegments - 1 || thetaEnd < Math.PI) indices.push(...(invert ? [d, c, b] : [b, c, d]));
        }
      }

      // build geometry
    };

    addLayer(coreRadius, 30, 30, 0, Math.PI * 2.0, 0, Math.PI, 2.0, 1.0, false);

    // Upper
    addLayer(
      coreRadius + 0.005,
      12,
      12,
      Math.PI / 6.0,
      (Math.PI * 2.0) / 3.0,
      Math.PI / 6.0,
      (Math.PI * 2.0) / 6.0 - 0.001,
      0.0,
      1.0,
      false
    );

    // Lower
    addLayer(
      coreRadius + 0.005,
      12,
      12,
      Math.PI / 6.0,
      (Math.PI * 2.0) / 3.0,
      Math.PI / 2.0 + 0.001,
      (Math.PI * 2.0) / 6.0,
      1.0,
      1.0,
      false
    );

    // Outline
    addLayer(coreRadius + 0.01 + coreRadius * OUTLINE_SIZE, 30, 30, 0, Math.PI * 2.0, 0, Math.PI, 2.0, 0.0, true);

    // Highlight
    addLayer(
      coreRadius + 0.01 + coreRadius * HIGHLIGHT_SIZE,
      30,
      30,
      0,
      Math.PI * 2.0,
      0,
      Math.PI,
      2.0,
      100000.0,
      true
    );

    this.setIndex(indices);
    this.setAttribute("position", new Float32BufferAttribute(vertices, 3));
    this.setAttribute("normal", new Float32BufferAttribute(normals, 3));
    this.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
    this.setAttribute("duv", new Float32BufferAttribute(duvs, 3));
    this.setAttribute("colorScale", new Float32BufferAttribute(colorScales, 1));

    const duvOffsets = [];

    for (let i = 0; i < instanceCount; i++) {
      duvOffsets.push(...[0.0, 0.0, 0.0, 0.0]); // Upper, lower duv offset
    }

    const colors = [];

    for (let i = 0; i < instanceCount; i++) {
      colors.push(...[0.0, 0.0, 0.0]);
    }

    const duvOffsetAttribute = new InstancedBufferAttribute(new Float32Array(duvOffsets), 4);
    this.setAttribute("duvOffset", duvOffsetAttribute);
    this.instanceAttributes.push([Vector4, duvOffsetAttribute]);

    const instanceColorAttribute = new InstancedBufferAttribute(new Float32Array(colors), 3);
    this.setAttribute("instanceColor", instanceColorAttribute);
    this.instanceAttributes.push([Vector3, instanceColorAttribute]);
  }
}

export { AvatarSphereBufferGeometry };
