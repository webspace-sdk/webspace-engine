const {
  Color,
  DepthTexture,
  LinearFilter,
  NoBlending,
  RGBAFormat,
  ShaderMaterial,
  UniformsUtils,
  DepthStencilFormat,
  WebGLRenderTarget,
  EqualStencilFunc,
  NotEqualStencilFunc,
  UnsignedInt248Type,
  Vector2
} = THREE;

import { Pass } from "three/examples/jsm/postprocessing/Pass.js";
import { FXAAFunc } from "./fxaa-shader";

const isFirefox = navigator.userAgent.toLowerCase().indexOf("firefox") > -1;
const FAR_PLANE_FOR_SSAO = 2;

const CubeSSAOShader = {
  defines: {
    PERSPECTIVE_CAMERA: 1
  },

  uniforms: {
    runAO: {
      type: "i",
      value: 0
    },
    runFXAA: {
      type: "i",
      value: 0
    },
    runCopy: {
      type: "i",
      value: 0
    },
    tDiffuse: {
      type: "t",
      value: null
    },
    tDepth: {
      type: "t",
      value: null
    },
    resolution: {
      type: "v2",
      value: new Vector2()
    },
    cameraNear: {
      type: "f",
      value: 1
    },
    cameraFar: {
      type: "f",
      value: 100
    },
    fogNear: {
      type: "f",
      value: 5
    },
    fogFar: {
      type: "f",
      value: 100
    },
    fogEnabled: {
      type: "i",
      value: 0
    },
    onlyAO: {
      type: "i",
      value: 1
    },
    aoClamp: {
      type: "f",
      value: 0.55
    },
    lumInfluence: {
      type: "f",
      value: 0.7
    },
    hue: {
      type: "f",
      value: 0
    },
    saturation: {
      type: "f",
      value: 0
    },
    brightness: {
      type: "f",
      value: 0
    },
    contrast: {
      type: "f",
      value: 0
    },
    fxaaQualitySubpix: {
      type: "f",
      value: 0.75
    },
    fxaaEdgeThreshold: {
      type: "f",
      value: 0.166
    },
    fxaaEdgeThresholdMin: {
      type: "f",
      value: 0.0833
    },
    offset: { value: 1.0 },
    darkness: { value: 1.0 }
  },
  vertexShader:
    "varying vec2 vUv;\nvoid main() {\nvUv = uv;\ngl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n}",

  fragmentShader: [
    "uniform float cameraNear;",
    "uniform float cameraFar;",
    "uniform float fogNear;",
    "uniform float fogFar;",
    "uniform bool fogEnabled;",
    "uniform bool onlyAO;",
    "uniform vec2 resolution;",
    "uniform float aoClamp;",
    "uniform float lumInfluence;",
    "uniform sampler2D tDiffuse;",
    "uniform sampler2D tDepth;",
    "uniform float hue;",
    "uniform float brightness;",
    "uniform float contrast;",
    "uniform float saturation;",
    "uniform float darkness;",
    "uniform float offset;",
    "uniform bool runAO;",
    "uniform bool runFXAA;",
    "uniform bool runCopy;",
    "uniform float fxaaQualitySubpix;",
    "uniform float fxaaEdgeThreshold;",
    "uniform float fxaaEdgeThresholdMin;",
    "varying vec2 vUv;",
    "#define DL 2.399963229728653",
    "#define EULER 2.718281828459045",
    "#ifndef SAMPLES",
    "#define SAMPLES 8",
    "#endif",
    "#ifndef RADIUS",
    "#define RADIUS 5.0",
    "#endif",
    "#if !defined( FLOAT_DEPTH ) && !defined( RGBA_DEPTH )",
    "#define RGBA_DEPTH",
    "#endif",
    "#ifndef ONLY_AO_COLOR",
    "#define ONLY_AO_COLOR 1.0, 1.0, 1.0",
    "#endif",
    FXAAFunc,
    "const int samples = SAMPLES;",
    "#include <packing>",
    "const float radius = RADIUS;",
    "const bool useNoise = false;",
    "const float noiseAmount = 0.0003;",
    "const float diffArea = 0.4;",
    "const float gDisplace = 0.4;",
    "const vec3 onlyAOColor = vec3( ONLY_AO_COLOR );",
    "float unpackDepth( const in vec4 rgba_depth ) {",
    "float depth = 0.0;",
    "#if defined( RGBA_DEPTH )",
    "const vec4 bit_shift = vec4( 1.0 / ( 256.0 * 256.0 * 256.0 ), 1.0 / ( 256.0 * 256.0 ), 1.0 / 256.0, 1.0 );",
    "depth = dot( rgba_depth, bit_shift );",
    "#elif defined( FLOAT_DEPTH )",
    "depth = rgba_depth.w;",
    "#endif",
    "return depth;",
    "}",
    "vec2 rand( const vec2 coord ) {",
    "vec2 noise;",
    "if ( useNoise ) {",
    "float nx = dot ( coord, vec2( 12.9898, 78.233 ) );",
    "float ny = dot ( coord, vec2( 12.9898, 78.233 ) * 2.0 );",
    "noise = clamp( fract ( 43758.5453 * sin( vec2( nx, ny ) ) ), 0.0, 1.0 );",
    "} else {",
    "float ff = fract( 1.0 - coord.s * ( resolution.x / 2.0 ) );",
    "float gg = fract( coord.t * ( resolution.y / 2.0 ) );",
    "noise = vec2( 0.25, 0.75 ) * vec2( ff ) + vec2( 0.75, 0.25 ) * gg;",
    "}",
    "return ( noise * 2.0  - 1.0 ) * noiseAmount;",
    "}",
    "float doFog() {",
    "float zdepth = unpackDepth( texture2D( tDepth, vUv ) );",
    "float depth = -cameraFar * cameraNear / ( zdepth * (cameraFar - cameraNear) - cameraFar );",
    "return smoothstep( fogNear, fogFar, depth );",
    "}",
    "float readDepth( const in vec2 screenPosition ) {",
    "float fragCoordZ = texture2D( tDepth, screenPosition ).x;",
    "float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );",
    "return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );",
    "}",
    "float compareDepths( const in float depth1, const in float depth2, inout int far ) {",
    "float garea = 2.0;",
    "float diff = ( depth1 - depth2 ) * 100.0;",
    "if ( diff < gDisplace ) {",
    "garea = diffArea;",
    "} else {",
    "far = 1;",
    "}",
    "float dd = diff - gDisplace;",
    "float gauss = pow( EULER, -2.0 * dd * dd / ( garea * garea ) );",
    "return gauss;",
    "}",
    "float calcAO( float depth, float dw, float dh ) {",
    "float dd = radius - depth * radius;",
    "vec2 vv = vec2( dw, dh );",
    "vec2 coord1 = vUv + dd * vv;",
    "vec2 coord2 = vUv - dd * vv;",
    "float temp1 = 0.0;",
    "float temp2 = 0.0;",
    "int far = 0;",
    "temp1 = compareDepths( depth, readDepth( coord1 ), far );",
    "if ( far > 0 ) {",
    "temp2 = compareDepths( readDepth( coord2 ), depth, far );",
    "temp1 += ( 1.0 - temp1 ) * temp2;",
    "}",
    "return temp1;",
    "}",
    "vec4 getAO(vec2 uv) {",
    "vec2 noise = rand( uv );",
    "float depth = readDepth( uv );",
    "depth = clamp(depth, 0.0, 0.92);", // don't add edges to faraway objects
    "float tt = clamp( depth, aoClamp, 1.0 );",
    "float w = ( 1.0 / resolution.x )  / tt + ( noise.x * ( 1.0 - noise.x ) );",
    "float h = ( 1.0 / resolution.y ) / tt + ( noise.y * ( 1.0 - noise.y ) );",
    "float pw;",
    "float ph;",
    "float ao = 0.0;",
    "float dz = 1.0 / float( samples );",
    "float z = 1.0 - dz / 2.0;",
    "float l = 0.0;",
    "for ( int i = 0; i <= samples; i ++ ) {",
    "float r = sqrt( 1.0 - z );",
    "pw = cos( l ) * r;",
    "ph = sin( l ) * r;",
    "ao += calcAO( depth, pw * w, ph * h );",
    "z = z - dz;",
    "l = l + DL;",
    "}",
    "ao /= float( samples );",
    "ao = 1.0 - ao;",
    "if ( fogEnabled ) {",
    "ao = mix( ao, 1.0, doFog() );",
    "}",
    "vec3 color = texture2D( tDiffuse, vUv ).rgb;",
    "vec3 lumcoeff = vec3( 0.299, 0.587, 0.114 );",
    "float lum = dot( color.rgb, lumcoeff );",
    "vec3 luminance = vec3( lum );",
    "vec3 final = vec3( color * mix( vec3( ao ), vec3( 1.0 ), luminance * lumInfluence ) );",
    "if ( onlyAO ) {",
    "final = onlyAOColor * vec3( mix( vec3( ao ), vec3( 1.0 ), luminance * lumInfluence ) );",
    "}",
    "return vec4( final, 1.0 );",
    "}",
    "float getBlurredAO(vec2 uv) {",
    "  vec2 texelSize = ( 1.0 / resolution );",
    "  float result = 0.0;",
    "  for ( int i = - 1; i <= 1; i ++ ) {",

    "    for ( int j = - 1; j <= 1; j ++ ) {",

    "      vec2 offset = ( vec2( float( i ), float( j ) ) ) * texelSize;",
    "      result += getAO( uv + offset ).r;",

    "    }",

    "  }",

    "  return result / (3.0 * 3.0);",
    "}",
    "vec3 huesat(vec3 v) {",
    "float angle = hue * 3.14159265;",
    "float s = sin(angle), c = cos(angle);",
    "vec3 weights = (vec3(2.0 * c, -sqrt(3.0) * s - c, sqrt(3.0) * s - c) + 1.0) / 3.0;",
    "float len = length(v.rgb);",
    "v.rgb = vec3(",
    "dot(v.rgb, weights.xyz),",
    "dot(v.rgb, weights.zxy),",
    "dot(v.rgb, weights.yzx)",
    ");",
    "float average = (v.r + v.g + v.b) / 3.0;",
    "if (saturation > 0.0) {",
    "v.rgb += (average - v.rgb) * (1.0 - 1.0 / (1.001 - saturation));",
    "} else {",
    "v.rgb += (average - v.rgb) * (-saturation);",
    "}",
    "return v;",
    "}",
    "vec3 brighten(vec3 v) {",
    "v.rgb += brightness;",
    "if (contrast > 0.0) {",
    "v.rgb = (v.rgb - 0.5) / (1.0 - contrast) + 0.5;",
    "} else {",
    "v.rgb = (v.rgb - 0.5) * (1.0 + contrast) + 0.5;",
    "}",
    "return v;",
    "}",
    "vec3 vignette(vec3 v) {",
    "	vec2 uv = ( vUv - vec2( 0.5 ) ) * vec2( offset );",
    "	return vec3( mix( v.rgb, vec3( 1.0 - darkness ), dot( uv, uv ) ));",
    "}",
    "void main() {",
    "if (runAO) { ",
    "  float AO = getBlurredAO(vUv);",
    "  vec3 color = texture2D( tDiffuse, vUv ).rgb;",
    "  vec3 AOcolor = vec3(color * AO);",
    "  gl_FragColor = vec4(AOcolor, 1.0);",
    "} else if (runFXAA) {",
    "  gl_FragColor = FxaaPixelShader(",
    "    vUv,",
    "    vec4(0.0),",
    "    tDiffuse,",
    "    tDiffuse,",
    "    tDiffuse,",
    "    1.0 / resolution,",
    "    vec4(0.0),",
    "    vec4(0.0),",
    "    vec4(0.0),",
    "    fxaaQualitySubpix,", // Tuned to remove gaps in curved meshes
    "    fxaaEdgeThreshold,",
    "    fxaaEdgeThresholdMin,",
    "    0.0,",
    "    0.0,",
    "    0.0,",
    "    vec4(0.0)",
    "  );",
    "",
    "  // TODO avoid querying texture twice for same texel",
    "  gl_FragColor.a = 1.0;",
    "} else if (runCopy) {",
    "	vec3 texel = texture2D( tDiffuse, vUv ).rgb;",
    " vec3 satColor = huesat(texel);",
    " vec3 brightColor = brighten(satColor);",
    " vec3 vignetteColor = vignette(brightColor);",
    "	gl_FragColor = vec4(vignetteColor, 1.0);",
    "}",
    "}"
  ].join("\n")
};

