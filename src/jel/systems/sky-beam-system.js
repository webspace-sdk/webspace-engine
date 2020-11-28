import { DynamicInstancedMesh } from "../objects/DynamicInstancedMesh";
import { RENDER_ORDER } from "../../hubs/constants";
import { SkyBeamBufferGeometry } from "../objects/sky-beam-buffer-geometry";

const { ShaderMaterial, MeshBasicMaterial, Matrix4, ShaderLib, UniformsUtils, Vector4 } = THREE;

const IDENTITY = new Matrix4();
const ZERO = new Vector4();
ZERO.w = 0.0;

const beamMaterial = new ShaderMaterial({
  name: "beam",
  fog: false,
  fragmentShader: ShaderLib.basic.fragmentShader,
  vertexShader: ShaderLib.basic.vertexShader,
  lights: false,
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

//avatarMaterial.onBeforeCompile = shader => {
//  // Float oscillation, vary period and freq by instance index
//  const postCurveShader = [
//    "gl_Position.y = gl_Position.y + sin(time * TWOPI * 0.001 * (mod(instanceIndex, 10.0) / 7.0) + instanceIndex * 7.0) * 0.025;"
//  ].join("\n");
//
//  addVertexCurvingToShader(shader, postCurveShader);
//
//  // Add shader code to add decals
//  shader.vertexShader = shader.vertexShader.replace(
//    "#include <uv2_pars_vertex>",
//    [
//      "#include <uv2_pars_vertex>",
//      "attribute vec3 instanceColor;",
//      "varying vec3 vInstanceColor;",
//      "uniform float time;",
//      "attribute vec3 duv;",
//      "varying vec3 vDuv;",
//      "attribute float colorScale;",
//      "varying float vColorScale;",
//      "attribute vec4 duvOffset;",
//      "attribute float instanceIndex;",
//      "varying vec4 vDuvOffset;"
//    ].join("\n")
//  );
//
//  shader.vertexShader = shader.vertexShader.replace(
//    "#include <color_vertex>",
//    [
//      "#include <color_vertex>",
//      "vDuv = duv;",
//      "vDuvOffset = duvOffset;",
//      "vColorScale = colorScale;",
//      "vInstanceColor = instanceColor;"
//    ].join("\n")
//  );
//
//  shader.fragmentShader = shader.fragmentShader.replace(
//    "#include <gradientmap_pars_fragment>",
//    [
//      "#include <gradientmap_pars_fragment>",
//      "precision highp sampler2D;",
//      "uniform sampler2D decalMap;",
//      "varying vec3 vDuv;",
//      "varying vec4 vDuvOffset;",
//      "varying vec3 vInstanceColor;",
//      "varying float vColorScale;"
//    ].join("\n")
//  );
//
//  shader.fragmentShader = shader.fragmentShader.replace(
//    "#include <color_fragment>",
//    ["#include <color_fragment>", "diffuseColor.rgb = vInstanceColor.rgb;"].join("\n")
//  );
//
//  shader.fragmentShader = shader.fragmentShader.replace(
//    "#include <tonemapping_fragment>",
//    [
//      // Refactored below: "float duOffset = vDuv.z == 0.0 ? vDuvOffset.x : vDuvOffset.z;",
//      "float clampedLayer = clamp(vDuv.z, 0.0, 1.0);",
//      "float duOffset = mix(vDuvOffset.x, vDuvOffset.z, clampedLayer);",
//      "float dvOffset = mix(vDuvOffset.y, vDuvOffset.w, clampedLayer);",
//      "vec4 texel = texture(decalMap, vec2(vDuv.x / 8.0 + duOffset / 8.0, vDuv.y / 16.0 + dvOffset / 16.0 + vDuv.z * 0.5));",
//      "vec3 color = gl_FragColor.rgb * (1.0 - texel.a) + texel.rgb * texel.a;",
//      "vec3 scaled = clamp(max(color * vColorScale, step(1.1, vColorScale)), 0.0, 1.0);",
//      "gl_FragColor = vec4(scaled, gl_FragColor.a);",
//      "#include <tonemapping_fragment>"
//    ].join("\n")
//  );
//};

const MAX_BEAMS = 128;

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
    const index = this.mesh.addInstance(ZERO, ZERO, IDENTITY);
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
    this.mesh = new DynamicInstancedMesh(new SkyBeamBufferGeometry(), beamMaterial, MAX_BEAMS);
    this.mesh.renderOrder = RENDER_ORDER.INSTANCED_BEAM;
    this.mesh.castShadow = true;
    this.instanceColorAttribute = this.mesh.geometry.instanceAttributes[0][1];

    this.sceneEl.object3D.add(this.mesh);
  }

  tick() {
    if (!this.loadedDecals) {
      this.loadDecalMap();
      this.loadedDecals = true;
    }

    const { beamEls, maxRegisteredIndex, instanceColorAttribute, mesh, dirtyMatrices, dirtyColors } = this;

    let instanceMatrixNeedsUpdate = false,
      instanceColorNeedsUpdate = false;

    for (let i = 0; i <= maxRegisteredIndex; i++) {
      const el = beamEls[i];
      if (el === null) continue;

      const hasDirtyMatrix = dirtyMatrices[i] > 0;
      const hasDirtyColor = dirtyColors[i];

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

        mesh.setMatrixAt(i, obj.matrixWorld);
        instanceMatrixNeedsUpdate = true;

        dirtyMatrices[i] -= 1;
      }
    }

    instanceColorAttribute.needsUpdate = instanceColorNeedsUpdate;
    mesh.instanceMatrix.needsUpdate = instanceMatrixNeedsUpdate;
  }
}
