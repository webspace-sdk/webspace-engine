const {
  AddEquation,
  Color,
  CustomBlending,
  DepthTexture,
  DstAlphaFactor,
  DstColorFactor,
  LinearFilter,
  NearestFilter,
  NoBlending,
  RGBAFormat,
  ShaderMaterial,
  UniformsUtils,
  UnsignedShortType,
  WebGLRenderTarget,
  Vector2,
  ZeroFactor
} = THREE;

import { CopyShader } from "three/examples/jsm/shaders/CopyShader.js";
import { Pass } from "three/examples/jsm/postprocessing/Pass.js";

const FAR_PLANE_FOR_SSAO = 2;

const CubeSSAOShader = {
  defines: {
    PERSPECTIVE_CAMERA: 1
  },

  uniforms: {
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
    }
  },
  vertexShader:
    "varying vec2 vUv;\nvoid main() {\nvUv = uv;\ngl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n}",

  fragmentShader:
    "uniform float cameraNear;\nuniform float cameraFar;\nuniform float fogNear;\nuniform float fogFar;\nuniform bool fogEnabled;\nuniform bool onlyAO;\nuniform vec2 resolution;\nuniform float aoClamp;\nuniform float lumInfluence;\nuniform sampler2D tDiffuse;\nuniform sampler2D tDepth;\nvarying vec2 vUv;\n#define DL 2.399963229728653\n#define EULER 2.718281828459045\n#ifndef SAMPLES\n#define SAMPLES 8\n#endif\n#ifndef RADIUS\n#define RADIUS 5.0\n#endif\n#if !defined( FLOAT_DEPTH ) && !defined( RGBA_DEPTH )\n#define RGBA_DEPTH\n#endif\n#ifndef ONLY_AO_COLOR\n#define ONLY_AO_COLOR 1.0, 1.0, 1.0\n#endif\nconst int samples = SAMPLES;\n#include <packing>\nconst float radius = RADIUS;\nconst bool useNoise = false;\nconst float noiseAmount = 0.0003;\nconst float diffArea = 0.4;\nconst float gDisplace = 0.4;\nconst vec3 onlyAOColor = vec3( ONLY_AO_COLOR );\nfloat unpackDepth( const in vec4 rgba_depth ) {\nfloat depth = 0.0;\n#if defined( RGBA_DEPTH )\nconst vec4 bit_shift = vec4( 1.0 / ( 256.0 * 256.0 * 256.0 ), 1.0 / ( 256.0 * 256.0 ), 1.0 / 256.0, 1.0 );\ndepth = dot( rgba_depth, bit_shift );\n#elif defined( FLOAT_DEPTH )\ndepth = rgba_depth.w;\n#endif\nreturn depth;\n}\nvec2 rand( const vec2 coord ) {\nvec2 noise;\nif ( useNoise ) {\nfloat nx = dot ( coord, vec2( 12.9898, 78.233 ) );\nfloat ny = dot ( coord, vec2( 12.9898, 78.233 ) * 2.0 );\nnoise = clamp( fract ( 43758.5453 * sin( vec2( nx, ny ) ) ), 0.0, 1.0 );\n} else {\nfloat ff = fract( 1.0 - coord.s * ( resolution.x / 2.0 ) );\nfloat gg = fract( coord.t * ( resolution.y / 2.0 ) );\nnoise = vec2( 0.25, 0.75 ) * vec2( ff ) + vec2( 0.75, 0.25 ) * gg;\n}\nreturn ( noise * 2.0  - 1.0 ) * noiseAmount;\n}\nfloat doFog() {\nfloat zdepth = unpackDepth( texture2D( tDepth, vUv ) );\nfloat depth = -cameraFar * cameraNear / ( zdepth * (cameraFar - cameraNear) - cameraFar );\nreturn smoothstep( fogNear, fogFar, depth );\n}\nfloat readDepth( const in vec2 screenPosition ) {\nfloat fragCoordZ = texture2D( tDepth, screenPosition ).x;\nfloat viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );\nreturn viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );\n}\nfloat compareDepths( const in float depth1, const in float depth2, inout int far ) {\nfloat garea = 2.0;\nfloat diff = ( depth1 - depth2 ) * 100.0;\nif ( diff < gDisplace ) {\ngarea = diffArea;\n} else {\nfar = 1;\n}\nfloat dd = diff - gDisplace;\nfloat gauss = pow( EULER, -2.0 * dd * dd / ( garea * garea ) );\nreturn gauss;\n}\nfloat calcAO( float depth, float dw, float dh ) {\nfloat dd = radius - depth * radius;\nvec2 vv = vec2( dw, dh );\nvec2 coord1 = vUv + dd * vv;\nvec2 coord2 = vUv - dd * vv;\nfloat temp1 = 0.0;\nfloat temp2 = 0.0;\nint far = 0;\ntemp1 = compareDepths( depth, readDepth( coord1 ), far );\nif ( far > 0 ) {\ntemp2 = compareDepths( readDepth( coord2 ), depth, far );\ntemp1 += ( 1.0 - temp1 ) * temp2;\n}\nreturn temp1;\n}\nvoid main() {\nvec2 noise = rand( vUv );\nfloat depth = readDepth( vUv );\nfloat tt = clamp( depth, aoClamp, 1.0 );\nfloat w = ( 1.0 / resolution.x )  / tt + ( noise.x * ( 1.0 - noise.x ) );\nfloat h = ( 1.0 / resolution.y ) / tt + ( noise.y * ( 1.0 - noise.y ) );\nfloat pw;\nfloat ph;\nfloat ao = 0.0;\nfloat dz = 1.0 / float( samples );\nfloat z = 1.0 - dz / 2.0;\nfloat l = 0.0;\nfor ( int i = 0; i <= samples; i ++ ) {\nfloat r = sqrt( 1.0 - z );\npw = cos( l ) * r;\nph = sin( l ) * r;\nao += calcAO( depth, pw * w, ph * h );\nz = z - dz;\nl = l + DL;\n}\nao /= float( samples );\nao = 1.0 - ao;\nif ( fogEnabled ) {\nao = mix( ao, 1.0, doFog() );\n}\nvec3 color = texture2D( tDiffuse, vUv ).rgb;\nvec3 lumcoeff = vec3( 0.299, 0.587, 0.114 );\nfloat lum = dot( color.rgb, lumcoeff );\nvec3 luminance = vec3( lum );\nvec3 final = vec3( color * mix( vec3( ao ), vec3( 1.0 ), luminance * lumInfluence ) );\nif ( onlyAO ) {\nfinal = onlyAOColor * vec3( mix( vec3( ao ), vec3( 1.0 ), luminance * lumInfluence ) );\n}\ngl_FragColor = vec4( final, 1.0 );\n}"
};

