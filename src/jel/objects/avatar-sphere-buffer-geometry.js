const { BufferGeometry, Float32BufferAttribute, Vector3 } = THREE;

const MAP_COORD_UPPER = 0;
const MAP_COORD_LOWER = 1;
const MAP_COORD_POLES = 2;

function AvatarSphereBufferGeometry(radius, invert = false) {
  BufferGeometry.call(this);

  this.type = "SphereBufferGeometry";

  radius = radius || 1;

  const widthSegments = 30;
  const heightSegments = 30;
  const mapSegmentLength = Math.floor(heightSegments / 3);

  const phiStart = 0;
  const phiLength = Math.PI * 2;

  const thetaStart = 0;
  const thetaLength = Math.PI;

  const thetaEnd = Math.PI;

  let ix, iy;

  let index = 0;
  const grid = [];

  const vertex = new Vector3();
  const normal = new Vector3();

  // buffers

  const indices = [];
  const vertices = [];
  const normals = [];
  const uvs = [];
  const duvs = [];

  // generate vertices, normals and uvs

  for (iy = 0; iy <= heightSegments; iy++) {
    const verticesRow = [];

    // Decal u, v, w
    let dv, dw;

    if (iy <= mapSegmentLength * 0.5) {
      dw = MAP_COORD_POLES;
      dv = iy / mapSegmentLength;
    } else if (iy <= mapSegmentLength * 1.5) {
      dw = MAP_COORD_UPPER;
      dv = (iy - mapSegmentLength * 0.5) / mapSegmentLength;
    } else if (iy <= mapSegmentLength * 2.5) {
      dw = MAP_COORD_LOWER;
      dv = (iy - mapSegmentLength * 1.5) / mapSegmentLength;
    } else {
      dw = MAP_COORD_POLES;
      dv = 0.5 + (iy - mapSegmentLength * 2.5) / mapSegmentLength;
    }

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

      // normal

      normal.copy(vertex).normalize();

      const n = invert ? -1 : 1;
      normals.push(normal.x * n, normal.y * n, normal.z * n);

      // uv

      uvs.push(u + uOffset, 1 - v);
      duvs.push(u + uOffset, dv, dw);

      // TODO add color and decal UVs to instances
      verticesRow.push(index++);
    }

    grid.push(verticesRow);
  }

  // indices

  for (iy = 0; iy < heightSegments; iy++) {
    for (ix = 0; ix < widthSegments; ix++) {
      const a = grid[iy][ix + 1];
      const b = grid[iy][ix];
      const c = grid[iy + 1][ix];
      const d = grid[iy + 1][ix + 1];

      if (iy !== 0 || thetaStart > 0) indices.push(...(invert ? [d, b, a] : [a, b, d]));
      if (iy !== heightSegments - 1 || thetaEnd < Math.PI) indices.push(...(invert ? [d, c, b] : [b, c, d]));
    }
  }

  // build geometry

  this.setIndex(indices);
  this.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  this.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  this.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
}

AvatarSphereBufferGeometry.prototype = Object.create(BufferGeometry.prototype);
AvatarSphereBufferGeometry.prototype.constructor = AvatarSphereBufferGeometry;

export { AvatarSphereBufferGeometry };
