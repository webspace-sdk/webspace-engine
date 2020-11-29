const { BufferGeometry, Float32BufferAttribute, InstancedBufferAttribute, Vector3 } = THREE;

const BEAM_HEIGHT = 14;

function SkyBeamBufferGeometry(instanceCount) {
  BufferGeometry.call(this);

  this.type = "SkyBeamBufferGeometry";
  this.instanceAttributes = []; // For DynamicMultiInstancedMesh
  const widthSegments = 2;
  const heightSegments = 4;
  const flipY = true;
  const width = 0.3;
  const height = BEAM_HEIGHT;

  const indices = [];
  const vertices = [];
  const normals = [];
  const uvs = [];
  const valphas = [];

  const width_half = width / 2;
  const height_half = height / 2;

  const gridX = Math.floor(widthSegments) || 1;
  const gridY = Math.floor(heightSegments) || 1;

  const gridX1 = gridX + 1;
  const gridY1 = gridY + 1;

  const segment_width = width / gridX;
  const segment_height = height / gridY;

  let ix, iy;

  for (iy = 0; iy < gridY1; iy++) {
    const y = iy * segment_height - height_half;
    for (ix = 0; ix < gridX1; ix++) {
      const x = ix * segment_width - width_half;
      vertices.push(x, -y, 0);
      normals.push(0, 0, 1);

      uvs.push(ix / gridX);
      uvs.push(flipY ? 1 - iy / gridY : iy / gridY);

      // Blend alpha to zero at top
      if (iy === 0 || iy == gridY1 - 1) {
        valphas.push(0.0);
      } else {
        valphas.push(1.0);
      }
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
  this.setAttribute("alpha", new Float32BufferAttribute(valphas, 1));

  const colors = [];
  const alphas = [];

  for (let i = 0; i < instanceCount; i++) {
    colors.push(...[0.0, 0.0, 0.0]);
  }

  for (let i = 0; i < instanceCount; i++) {
    alphas.push(0.0);
  }

  const instanceColorAttribute = new InstancedBufferAttribute(new Float32Array(colors), 3);
  this.setAttribute("instanceColor", instanceColorAttribute);
  this.instanceAttributes.push([Vector3, instanceColorAttribute]);

  const instanceAlphaAttribute = new InstancedBufferAttribute(new Float32Array(alphas), 1);
  this.setAttribute("instanceAlpha", instanceAlphaAttribute);
  this.instanceAttributes.push([Number, instanceAlphaAttribute]);
}

SkyBeamBufferGeometry.prototype = Object.create(BufferGeometry.prototype);
SkyBeamBufferGeometry.prototype.constructor = SkyBeamBufferGeometry;

export { SkyBeamBufferGeometry, BEAM_HEIGHT };