const CubeSSAODepthShader = {
  defines: {
    PERSPECTIVE_CAMERA: 1
  },

  uniforms: {
    tDepth: { value: null },
    cameraNear: { value: null },
    cameraFar: { value: null }
  },

  vertexShader: [
    "varying vec2 vUv;",

    "void main() {",

    "  vUv = uv;",
    "  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

    "}"
  ].join("\n"),

  fragmentShader: [
    "uniform sampler2D tDepth;",

    "uniform float cameraNear;",
    "uniform float cameraFar;",

    "varying vec2 vUv;",

    "#include <packing>",

    "float getLinearDepth( const in vec2 screenPosition ) {",

    "  #if PERSPECTIVE_CAMERA == 1",

    "    float fragCoordZ = texture2D( tDepth, screenPosition ).x;",
    "    float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );",
    "    return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );",

    "  #else",

    "    return texture2D( depthSampler, coord ).x;",

    "  #endif",

    "}",

    "void main() {",

    "  float depth = getLinearDepth( vUv );",
    "  gl_FragColor = vec4( vec3( 1.0 - depth ), 1.0 );",

    "}"
  ].join("\n")
};

const CubeSSAOBlurShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new Vector2() }
  },

  vertexShader: [
    "varying vec2 vUv;",

    "void main() {",

    "  vUv = uv;",
    "  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

    "}"
  ].join("\n"),

  fragmentShader: [
    "uniform sampler2D tDiffuse;",

    "uniform vec2 resolution;",

    "varying vec2 vUv;",

    "void main() {",

    "  vec2 texelSize = ( 1.0 / resolution );",
    "  float result = 0.0;",

    "  for ( int i = - 1; i <= 1; i ++ ) {",

    "    for ( int j = - 1; j <= 1; j ++ ) {",

    "      vec2 offset = ( vec2( float( i ), float( j ) ) ) * texelSize;",
    "      result += texture2D( tDiffuse, vUv + offset ).r;",

    "    }",

    "  }",

    "  gl_FragColor = vec4( vec3( result / ( 3.0 * 3.0 ) ), 1.0 );",

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

  // beauty render target with depth buffer

  const depthTexture = new DepthTexture();
  depthTexture.type = UnsignedShortType;
  depthTexture.minFilter = NearestFilter;
  depthTexture.maxFilter = NearestFilter;

  this.beautyRenderTarget = new WebGLRenderTarget(this.width, this.height, {
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    format: RGBAFormat,
    depthTexture,
    depthBuffer: true
  });

  // ssao render target

  this.ssaoRenderTarget = new WebGLRenderTarget(this.width, this.height, {
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    format: RGBAFormat
  });

  this.blurRenderTarget = this.ssaoRenderTarget.clone();

  this.ssaoMaterial = new ShaderMaterial({
    defines: { ...CubeSSAOShader.defines },
    uniforms: UniformsUtils.clone(CubeSSAOShader.uniforms),
    vertexShader: CubeSSAOShader.vertexShader,
    fragmentShader: CubeSSAOShader.fragmentShader,
    blending: NoBlending
  });

  this.ssaoMaterial.uniforms.tDiffuse.value = this.beautyRenderTarget.texture;
  this.ssaoMaterial.uniforms.tDepth.value = this.beautyRenderTarget.depthTexture;
  this.ssaoMaterial.uniforms.cameraNear.value = this.camera.near;
  this.ssaoMaterial.uniforms.cameraFar.value = FAR_PLANE_FOR_SSAO;
  this.ssaoMaterial.uniforms.resolution.value.set(this.width, this.height);

  // blur material

  this.blurMaterial = new ShaderMaterial({
    defines: { ...CubeSSAOBlurShader.defines },
    uniforms: UniformsUtils.clone(CubeSSAOBlurShader.uniforms),
    vertexShader: CubeSSAOBlurShader.vertexShader,
    fragmentShader: CubeSSAOBlurShader.fragmentShader
  });
  this.blurMaterial.uniforms.tDiffuse.value = this.ssaoRenderTarget.texture;
  this.blurMaterial.uniforms.resolution.value.set(this.width, this.height);

  // material for rendering the depth

  this.depthRenderMaterial = new ShaderMaterial({
    defines: { ...CubeSSAODepthShader.defines },
    uniforms: UniformsUtils.clone(CubeSSAODepthShader.uniforms),
    vertexShader: CubeSSAODepthShader.vertexShader,
    fragmentShader: CubeSSAODepthShader.fragmentShader,
    blending: NoBlending
  });
  this.depthRenderMaterial.uniforms.tDepth.value = this.beautyRenderTarget.depthTexture;
  this.depthRenderMaterial.uniforms.cameraNear.value = this.camera.near;
  this.depthRenderMaterial.uniforms.cameraFar.value = FAR_PLANE_FOR_SSAO;

  // material for rendering the content of a render target

  this.copyMaterial = new ShaderMaterial({
    uniforms: UniformsUtils.clone(CopyShader.uniforms),
    vertexShader: CopyShader.vertexShader,
    fragmentShader: CopyShader.fragmentShader,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blendSrc: DstColorFactor,
    blendDst: ZeroFactor,
    blendEquation: AddEquation,
    blendSrcAlpha: DstAlphaFactor,
    blendDstAlpha: ZeroFactor,
    blendEquationAlpha: AddEquation
  });

  this.fsQuad = new Pass.FullScreenQuad(null);

  this.originalClearColor = new Color();
};