const CubeSSAOPass = function CubeSSAOPass(scene, camera, width, height) {
  Pass.call(this);

  this.width = width !== undefined ? width : 512;
  this.height = height !== undefined ? height : 512;

  this.clear = true;

  this.camera = camera;
  this.scene = scene;
  this.enableFXAA = true;

  // scene render target with depth + stencil buffer

  const depthTexture = new DepthTexture(
    this.width,
    this.height,
    UnsignedInt248Type,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    DepthStencilFormat
  );

  this.sceneRenderTarget = new WebGLRenderTarget(this.width, this.height, {
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    format: RGBAFormat,
    depthTexture,
    depthBuffer: true,
    stencilBuffer: true
  });

  // ssao render target
  this.ssaoRenderTarget = new WebGLRenderTarget(this.width, this.height, {
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    format: RGBAFormat
  });

  this.material = new ShaderMaterial({
    defines: { ...CubeSSAOShader.defines },
    uniforms: UniformsUtils.clone(CubeSSAOShader.uniforms),
    vertexShader: CubeSSAOShader.vertexShader,
    fragmentShader: CubeSSAOShader.fragmentShader,
    stencilWrite: false,
    stencilFunc: NotEqualStencilFunc,
    stencilRef: 1,
    blending: NoBlending
  });

  this.material.uniforms.cameraNear.value = this.camera.near;
  this.material.uniforms.cameraFar.value = FAR_PLANE_FOR_SSAO;
  this.material.uniforms.resolution.value.set(this.width, this.height);

  this.fsQuad = new Pass.FullScreenQuad(null);

  this.originalClearColor = new Color();
};

