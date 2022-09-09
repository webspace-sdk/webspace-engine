const { BufferGeometry, Float32BufferAttribute, InstancedBufferAttribute, Vector3 } = THREE;

const BEAM_HEIGHT = 14;

class SkyBeamBufferGeometry extends BufferGeometry {
  constructor(instanceCount) {
    super();

    this.type = "SkyBeamBufferGeometry";
    this.instanceAttributes = []; // For DynamicMultiInstancedMesh
    const widthSegments = 2;
    const heightSegments = 3;
    const flipY = true;
    const height = BEAM_HEIGHT;

    const indices = [];
    const vertices = [];
    const normals = [];
    const uvs = [];
    const alphas = [];
    const illuminations = [];
    const xOffsets = [];

    const height_half = height / 2;

    const gridX = Math.floor(widthSegments) || 1;
    const gridY = Math.floor(heightSegments) || 1;

    const gridX1 = gridX + 1;
    const gridY1 = gridY + 1;

    const segment_width = 0;
    const segment_height = height / gridY;

    let ix, iy;

    for (iy = 0; iy < gridY1; iy++) {
      const y = iy * segment_height - height_half;
      for (ix = 0; ix < gridX1; ix++) {
        const x = ix * segment_width;
        vertices.push(x, -y, 0);
        normals.push(0, 0, 1);

        uvs.push(ix / gridX);
        uvs.push(flipY ? 1 - iy / gridY : iy / gridY);

        if (iy === gridY1 - 1) {
          illuminations.push(0.5);
        } else {
          illuminations.push(0.0);
        }

        // Blend alpha to zero at top
        if (iy === 0 || iy == gridY1 - 1) {
          alphas.push(0.0);
        } else {
          alphas.push(1.0);
        }

        xOffsets.push(ix === 0 ? -1 : 1);
      }
    }

    for (iy = 0; iy < gridY; iy++) {
      for (ix = 0; ix < gridX; ix++) {
        const a = ix + gridX1 * iy;
        const b = ix + gridX1 * (iy + 1);
        const c = ix + 1 + gridX1 * (iy + 1);
        const d = ix + 1 + gridX1 * iy;

        // Vert on both sides
        indices.push(a, b, d);
        indices.push(b, c, d);
        indices.push(d, b, a);
        indices.push(d, c, b);
      }
    }

    this.setIndex(indices);
    this.setAttribute("position", new Float32BufferAttribute(vertices, 3));
    this.setAttribute("normal", new Float32BufferAttribute(normals, 3));
    this.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
    this.setAttribute("alpha", new Float32BufferAttribute(alphas, 1));
    this.setAttribute("illumination", new Float32BufferAttribute(illuminations, 1));
    this.setAttribute("xOffset", new Float32BufferAttribute(xOffsets, 1));

    const colors = [];

    for (let i = 0; i < instanceCount; i++) {
      colors.push(...[0.0, 0.0, 0.0]);
    }

    const widths = [];

    for (let i = 0; i < instanceCount; i++) {
      widths.push(0.0);
    }

    const instanceColorAttribute = new InstancedBufferAttribute(new Float32Array(colors), 3);
    this.setAttribute("instanceColor", instanceColorAttribute);
    this.instanceAttributes.push([Vector3, instanceColorAttribute]);

    const instanceWidthAttribute = new InstancedBufferAttribute(new Float32Array(widths), 1);
    this.setAttribute("instanceWidth", instanceWidthAttribute);
    this.instanceAttributes.push([Number, instanceWidthAttribute]);
  }
}

export { SkyBeamBufferGeometry, BEAM_HEIGHT };
