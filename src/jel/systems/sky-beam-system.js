import { DynamicInstancedMesh } from "../objects/DynamicInstancedMesh";
import { RENDER_ORDER } from "../../hubs/constants";
import { WORLD_SIZE, VOXELS_PER_CHUNK, VOXEL_SIZE } from "./terrain-system";
import { SkyBeamBufferGeometry } from "../objects/sky-beam-buffer-geometry";

const { ShaderMaterial, MeshBasicMaterial, Matrix4, ShaderLib, UniformsUtils, Vector3 } = THREE;

const IDENTITY = new Matrix4();
const ZERO = new Vector3();
const UP = new Vector3(0, 1, 0);
const tmpMatrix = new Matrix4();
const tmpPos = new Vector3();
const tmpPos2 = new Vector3();

const beamMaterial = new ShaderMaterial({
  name: "beam",
  fog: false,
  fragmentShader: ShaderLib.basic.fragmentShader,
  vertexShader: ShaderLib.basic.vertexShader,
  lights: false,
  transparent: true,
  defines: {
    ...new MeshBasicMaterial().defines
  },
  uniforms: {
    ...UniformsUtils.clone(ShaderLib.standard.uniforms)
  }
});

//beamMaterial.uniforms.shininess.value = 0.0001;
//beamMaterial.uniforms.diffuse.value = new Color(0.5, 0.5, 0.5);

beamMaterial.stencilWrite = true; // Avoid SSAO
beamMaterial.stencilFunc = THREE.AlwaysStencilFunc;
beamMaterial.stencilRef = 2;
beamMaterial.stencilZPass = THREE.ReplaceStencilOp;

beamMaterial.onBeforeCompile = shader => {
  // Add shader code to add decals
  shader.vertexShader = shader.vertexShader.replace(
    "#include <uv2_pars_vertex>",
    [
      "#include <uv2_pars_vertex>",
      "attribute vec3 instanceColor;",
      "varying vec3 vInstanceColor;",
      "attribute float instanceAlpha;",
      "varying float vInstanceAlpha;",
      "attribute float instanceIndex;"
    ].join("\n")
  );

  shader.vertexShader = shader.vertexShader.replace(
    "#include <color_vertex>",
    ["#include <color_vertex>", "vInstanceColor = instanceColor; vInstanceAlpha = instanceAlpha;"].join("\n")
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <color_pars_fragment>",
    ["#include <color_pars_fragment>", "varying vec3 vInstanceColor; varying float vInstanceAlpha;"].join("\n")
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <color_fragment>",
    ["#include <color_fragment>", "diffuseColor.rgb = vInstanceColor.rgb;"].join("\n")
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <tonemapping_fragment>",
    ["gl_FragColor.a = vInstanceAlpha;", "#include <tonemapping_fragment>"].join("\n")
  );
};

const MAX_BEAMS = 256;

// Draws instanced sky beams.
export class SkyBeamSystem {
  constructor(sceneEl) {
    this.sceneEl = sceneEl;
    this.beamEls = Array(MAX_BEAMS).fill(null);
    this.dirtyMatrices = Array(MAX_BEAMS).fill(0);
    this.dirtyColors = Array(MAX_BEAMS).fill(false);

    this.maxRegisteredIndex = -1;

    this.createMesh();
  }

  register(el) {
    const index = this.mesh.addInstance(ZERO, 0.0, IDENTITY);
    this.maxRegisteredIndex = Math.max(index, this.maxRegisteredIndex);
    this.beamEls[index] = el;
    this.dirtyMatrices[index] = 0;
    this.dirtyColors[index] = true;
  }

  unregister(el) {
    for (let i = 0; i <= this.maxRegisteredIndex; i++) {
      if (el === this.beamEls[i]) {
        this.beamEls[i] = null;
        this.mesh.freeInstance(i);
        return;
      }
    }
  }

  markMatrixDirty(el) {
    for (let i = 0; i <= this.maxRegisteredIndex; i++) {
      if (this.beamEls[i] === el) {
        this.dirtyMatrices[i] = 1;
        return;
      }
    }
  }

  createMesh() {
    this.mesh = new DynamicInstancedMesh(new SkyBeamBufferGeometry(MAX_BEAMS), beamMaterial, MAX_BEAMS);
    this.mesh.renderOrder = RENDER_ORDER.INSTANCED_BEAM;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.mesh.frustumCulled = false;
    this.instanceColorAttribute = this.mesh.geometry.instanceAttributes[0][1];
    this.instanceAlphaAttribute = this.mesh.geometry.instanceAttributes[1][1];

    this.sceneEl.object3D.add(this.mesh);
  }

