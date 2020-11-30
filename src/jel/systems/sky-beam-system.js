import { DynamicInstancedMesh } from "../objects/DynamicInstancedMesh";
import { RENDER_ORDER } from "../../hubs/constants";
import { SkyBeamBufferGeometry, BEAM_HEIGHT } from "../objects/sky-beam-buffer-geometry";
import { addVertexCurvingToShader } from "./terrain-system";

const { Color, ShaderMaterial, MeshBasicMaterial, Matrix4, ShaderLib, UniformsUtils, Vector3 } = THREE;

const IDENTITY = new Matrix4();
const ZERO = new Vector3();

const PCT_BEAMS_TO_UPDATE_PER_FRAME = 0.1;

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
    ...UniformsUtils.clone(ShaderLib.basic.uniforms)
  }
});

beamMaterial.uniforms.diffuse.value = new Color(0.5, 0.5, 0.5);

beamMaterial.stencilWrite = true; // Avoid SSAO
beamMaterial.stencilFunc = THREE.AlwaysStencilFunc;
beamMaterial.stencilRef = 2;
beamMaterial.stencilZPass = THREE.ReplaceStencilOp;

beamMaterial.onBeforeCompile = shader => {
  addVertexCurvingToShader(shader);

  // Add shader code to add decals
  shader.vertexShader = shader.vertexShader.replace(
    "#include <uv2_pars_vertex>",
    [
      "#include <uv2_pars_vertex>",
      "attribute vec3 instanceColor;",
      "varying vec3 vInstanceColor;",
      "varying float vBeamAlpha;",
      "attribute float alpha;",
      "varying float vAlpha;",
      "attribute float illumination;",
      "varying float vIllumination;",
      "attribute float xOffset;",
      "varying float vXOffset;",
      "attribute float instanceIndex;"
    ].join("\n")
  );

  shader.vertexShader = shader.vertexShader.replace(
    "#include <color_vertex>",
    [
      "#include <color_vertex>",
      "vXOffset = xOffset; vIllumination = illumination; vAlpha = alpha; vInstanceColor = instanceColor;"
    ].join("\n")
  );

  shader.vertexShader = shader.vertexShader.replace(
    "#include <fog_vertex>",
    [
      "#include <fog_vertex>",
      // Avoid clipping by clamping by far distance
      "mvPosition.z = min(mvPosition.z, gl_Position.w - 0.01);",
      "gl_Position.z = min(gl_Position.z, gl_Position.w - 0.01);",
      // Alpha increases with distance
      "vBeamAlpha = clamp(gl_Position.z * gl_Position.z / 2800.0, 0.06, 0.7);",
      // Perform offset in view space to give beam width
      "gl_Position.x = gl_Position.x + vXOffset;",
      // Clip verts to hide them if too close, to skip drawing this beam to avoid stencil buffer write.
      "gl_Position.w = gl_Position.w * step(11.5, gl_Position.z);"
    ].join("\n")
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <color_pars_fragment>",
    [
      "#include <color_pars_fragment>",
      "varying float vXOffset; varying float vIllumination; varying float vAlpha; varying vec3 vInstanceColor; varying float vBeamAlpha;"
    ].join("\n")
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <color_fragment>",
    [
      "#include <color_fragment>",
      "diffuseColor.rgb = vInstanceColor.rgb;",
      "diffuseColor.rgb = clamp(diffuseColor.rgb + vIllumination, 0.0, 1.0);"
    ].join("\n")
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <tonemapping_fragment>",
    ["gl_FragColor.a = vBeamAlpha * vAlpha;", "#include <tonemapping_fragment>"].join("\n")
  );
};

const MAX_BEAMS = 256;

// Draws instanced sky beams.
export class SkyBeamSystem {
  constructor(sceneEl) {
    this.sceneEl = sceneEl;
    this.beamEls = Array(MAX_BEAMS).fill(null);

    this.maxRegisteredIndex = -1;

    this.createMesh();
    this.beamUpdateIndex = 0;
  }

  register(el) {
    const index = this.mesh.addInstance(ZERO, IDENTITY);
    this.maxRegisteredIndex = Math.max(index, this.maxRegisteredIndex);
    this.beamEls[index] = el;
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

  createMesh() {
    this.mesh = new DynamicInstancedMesh(new SkyBeamBufferGeometry(MAX_BEAMS), beamMaterial, MAX_BEAMS);
    this.mesh.renderOrder = RENDER_ORDER.INSTANCED_BEAM;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.mesh.frustumCulled = false;
    this.instanceColorAttribute = this.mesh.geometry.instanceAttributes[0][1];

    this.sceneEl.object3D.add(this.mesh);
  }

  tick() {
    if (this.maxRegisteredIndex === -1) return;

    const { beamEls, maxRegisteredIndex, instanceColorAttribute, mesh } = this;

    const numToUpdate = Math.max(1, Math.floor((maxRegisteredIndex + 1) * PCT_BEAMS_TO_UPDATE_PER_FRAME));

    let instanceColorNeedsUpdate = false,
      instanceMatrixNeedsUpdate = false;

    for (let i = 0; i < numToUpdate; i++) {
      this.beamUpdateIndex++;

      const idx = this.beamUpdateIndex % (maxRegisteredIndex + 1);
      const el = beamEls[idx];
      if (el === null) continue;

      const r = 0.1;
      const g = 0.6;
      const b = 0.8;

      const carray = instanceColorAttribute.array;
      const cr = carray[idx * 3];
      const cg = carray[idx * 3 + 1];
      const cb = carray[idx * 3 + 2];

      if (Math.abs(r - cr) > 0.01 || Math.abs(g - cg) > 0.01 || Math.abs(b - cb) > 0.01) {
        carray[idx * 3] = r;
        carray[idx * 3 + 1] = g;
        carray[idx * 3 + 2] = b;

        instanceColorNeedsUpdate = true;
      }

      const obj = el.object3D;

      obj.updateMatrices();

      const elements = obj.matrixWorld.elements;
      const array = mesh.instanceMatrix.array;

      // See if position changed, if so, update
      const x = elements[12];
      const y = elements[13] + BEAM_HEIGHT / 2;
      const z = elements[14];

      const cx = array[idx * 16 + 12];
      const cy = array[idx * 16 + 13];
      const cz = array[idx * 16 + 14];

      if (Math.abs(x - cx) > 0.01 || Math.abs(y - cy) > 0.01 || Math.abs(z - cz) > 0.01) {
        array[idx * 16 + 12] = x;
        array[idx * 16 + 13] = y;
        array[idx * 16 + 14] = z;

        instanceMatrixNeedsUpdate = true;
      }
    }

    instanceColorAttribute.needsUpdate = instanceColorNeedsUpdate;
    mesh.instanceMatrix.needsUpdate = instanceMatrixNeedsUpdate;
  }
}
