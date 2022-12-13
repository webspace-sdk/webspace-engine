import waterImageSrc from "!!url-loader!../assets/jel/images/water.png";
import { almostEqualVec3 } from "../utils/three-utils";
import { Layers } from "../components/layers";
import { WORLD_SIZE, WORLD_RADIUS } from "../systems/terrain-system";
import { RENDER_ORDER } from "../constants-2";

/**
 * Zelda-style water shader from https://medium.com/@gordonnl/the-ocean-170fdfd659f1
 */
// TODO water plane seems to move when moving camera.

const {
  Mesh,
  PlaneBufferGeometry,
  ShaderMaterial,
  UniformsUtils,
  WebGLRenderTarget,
  RepeatWrapping,
  Plane,
  Matrix4,
  PerspectiveCamera,
  Vector3,
  Scene,
  RGBFormat,
  Vector4,
  LinearFilter,
  Texture,
  Color
} = THREE;

const waterImage = new Image();
waterImage.src = waterImageSrc;
const waterTexture = new Texture(waterImage);
waterTexture.wrapS = RepeatWrapping;
waterTexture.wrapT = RepeatWrapping;
waterImage.onload = () => (waterTexture.needsUpdate = true);

const noopBeforeRender = (renderer, scene, camera) => Scene.prototype.onBeforeRender(renderer, scene, camera);

const noopAfterRender = (renderer, scene, camera) => Scene.prototype.onAfterRender(renderer, scene, camera);

const WaterShader = {
  uniforms: {
    map: { type: "t", value: null },
    wave: { type: "t", value: null },
    time: { type: "f", value: 0 },
    reflections: { value: true },
    textureMatrix: { value: null },
    color: { type: "f", value: new Color("#0051da") }
  },

  vertexShader: [
    "#define SCALE 10.0",

    "varying vec4 vUv;",
    "varying vec2 vUv2;",

    "uniform float time;",
    "uniform mat4 textureMatrix;",

    "float calculateSurface(float x, float z) {",
    "    float y = 0.0;",
    "    y += (sin(x * 1.0 / SCALE + time * 1.0) + sin(x * 2.3 / SCALE + time * 1.5) + sin(x * 3.3 / SCALE + time * 0.4)) / 3.0;",
    "    y += (sin(z * 0.2 / SCALE + time * 1.8) + sin(z * 1.8 / SCALE + time * 1.8) + sin(z * 2.8 / SCALE + time * 0.8)) / 3.0;",
    "    return y;",
    "}",

    "void main() {",
    "    vUv = textureMatrix * vec4( position, 1.0 );",
    "    vUv2 = uv;",
    "    vec3 pos1 = position;",
    "    float strength = 0.020;",
    "    pos1.y += strength * calculateSurface(pos1.x, pos1.z);",
    "    pos1.y -= strength * calculateSurface(0.0, 0.0);",
    "",
    "#define cplx vec2",
    "#define cplx_new(re, im) vec2(re, im)",
    "#define cplx_re(z) z.x",
    "#define cplx_im(z) z.y",
    "#define cplx_exp(z) (exp(z.x) * cplx_new(cos(z.y), sin(z.y)))",
    "#define cplx_scale(z, scalar) (z * scalar)",
    "#define cplx_abs(z) (sqrt(z.x * z.x + z.y * z.y))",
    `float rp = ${WORLD_RADIUS.toFixed(2)};`,
    "vec4 pos = modelMatrix * vec4( pos1, 1.0 );",
    "vec2 planedir = normalize(vec2(pos.x - cameraPosition.x, pos.z - cameraPosition.z));",
    "cplx plane = cplx_new(pos.y - cameraPosition.y, sqrt((pos.x - cameraPosition.x) * (pos.x - cameraPosition.x) + (pos.z - cameraPosition.z) * (pos.z - cameraPosition.z)));",
    "cplx circle = rp * cplx_exp(cplx_scale(plane, 1.0 / rp)) - cplx_new(rp, 0);",
    "pos.x = cplx_im(circle) * planedir.x + cameraPosition.x;",
    "pos.z = cplx_im(circle) * planedir.y + cameraPosition.z;",
    "pos.y = cplx_re(circle) + cameraPosition.y;",
    "gl_Position = projectionMatrix * viewMatrix * pos;",
    "}  "
  ].join("\n"),

  fragmentShader: [
    "varying vec4 vUv;",
    "varying vec2 vUv2;",

    "uniform sampler2D map;",
    "uniform sampler2D wave;",
    "uniform float time;",
    "uniform float reflections;",
    "uniform vec3 color;",

    "float speed = 1.75;",

    "float blendOverlay( float base, float blend ) {",

    "  return( base < 0.5 ? ( 2.0 * base * blend ) : ( 1.0 - 2.0 * ( 1.0 - base ) * ( 1.0 - blend ) ) );",

    "}",

    "vec3 blendOverlay( vec3 base, vec3 blend ) {",

    "  return vec3( blendOverlay( base.r, blend.r ), blendOverlay( base.g, blend.g ), blendOverlay( base.b, blend.b ) );",

    "}",

    "void main() {",
    "     vec4 uv = vUv * 2.5 + vec4(sin(time) * -0.01 * speed);",
    `     vec2 uv2 = vUv2 * ${(WORLD_SIZE * 2).toFixed(2)} + vec2(time * -0.1 * speed);`,
    "     uv2.y += 0.01 * (sin(uv2.x * 3.5 + time * 0.7 * speed) + sin(uv2.x * 4.8 + time * 1.05 * speed) + sin(uv2.x * 7.3 + time * 0.9 * speed)) / 3.0;",
    "     uv2.x += 0.12 * (sin(uv2.y * 4.0 + time * 1.0 * speed) + sin(uv2.y * 6.8 + time * 0.75 * speed) + sin(uv2.y * 11.3 + time * 0.4 * speed)) / 3.0;",
    "     uv2.y += 0.12 * (sin(uv2.x * 4.2 + time * 1.28 * speed) + sin(uv2.x * 6.3 + time * 1.65 * speed) + sin(uv2.x * 8.2 + time * 0.9 * speed)) / 3.0;",
    "     vec4 wave1 = texture2D(wave, uv2 * 0.5);",
    "     vec4 wave2 = texture2D(wave, uv2 * 0.5 + vec2(0.2));",
    "     vec3 waves = vec3(wave1.aaa * 0.9 - wave2.aaa * 0.02);",
    "     vec4 base = texture2DProj( map, uv );",
    "     vec3 surface = blendOverlay( color, base.rgb * step(1.0, reflections) + vec3(0.5, 0.5, 0.5) * step(1.0, 1.0 - reflections));",
    "     gl_FragColor = vec4( 0.175 * waves + 0.825 * surface, 0.75 );",
    "}"
  ].join("\n")
};

