import { DynamicInstancedMesh } from "../objects/DynamicInstancedMesh";
import { RENDER_ORDER } from "../constants-2";
import { SkyBeamBufferGeometry, BEAM_HEIGHT } from "../objects/sky-beam-buffer-geometry";
import { addVertexCurvingToShader } from "./terrain-system";
import { getCreator, getNetworkedEntity } from "../utils/ownership-utils";
import { WORLD_MATRIX_CONSUMERS } from "../utils/threejs-world-update";
const BEAM_Y_OFFSET = BEAM_HEIGHT / 2;

const { Color, ShaderMaterial, MeshBasicMaterial, Matrix4, ShaderLib, UniformsUtils, Vector3 } = THREE;

const IDENTITY = new Matrix4();
const ZERO = new Vector3();

const NARROW_BEAM_WIDTH = 0.1;
const WIDE_BEAM_WIDTH = 0.4;

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
      "attribute float instanceWidth;",
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
      "gl_Position.x = gl_Position.x + (vXOffset * instanceWidth);",
      // Clip verts to hide them if too close, to skip drawing this beam to avoid stencil buffer write.
      "gl_Position.w = gl_Position.w * step(11.5, gl_Position.z);"
    ].join("\n")
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <color_pars_fragment>",
    [
      "#include <color_pars_fragment>",
      "varying float vIllumination; varying float vAlpha; varying vec3 vInstanceColor; varying float vBeamAlpha;"
    ].join("\n")
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <color_fragment>",
    ["#include <color_fragment>", "diffuseColor.rgb = clamp(vInstanceColor.rgb + vIllumination, 0.0, 1.0);"].join("\n")
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <tonemapping_fragment>",
    ["gl_FragColor.a = vBeamAlpha * vAlpha;", "#include <tonemapping_fragment>"].join("\n")
  );
};

const MAX_BEAMS = 256;

// Draws instanced sky beams.
export class SkyBeamSystem {
  constructor(sceneEl, terrainSystem) {
    this.sceneEl = sceneEl;
    this.beamSources = Array(MAX_BEAMS).fill(null);
    this.sourceToIndex = new Map();
    this.dirtyColors = Array(MAX_BEAMS).fill(false);
    this.sourceCreatorIds = Array(MAX_BEAMS).fill(null);
    this.terrainSystem = terrainSystem;

    this.maxRegisteredIndex = -1;
    this.frame = 0;

    this.createMesh();
  }

  register(source, isAvatar = false) {
    if (this.sourceToIndex.has(source)) return;

    // No sky beams on worlds with full draw distance.
    if (!this.terrainSystem.worldTypeHasFog()) return;

    const index = this.mesh.addInstance(ZERO, 0.0, IDENTITY);
    this.maxRegisteredIndex = Math.max(index, this.maxRegisteredIndex);
    this.sourceToIndex.set(source, index);
    this.beamSources[index] = source;
    this.dirtyColors[index] = true;
    this.instanceWidthAttribute.array[index] = isAvatar ? WIDE_BEAM_WIDTH : NARROW_BEAM_WIDTH;
    this.instanceWidthAttribute.needsUpdate = true;
    source.matrixNeedsUpdate = true; // Ensure matrix dirty

    if (isAvatar) {
      getNetworkedEntity(source.el).then(e => (this.sourceCreatorIds[index] = getCreator(e)));
    }
  }

  unregister(source) {
    if (!this.sourceToIndex.has(source)) return;
    const i = this.sourceToIndex.get(source);
    this.beamSources[i] = null;
    this.sourceCreatorIds[i] = null;
    this.mesh.freeInstance(i);
    this.sourceToIndex.delete(source);
    source.matrixNeedsUpdate = true; // Ensure matrix dirty

    if (this.maxRegisteredIndex === i) {
      do {
        this.maxRegisteredIndex--;
      } while (this.maxRegisteredIndex >= 0 && this.beamSources[this.maxRegisteredIndex] === null);
    }
  }

  isRegistered(source) {
    return this.sourceToIndex.has(source);
  }

  markColorDirtyForCreator(creatorId) {
    for (let i = 0; i <= this.maxRegisteredIndex; i++) {
      if (this.sourceCreatorIds[i] === creatorId) {
        this.dirtyColors[i] = true;
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
    this.instanceWidthAttribute = this.mesh.geometry.instanceAttributes[1][1];

    this.sceneEl.object3D.add(this.mesh);
  }

  tick() {
    if (!NAF.connection.presence) return;

    const { beamSources, sourceCreatorIds, maxRegisteredIndex, instanceColorAttribute, mesh, dirtyColors } = this;
    if (maxRegisteredIndex === -1) return;

    this.frame++;

    let instanceMatrixNeedsUpdate = false,
      instanceColorNeedsUpdate = false;

    for (let i = 0; i <= maxRegisteredIndex; i++) {
      const source = beamSources[i];
      if (source === null) continue;

      const hasDirtyMatrix = source.consumeIfDirtyWorldMatrix(WORLD_MATRIX_CONSUMERS.BEAMS);
      const hasDirtyColor = dirtyColors[i];

      if (hasDirtyColor) {
        let color = { r: 0.1, g: 0.6, b: 0.8 };

        // Check if the color is for an avatar and is in presence
        const creatorId = sourceCreatorIds[i];

        const presenceState = NAF.connection.getPresenceStateForClientId(creatorId);
        if (creatorId && presenceState?.profile?.persona) {
          color = presenceState.profile.persona.avatar.primary_color;
        }

        instanceColorAttribute.array[i * 3 + 0] = color.r;
        instanceColorAttribute.array[i * 3 + 1] = color.g;
        instanceColorAttribute.array[i * 3 + 2] = color.b;

        instanceColorNeedsUpdate = true;
        dirtyColors[i] = false;
      }

      if (!hasDirtyMatrix && !hasDirtyColor) continue;

      if (hasDirtyMatrix) {
        source.updateMatrices();

        // Set position (x, z) from object
        const elements = source.matrixWorld.elements;
        const array = mesh.instanceMatrix.array;

        const x = elements[12];
        const y = elements[13];
        const z = elements[14];

        array[i * 16 + 12] = x;
        array[i * 16 + 13] = y + BEAM_Y_OFFSET;
        array[i * 16 + 14] = z;

        instanceMatrixNeedsUpdate = true;
      }
    }

    instanceColorAttribute.needsUpdate = instanceColorNeedsUpdate;
    mesh.instanceMatrix.needsUpdate = instanceMatrixNeedsUpdate;
  }
}