  tick() {
    const {
      beamEls,
      maxRegisteredIndex,
      instanceColorAttribute,
      instanceAlphaAttribute,
      mesh,
      dirtyMatrices,
      dirtyColors
    } = this;

    let instanceMatrixNeedsUpdate = false,
      instanceColorNeedsUpdate = false,
      instanceAlphaNeedsUpdate = false;

    const camera = this.sceneEl.camera;

    for (let i = 0; i <= maxRegisteredIndex; i++) {
      const el = beamEls[i];
      if (el === null) continue;

      const hasDirtyMatrix = true; //dirtyMatrices[i] > 0;
      const hasDirtyColor = true; //dirtyColors[i];

      if (hasDirtyColor) {
        const color = { r: 128, g: 0, b: 0 };

        instanceColorAttribute.array[i * 3 + 0] = color.r;
        instanceColorAttribute.array[i * 3 + 1] = color.g;
        instanceColorAttribute.array[i * 3 + 2] = color.b;

        instanceColorNeedsUpdate = true;
        dirtyColors[i] = false;
      }

      if (!hasDirtyMatrix && !hasDirtyColor) continue;

      if (hasDirtyMatrix) {
        const obj = beamEls[i].object3D;

        obj.updateMatrices();

        // Set position (x, z) from object
        let x = obj.matrixWorld.elements[12];
        let z = obj.matrixWorld.elements[14];

        tmpPos.x = x;
        tmpPos.y = 0;
        tmpPos.z = z;

        // Billboard the beam
        if (camera) {
          camera.updateMatrices();
          const cx = camera.matrixWorld.elements[12];
          const cz = camera.matrixWorld.elements[14];
          tmpPos2.x = cx;
          tmpPos2.y = 0;
          tmpPos2.z = cz;
          tmpMatrix.lookAt(tmpPos, tmpPos2, UP);
          mesh.setMatrixAt(i, tmpMatrix);

          // Constraint x and z to be before the far plane
          const farDistSq = camera.far * camera.far * 0.7;
          const maxDistSq = WORLD_SIZE * VOXELS_PER_CHUNK * VOXEL_SIZE * 2;
          const dcx = cx - x;
          const dcz = cz - z;
          const distSq = dcx * dcx + dcz * dcz;

          const ratio = 1.0 - farDistSq / distSq;

          const curAlpha = instanceAlphaAttribute.array[i];
          const alphaDistPct = Math.min(1.0, Math.abs(distSq / maxDistSq));
          console.log(distSq, maxDistSq, alphaDistPct);

          let newAlpha;
          const t1 = 0.08;
          const t2 = 0.8;

          // Three bands of alpha, close is zero alpha, then fade in, then
          // quick fade out at far distance.
          if (alphaDistPct < t1) {
            newAlpha = 0.0;
            // Scale to zero to hide
            mesh.instanceMatrix.array[i * 16 + 5] = 0.0;
          } else if (alphaDistPct < t2) {
            newAlpha = (alphaDistPct - t1 - (1.0 - t2)) / (t2 - t1) + 0.05;
            mesh.instanceMatrix.array[i * 16 + 5] = 1.0;
          } else {
            newAlpha = Math.max(0.2, 1.0 - (alphaDistPct - t2) / (1.0 - t2));
            mesh.instanceMatrix.array[i * 16 + 5] = 1.0;
          }

          if (Math.abs(curAlpha - newAlpha) > 0.01) {
            instanceAlphaAttribute.array[i] = newAlpha;
            instanceAlphaNeedsUpdate = true;
          }

          if (distSq > farDistSq) {
            x = x + dcx * ratio * 0.5;
            z = z + dcz * ratio * 0.5;
          }
        }

        mesh.instanceMatrix.array[i * 16 + 12] = x;
        mesh.instanceMatrix.array[i * 16 + 14] = z;

        instanceMatrixNeedsUpdate = true;

        dirtyMatrices[i] -= 1;
      }
    }

    instanceColorAttribute.needsUpdate = instanceColorNeedsUpdate;
    instanceAlphaAttribute.needsUpdate = instanceAlphaNeedsUpdate;
    mesh.instanceMatrix.needsUpdate = instanceMatrixNeedsUpdate;
  }
}