class Water extends Mesh {
  constructor(sky, renderer, scene, camera, reflections = true) {
    super();

    this.sky = sky;
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.needsUpdate = false;
    this.clipBias = 0;
    this.reflectorPlane = new Plane();
    this.normal = new Vector3();
    this.reflectorWorldPosition = new Vector3();
    this.cameraWorldPosition = new Vector3();
    this.rotationMatrix = new Matrix4();
    this.lookAtPosition = new Vector3(0, 0, -1);
    this.clipPlane = new Vector4();
    this.view = new Vector3();
    this.target = new Vector3();
    this.q = new Vector4();
    this.virtualCamera = new PerspectiveCamera();
    this.virtualCamera.layers.set(Layers.reflection);
    this.rotateX = new Matrix4();
    this.rotateX.makeRotationAxis(new Vector3(1, 0, 0), -Math.PI / 2);
    this.reflectionsForceOff = false;

    const shader = WaterShader;

    this.material = new ShaderMaterial({
      fragmentShader: shader.fragmentShader,
      vertexShader: shader.vertexShader,
      uniforms: UniformsUtils.clone(shader.uniforms),
      transparent: true
    });

    this.geometry = new PlaneBufferGeometry(WORLD_SIZE * 2, WORLD_SIZE * 2, 30, 30);
    this.geometry.rotateX(-Math.PI / 2);
    this.renderOrder = RENDER_ORDER.WATER;

    this.frustumCulled = false;

    const textureWidth = 1024;
    const textureHeight = 1024;

    this.textureMatrix = new Matrix4();

    const parameters = {
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      format: RGBFormat,
      stencilBuffer: false
    };

    this.renderTarget = new WebGLRenderTarget(textureWidth, textureHeight, parameters);

    if (!THREE.MathUtils.isPowerOfTwo(textureWidth) || !THREE.MathUtils.isPowerOfTwo(textureHeight)) {
      this.renderTarget.texture.generateMipmaps = false;
    }

    const material = new ShaderMaterial({
      uniforms: UniformsUtils.clone(shader.uniforms),
      fragmentShader: shader.fragmentShader,
      vertexShader: shader.vertexShader,
      transparent: true
    });

    material.uniforms.map.value = this.renderTarget.texture;
    material.uniforms.textureMatrix.value = this.textureMatrix;
    material.uniforms.reflections.value = reflections;
    material.uniforms.wave.value = waterTexture;

    this.material = material;
  }

  forceReflectionsOff() {
    this.reflectionsForceOff = true;
  }

  unforceReflectionsOff() {
    this.reflectionsForceOff = false;
  }

  setColor(color) {
    this.material.uniforms.color.value = color;
    this.material.uniformsNeedUpdate = true;
  }

  onAnimationTick({ delta }) {
    const {
      renderer,
      scene,
      camera,
      clipBias,
      reflectorPlane,
      normal,
      reflectorWorldPosition,
      cameraWorldPosition,
      rotationMatrix,
      lookAtPosition,
      clipPlane,
      view,
      target,
      q,
      virtualCamera
    } = this;

    const worldHasWater = SYSTEMS.terrainSystem.worldTypeHasWater();

    if (!worldHasWater) {
      if (this.visible) {
        this.visible = false;
      }

      return;
    }

    const time = this.material.uniforms.time.value + delta;
    this.material.uniforms.time.value = time;

    const enableReflections = window.APP.detailLevel === 0 && !this.reflectionsForceOff;
    if (this.material.uniforms.reflections.value !== enableReflections) {
      this.material.uniforms.reflections.value = enableReflections;
      this.material.uniformsNeedUpdate = true;
    }

    if (!this.needsUpdate || !this.camera || !enableReflections || !worldHasWater) return;
    this.needsUpdate = false;

    this.updateMatrices();
    camera.updateMatrices();

    reflectorWorldPosition.setFromMatrixPosition(this.matrixWorld);
    cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld);