CubeSSAOPass.prototype = Object.assign(Object.create(Pass.prototype), {
  constructor: CubeSSAOPass,

  dispose() {
    // dispose render targets
    this.sceneRenderTarget.dispose();
    this.ssaoRenderTarget.dispose();

    // dispose geometry

    this.quad.geometry.dispose();

    // dispose materials

    this.normalMaterial.dispose();
    this.copyMaterial.dispose();
  },

  render(renderer, writeBuffer /* , readBuffer, deltaTime, maskActive */) {
    // render scene and depth
    if (window.APP.detailLevel <= 2) {
      const f = this.camera.far;
      // HACK make shallow z-buffer, but keep projection matrix for proper frustum culling.
      this.camera.far = FAR_PLANE_FOR_SSAO;
      // TODO this.camera.updateProjectionMatrix();

      renderer.setRenderTarget(this.sceneRenderTarget);
      renderer.clear();
      renderer.render(this.scene, this.camera);

      this.camera.far = f;

      // render SSAO + colorize
      this.material.uniforms.runAO.value = true;
      this.material.uniforms.runCopy.value = false;
      this.material.uniforms.runFXAA.value = false;
      this.material.uniforms.fxaaQualitySubpix.value = 0.0;
      this.material.uniforms.fxaaEdgeThreshold.value = 1.0;
      this.material.uniforms.fxaaEdgeThresholdMin.value = 1.0;
      this.material.uniforms.offset.value = 0.35;
      this.material.uniforms.darkness.value = 5.0;
      this.material.uniforms.saturation.value = 0.1;
      this.material.uniforms.brightness.value = 0.1;

      this.material.uniforms.tDiffuse.value = this.sceneRenderTarget.texture;
      this.material.uniforms.tDepth.value = this.sceneRenderTarget.depthTexture;
      this.renderPass(renderer, this.material, this.ssaoRenderTarget);

      // render stencilled FXAA + SSAO
      // toons and text aren't FXAA'd
      this.material.stencilWrite = true;
      this.material.stencilFunc = EqualStencilFunc;
      this.material.stencilRef = 0;
      this.material.uniforms.runAO.value = false;
      this.material.uniforms.runFXAA.value = true;
      this.material.uniforms.fxaaQualitySubpix.value = 1.0;
      this.material.uniforms.fxaaEdgeThreshold.value = 0.166;
      this.material.uniforms.fxaaEdgeThresholdMin.value = 0.0833;
      this.material.uniforms.tDiffuse.value = this.ssaoRenderTarget.texture;
      this.material.uniforms.tDepth.value = null;
      this.renderPass(renderer, this.material, this.sceneRenderTarget);

      this.material.stencilWrite = false;
      this.material.uniforms.runFXAA.value = false;
      this.material.uniforms.runCopy.value = true;
      this.material.uniforms.tDiffuse.value = this.sceneRenderTarget.texture;
      // Copy composed buffer to screen
      this.renderPass(renderer, this.material, this.renderToScreen ? null : writeBuffer);
    } else if (window.APP.detailLevel === 3 && !isFirefox /* Doesn't work on FF for some reason, punting for now */) {
      renderer.setRenderTarget(this.sceneRenderTarget);
      renderer.clear();
      renderer.render(this.scene, this.camera);
      this.material.stencilWrite = true;
      this.material.stencilFunc = EqualStencilFunc;
      this.material.stencilRef = 0;
      this.material.uniforms.runAO.value = false;
      this.material.uniforms.runCopy.value = false;
      this.material.uniforms.runFXAA.value = true;
      this.material.uniforms.fxaaQualitySubpix.value = 0.5;
      this.material.uniforms.fxaaEdgeThreshold.value = 0.166;
      this.material.uniforms.fxaaEdgeThresholdMin.value = 0.0625;
      this.material.uniforms.tDiffuse.value = this.sceneRenderTarget.texture;
      this.material.uniforms.tDepth.value = null;
      this.renderPass(renderer, this.material, this.ssaoRenderTarget);
      this.material.stencilWrite = false;
      this.material.uniforms.runFXAA.value = false;
      this.material.uniforms.runCopy.value = true;
      this.material.uniforms.tDiffuse.value = this.ssaoRenderTarget.texture;
      this.material.uniforms.offset.value = 0.35;
      this.material.uniforms.darkness.value = 5.0;
      this.material.uniforms.saturation.value = 0.1;
      this.material.uniforms.brightness.value = 0.05;
      this.renderPass(renderer, this.material, this.renderToScreen ? null : writeBuffer);
    } else {
      renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
      renderer.clear();
      renderer.render(this.scene, this.camera);
    }
  },

  renderPass(renderer, passMaterial, renderTarget, clearColor, clearAlpha) {
    // save original state
    this.originalClearColor.copy(renderer.getClearColor());
    const originalClearAlpha = renderer.getClearAlpha();
    const originalAutoClear = renderer.autoClear;

    renderer.setRenderTarget(renderTarget);

    // setup pass state
    renderer.autoClear = false;
    if (clearColor !== undefined && clearColor !== null) {
      renderer.setClearColor(clearColor);
      renderer.setClearAlpha(clearAlpha || 0.0);
      renderer.clear();
    }

    this.fsQuad.material = passMaterial;
    this.fsQuad.render(renderer);

    // restore original state
    renderer.autoClear = originalAutoClear;
    renderer.setClearColor(this.originalClearColor);
    renderer.setClearAlpha(originalClearAlpha);
  },

  setSize(width, height) {
    this.width = width;
    this.height = height;

    this.sceneRenderTarget.setSize(this.width, this.height);
    this.ssaoRenderTarget.setSize(this.width, this.height);

    const depthTexture = new DepthTexture(
      this.width,
      this.height,
      UnsignedInt248Type,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      DepthStencilFormat
    );

    this.sceneRenderTarget.depthTexture.dispose();
    this.sceneRenderTarget.depthTexture = depthTexture;

    this.material.uniforms.resolution.value.set(this.width, this.height);
  }
});

export default CubeSSAOPass;