CubeSSAOPass.prototype = Object.assign(Object.create(Pass.prototype), {
  constructor: CubeSSAOPass,

  dispose() {
    // dispose render targets

    this.beautyRenderTarget.dispose();
    this.ssaoRenderTarget.dispose();
    this.blurRenderTarget.dispose();

    // dispose geometry

    this.quad.geometry.dispose();

    // dispose materials

    this.normalMaterial.dispose();
    this.blurMaterial.dispose();
    this.copyMaterial.dispose();
    this.depthRenderMaterial.dispose();
  },

  render(renderer, writeBuffer /* , readBuffer, deltaTime, maskActive */) {
    // render beauty and depth

    const f = this.camera.far;
    // HACK make shallow z-buffer, but keep projection matrix for proper frustum culling.
    this.camera.far = FAR_PLANE_FOR_SSAO;
    // TODO this.camera.updateProjectionMatrix();

    renderer.setRenderTarget(this.beautyRenderTarget);
    renderer.clear();
    renderer.render(this.scene, this.camera);

    this.camera.far = f;

    // render CubeSSAO

    this.renderPass(renderer, this.ssaoMaterial, this.ssaoRenderTarget);

    // render blur

    this.renderPass(renderer, this.blurMaterial, this.blurRenderTarget);

    this.copyMaterial.uniforms.tDiffuse.value = this.beautyRenderTarget.texture;
    this.copyMaterial.blending = NoBlending;
    this.renderPass(renderer, this.copyMaterial, this.renderToScreen ? null : writeBuffer);

    this.copyMaterial.uniforms.tDiffuse.value = this.blurRenderTarget.texture;
    this.copyMaterial.blending = CustomBlending;
    this.renderPass(renderer, this.copyMaterial, this.renderToScreen ? null : writeBuffer);
    // output result to screen

    this.copyMaterial.uniforms.tDiffuse.value = this.beautyRenderTarget.texture;
    this.copyMaterial.blending = NoBlending;
    this.renderPass(renderer, this.copyMaterial, this.renderToScreen ? null : writeBuffer);

    this.copyMaterial.uniforms.tDiffuse.value = this.blurRenderTarget.texture;
    this.copyMaterial.blending = CustomBlending;
    this.renderPass(renderer, this.copyMaterial, this.renderToScreen ? null : writeBuffer);
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

    this.beautyRenderTarget.setSize(width, height);
    this.ssaoRenderTarget.setSize(width, height);
    this.blurRenderTarget.setSize(width, height);

    this.ssaoMaterial.uniforms.resolution.value.set(width, height);
    this.blurMaterial.uniforms.resolution.value.set(width, height);
  }
});

export default CubeSSAOPass;