    rotationMatrix.extractRotation(this.matrixWorld);
    rotationMatrix.multiply(this.rotateX);

    normal.set(0, 0, 1);
    normal.applyMatrix4(rotationMatrix);

    view.subVectors(reflectorWorldPosition, cameraWorldPosition);

    // Avoid rendering when reflector is facing away

    if (view.dot(normal) > 0) return;

    view.reflect(normal).negate();
    view.add(reflectorWorldPosition);

    rotationMatrix.extractRotation(camera.matrixWorld);

    lookAtPosition.set(0, 0, -1);
    lookAtPosition.applyMatrix4(rotationMatrix);
    lookAtPosition.add(cameraWorldPosition);

    target.subVectors(reflectorWorldPosition, lookAtPosition);
    target.reflect(normal).negate();
    target.add(reflectorWorldPosition);

    view.y -= 0.1; // HACK to avoid artifacts at grazing angles

    if (!almostEqualVec3(virtualCamera.position, view)) {
      virtualCamera.position.copy(view);
      virtualCamera.matrixNeedsUpdate = true;
      virtualCamera.updateMatrices();
    }

    virtualCamera.up.set(0, 1, 0);
    virtualCamera.up.applyMatrix4(rotationMatrix);
    virtualCamera.up.reflect(normal);
    virtualCamera.lookAt(target);

    virtualCamera.far = camera.far; // Used in WebGLBackground

    virtualCamera.projectionMatrix.copy(camera.projectionMatrix);

    virtualCamera.userData.recursion = 0;

    // Update the texture matrix
    this.textureMatrix.set(0.5, 0.0, 0.0, 0.5, 0.0, 0.5, 0.0, 0.5, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0, 1.0);
    this.textureMatrix.multiply(virtualCamera.projectionMatrix);
    this.textureMatrix.multiply(virtualCamera.matrixWorldInverse);
    this.textureMatrix.multiply(this.matrixWorld);

    // Now update projection matrix with new clip plane, implementing code from: http://www.terathon.com/code/oblique.html
    // Paper explaining this technique: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
    reflectorPlane.setFromNormalAndCoplanarPoint(normal, reflectorWorldPosition);
    reflectorPlane.applyMatrix4(virtualCamera.matrixWorldInverse);

    clipPlane.set(reflectorPlane.normal.x, reflectorPlane.normal.y, reflectorPlane.normal.z, reflectorPlane.constant);

    const { projectionMatrix } = virtualCamera;

    q.x = (Math.sign(clipPlane.x) + projectionMatrix.elements[8]) / projectionMatrix.elements[0];
    q.y = (Math.sign(clipPlane.y) + projectionMatrix.elements[9]) / projectionMatrix.elements[5];
    q.z = -1.0;
    q.w = (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14];

    // Calculate the scaled plane vector
    clipPlane.multiplyScalar(2.0 / clipPlane.dot(q));

    // Replacing the third row of the projection matrix
    projectionMatrix.elements[2] = clipPlane.x;
    projectionMatrix.elements[6] = clipPlane.y;
    projectionMatrix.elements[10] = clipPlane.z + 1.0 - clipBias;
    projectionMatrix.elements[14] = clipPlane.w;

    // Render

    this.visible = false;

    const currentRenderTarget = renderer.getRenderTarget();
    const currentOnAfterRender = scene.onAfterRender;
    const currentOnBeforeRender = scene.onBeforeRender;

    scene.onAfterRender = noopAfterRender;
    scene.onBeforeRender = noopBeforeRender;

    const currentXrEnabled = renderer.xr && renderer.xr.enabled;
    const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;
    const currentShadowNeedsUpdate = renderer.shadowMap.needsUpdate;
    const currentSkyVisible = this.sky && this.sky.visible;

    if (this.sky) {
      this.sky.visible = false;
    }

    renderer.shadowMap.autoUpdate = false; // Avoid re-computing shadows
    renderer.shadowMap.needsUpdate = false;

    renderer.setRenderTarget(this.renderTarget);
    renderer.clear();
    renderer.render(scene, virtualCamera);

    renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;
    renderer.shadowMap.needsUpdate = currentShadowNeedsUpdate;

    renderer.setRenderTarget(currentRenderTarget);
    if (renderer.xr) renderer.xr.enabled = currentXrEnabled;
    scene.onAfterRender = currentOnAfterRender;
    scene.onBeforeRender = currentOnBeforeRender;

    if (this.sky) {
      this.sky.visible = currentSkyVisible;
    }

    const { viewport } = camera;

    if (viewport !== undefined) {
      renderer.state.viewport(viewport);
    }

    this.visible = true;
  }
}

export default Water;
