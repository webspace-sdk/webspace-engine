import { RENDER_ORDER } from "../constants";
import SkyboxBufferGeometry from "./skybox-buffer-geometry";
import { CubeTextureLoader } from 'three';
import { getSkyboxUrlFromMetaTags, setSkyboxUrlMetaTag } from "../utils/dom-utils";

/**
 * @author zz85 / https://github.com/zz85
 *
 * Based on "A Practical Analytic Model for Daylight"
 * aka The Preetham Model, the de facto standard analytic skydome model
 * http://www.cs.utah.edu/~shirley/papers/sunsky/sunsky.pdf
 *
 * First implemented by Simon Wallner
 * http://www.simonwallner.at/projects/atmospheric-scattering
 *
 * Improved by Martin Upitis
 * http://blenderartists.org/forum/showthread.php?245954-preethams-sky-impementation-HDR
 *
 * Three.js integration by zz85 http://twitter.com/blurspline
 */

const { Vector3, Mesh, ShaderMaterial, UniformsUtils, CubeTextureLoader } = THREE;

const CloudySkyShader = {
  uniforms: {
    luminance: { value: 1 },
    turbidity: { value: 2 },
    rayleigh: { value: 0.2 },
    mieCoefficient: { value: 0.005 },
    mieDirectionalG: { value: 0.8 },
    sunPosition: { value: new Vector3() },
    up: { value: new Vector3(0, 1, 0) },
    hue: { value: 0.5 },
    sat: { value: 0.0 },
    time: { value: 0.0 }
  },

  vertexShader: [
    "uniform vec3 sunPosition;",
    "uniform float rayleigh;",
    "uniform float turbidity;",
    "uniform float mieCoefficient;",
    "uniform vec3 up;",

    "varying vec3 vWorldPosition;",
    "varying vec3 vSunDirection;",
    "varying float vSunfade;",
    "varying vec3 vBetaR;",
    "varying vec3 vBetaM;",
    "varying float vSunE;",

    // constants for atmospheric scattering
    "const float e = 2.71828182845904523536028747135266249775724709369995957;",
    "const float pi = 3.141592653589793238462643383279502884197169;",

    // wavelength of used primaries, according to preetham
    "const vec3 lambda = vec3( 680E-9, 550E-9, 450E-9 );",
    // this pre-calcuation replaces older TotalRayleigh(vec3 lambda) function:
    "const vec3 totalRayleigh = vec3( 5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5 );",

    // mie stuff
    // K coefficient for the primaries
    "const float v = 4.0;",
    "const vec3 K = vec3( 0.686, 0.678, 0.666 );",
    // MieConst = pi * pow( ( 2.0 * pi ) / lambda, vec3( v - 2.0 ) ) * K
    "const vec3 MieConst = vec3( 1.8399918514433978E14, 2.7798023919660528E14, 4.0790479543861094E14 );",

    // earth shadow hack
    // cutoffAngle = pi / 1.95;
    "const float cutoffAngle = 1.6110731556870734;",
    "const float steepness = 1.5;",
    "const float EE = 1000.0;",

    "float sunIntensity( float zenithAngleCos ) {",
    "  zenithAngleCos = clamp( zenithAngleCos, -1.0, 1.0 );",
    "  return EE * max( 0.0, 1.0 - pow( e, -( ( cutoffAngle - acos( zenithAngleCos ) ) / steepness ) ) );",
    "}",

    "vec3 totalMie( float T ) {",
    "  float c = ( 0.2 * T ) * 10E-18;",
    "  return 0.434 * c * MieConst;",
    "}",

    "void main() {",

    "  vec4 worldPosition = modelMatrix * vec4( position, 1.0 );",
    "  vWorldPosition = worldPosition.xyz;",

    "  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
    "  gl_Position.z = gl_Position.w;", // set z to camera.far

    "  vSunDirection = normalize( sunPosition );",

    "  vSunE = sunIntensity( dot( vSunDirection, up ) );",

    "  vSunfade = 1.0 - clamp( 1.0 - exp( ( sunPosition.y / 450000.0 ) ), 0.0, 1.0 );",
    "  float rayleighCoefficient = rayleigh - ( 1.0 * ( 1.0 - vSunfade ) );",

    // extinction (absorbtion + out scattering)
    // rayleigh coefficients
    "  vBetaR = totalRayleigh * rayleigh;",

    // mie coefficients
    "  vBetaM = totalMie( turbidity ) * mieCoefficient;",

    "}"
  ].join("\n"),

  fragmentShader: [
    "varying vec3 vWorldPosition;",
    "varying vec3 vSunDirection;",
    "varying float vSunfade;",
    "varying vec3 vBetaR;",
    "varying vec3 vBetaM;",
    "varying float vSunE;",

    "uniform float luminance;",
    "uniform float mieDirectionalG;",
    "uniform vec3 up;",
    "uniform float time;",
    "uniform float hue;",
    "uniform float sat;",

    "const vec3 cameraPos = vec3( 0.0, 0.0, 0.0 );",
    "const vec2 iResolution = vec2(2048, 2048);",

    // constants for atmospheric scattering
    "const float pi = 3.141592653589793238462643383279502884197169;",

    "const float n = 1.0003;", // refractive index of air
    "const float N = 2.545E25;", // number of molecules per unit volume for air at 288.15K and 1013mb (sea level -45 celsius)

    // optical length at zenith for molecules
    "const float rayleighZenithLength = 8.4E3;",
    "const float mieZenithLength = 1.25E3;",
    // 66 arc seconds -> degrees, and the cosine of that
    "const float sunAngularDiameterCos = 0.999956676946448443553574619906976478926848692873900859324;",

    // 3.0 / ( 16.0 * pi )
    "const float THREE_OVER_SIXTEENPI = 0.05968310365946075;",
    // 1.0 / ( 4.0 * pi )
    "const float ONE_OVER_FOURPI = 0.07957747154594767;",

    "float rayleighPhase( float cosTheta ) {",
    "  return THREE_OVER_SIXTEENPI * ( 1.0 + pow( cosTheta, 2.0 ) );",
    "}",

    "float hgPhase( float cosTheta, float g ) {",
    "  float g2 = pow( g, 2.0 );",
    "  float inverse = 1.0 / pow( 1.0 - 2.0 * g * cosTheta + g2, 1.5 );",
    "  return ONE_OVER_FOURPI * ( ( 1.0 - g2 ) * inverse );",
    "}",

    // Filmic ToneMapping http://filmicgames.com/archives/75
    "const float A = 0.15;",
    "const float B = 0.50;",
    "const float C = 0.10;",
    "const float D = 0.20;",
    "const float E = 0.02;",
    "const float F = 0.30;",

    "const float cloudscale = 0.5;",
    "const float speed = 0.0025;",
    "const float clouddark = 0.5;",
    "const float cloudlight = 0.3;",
    "const float cloudcover = 0.2;",
    "const float cloudalpha = 8.0;",
    "const float skytint = 0.5;",
    "const vec3 horizontint = vec3(0.5, 0.72, 0.86);",
    "const vec3 skycolour1 = vec3(0.2, 0.4, 0.6);",
    "const vec3 skycolour2 = vec3(0.4, 0.7, 1.0);",

    "const mat2 m = mat2( 1.6,  1.2, -1.2,  1.6 );",

    "const float whiteScale = 1.0748724675633854;", // 1.0 / Uncharted2Tonemap(1000.0)

    "vec3 Uncharted2Tonemap( vec3 x ) {",
    "  return ( ( x * ( A * x + C * B ) + D * E ) / ( x * ( A * x + B ) + D * F ) ) - E / F;",
    "}",

    "vec2 hash( vec2 p ) {",
    "  p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));",
    "  return -1.0 + 2.0*fract(sin(p)*43758.5453123);",
    "}",

    "float noise( in vec2 p ) {",
    "    const float K1 = 0.366025404; // (sqrt(3)-1)/2;",
    "    const float K2 = 0.211324865; // (3-sqrt(3))/6;",
    "  vec2 i = floor(p + (p.x+p.y)*K1);  ",
    "    vec2 a = p - i + (i.x+i.y)*K2;",
    "    vec2 o = (a.x>a.y) ? vec2(1.0,0.0) : vec2(0.0,1.0); //vec2 of = 0.5 + 0.5*vec2(sign(a.x-a.y), sign(a.y-a.x));",
    "    vec2 b = a - o + K2;",
    "  vec2 c = a - 1.0 + 2.0*K2;",
    "    vec3 h = max(0.5-vec3(dot(a,a), dot(b,b), dot(c,c) ), 0.0 );",
    "  vec3 n = h*h*h*h*vec3( dot(a,hash(i+0.0)), dot(b,hash(i+o)), dot(c,hash(i+1.0)));",
    "    return dot(n, vec3(70.0));  ",
    "}",

    "float fbm(vec2 n) {",
    "  float total = 0.0, amplitude = 0.1;",
    "  for (int i = 0; i < 7; i++) {",
    "    total += noise(n) * amplitude;",
    "    n = m * n;",
    "    amplitude *= 0.4;",
    "  }",
    "  return total;",
    "}",
    "float intersectSphereInternal(vec3 rayPosition, vec3 rayDirection, float radius) {",
    "    float b = dot(rayPosition, rayDirection);",
    "    float c = dot(rayPosition, rayPosition) - radius*radius;",
    "    float h = sqrt(b*b - c);",
    "    return -b + h;",
    "}",

    "void main() {",
    // optical length
    // cutoff angle at 90 to avoid singularity in next formula.
    "  float zenithAngle = acos( max( 0.0, dot( up, normalize( vWorldPosition - cameraPos ) ) ) );",
    "  float inverse = 1.0 / ( cos( zenithAngle ) + 0.15 * pow( 93.885 - ( ( zenithAngle * 180.0 ) / pi ), -1.253 ) );",
    "  float sR = rayleighZenithLength * inverse;",
    "  float sM = mieZenithLength * inverse;",

    // combined extinction factor
    "  vec3 Fex = exp( -( vBetaR * sR + vBetaM * sM ) );",

    // in scattering
    "  float cosTheta = dot( normalize( vWorldPosition - cameraPos ), vSunDirection );",

    "  float rPhase = rayleighPhase( cosTheta * 0.5 + 0.5 );",
    "  vec3 betaRTheta = vBetaR * rPhase;",

    "  float mPhase = hgPhase( cosTheta, mieDirectionalG );",
    "  vec3 betaMTheta = vBetaM * mPhase;",

    "  vec3 Lin = pow( vSunE * ( ( betaRTheta + betaMTheta ) / ( vBetaR + vBetaM ) ) * ( 1.0 - Fex ), vec3( 1.5 ) );",
    "  Lin *= mix( vec3( 1.0 ), pow( vSunE * ( ( betaRTheta + betaMTheta ) / ( vBetaR + vBetaM ) ) * Fex, vec3( 1.0 / 2.0 ) ), clamp( pow( 1.0 - dot( up, vSunDirection ), 5.0 ), 0.0, 1.0 ) );",

    // nightsky
    "  vec3 direction = normalize( vWorldPosition - cameraPos );",
    "  float theta = acos( direction.y ); // elevation --> y-axis, [-pi/2, pi/2]",
    "  float phi = atan( direction.z, direction.x ); // azimuth --> x-axis [-pi/2, pi/2]",
    "  vec3 L0 = vec3( 0.1 ) * Fex;",

    // composition + solar disc
    "  float sundisk = smoothstep( sunAngularDiameterCos, sunAngularDiameterCos + 0.00002, cosTheta );",
    "  L0 += ( vSunE * 19000.0 * Fex ) * sundisk;",

    "  vec3 texColor = ( Lin + L0 ) * 0.04 + vec3( 0.0, 0.0003, 0.00075 );",

    "  vec3 curr = Uncharted2Tonemap( ( log2( 2.0 / pow( luminance, 4.0 ) ) ) * texColor );",
    "  vec3 color = curr * whiteScale;",

    "  vec3 retColor = pow( color, vec3( 1.0 / ( 1.2 + ( 1.2 * vSunfade ) ) ) );",

    "  vec2 p = gl_FragCoord.xy / iResolution.xy;",
    "  vec3 cloudCameraPos = vec3(0.0, -100, 0.0);",
    "  vec3 cloudDirection = normalize( vWorldPosition - cloudCameraPos );",
    "  vec3 cloudPlaneNormal = vec3(0.0, -1.0, 0.0);",
    "  vec3 cloudPlanePosition = vec3(0.0, 100000.0, 0.0);",
    "  float denom = dot(cloudPlaneNormal, cloudDirection);",
    "  float cloudPlaneHitT = dot(cloudCameraPos - cloudPlanePosition, cloudPlaneNormal) / denom;",
    "  vec3 cloudPlaneHitOrigin = cloudDirection * cloudPlaneHitT;",
    "  vec2 tuv = cloudPlaneHitOrigin.xz * 0.000005;",
    "  vec2 uv = tuv;    ",
    "  float time = time * speed;",
    "  float q = fbm(uv * cloudscale * 0.5);",
    "  float r = 0.0;",
    "  float f = 0.0;",
    "  float c = 0.0;",
    "  float c1 = 0.0;",
    "  uv *= cloudscale;",
    "  uv -= q - time;",
    "  float weight = 0.8;",
    "  for (int i=0; i<4; i++){",
    "    r += abs(weight*noise( uv ));",
    "    uv = m*uv + time;",
    "    weight *= 0.7;",
    "  }",
    "  uv = tuv;",
    "  uv *= cloudscale;",
    "  uv -= q - time;",
    "  weight = 0.7;",
    "  for (int i=0; i<4; i++){",
    "    f += weight*noise( uv );",
    "    uv = m*uv + time;",
    "  weight *= 0.6;",
    "  }",

    "  f *= r + f;",

    "  time = time * speed * 2.0;",
    "  uv = tuv;",
    "  uv *= cloudscale*2.0;",
    "  uv -= q - time;",
    "  weight = 0.4;",
    "  for (int i=0; i<3; i++){",
    "    c += weight*noise( uv );",
    "    uv = m*uv + time;",
    "  weight *= 0.6;",
    "  }",

    // noise ridge colour
    "  time = time * speed * 5.0;",
    "  uv = tuv;",
    "  uv *= cloudscale*3.0;",
    "  uv -= q - time;",
    "  weight = 0.4;",
    "  for (int i=0; i<3; i++){",
    "    c1 += abs(weight*noise( uv ));",
    "    uv = m*uv + time;",
    "  weight *= 0.6;",
    "  }",

    "  c += c1;",

    "  vec3 skycolour = mix(skycolour2, skycolour1, p.y);",
    "  vec3 cloudcolour = vec3(1.1, 1.1, 0.9) * clamp((clouddark + cloudlight*c), 0.0, 1.0);",

    "  f = cloudcover + cloudalpha*f*r;",

    "  vec3 cloudResult = mix(0.5 * horizontint + 0.5 * retColor, clamp(skytint * skycolour + cloudcolour, 0.0, 1.0), clamp((f + c) * clamp((normalize(vWorldPosition)).y, 0.0, 1.0), 0.0, 1.0));",

    "  gl_FragColor = vec4(cloudResult, 1.0);",
    "  float contrast = 0.1;",
    // Saturate sky and hue shift
    "gl_FragColor.rgb = (gl_FragColor.rgb - 0.5) / (1.0 - contrast) + 0.5;",
    "float angle = hue * 3.14159265;\nfloat sh = sin(angle), ch = cos(angle);\nvec3 weights = (vec3(2.0 * ch, -sqrt(3.0) * sh - ch, sqrt(3.0) * sh - ch) + 1.0) / 3.0;\nfloat len = length(gl_FragColor.rgb);\ngl_FragColor.rgb = vec3(\ndot(gl_FragColor.rgb, weights.xyz),\ndot(gl_FragColor.rgb, weights.zxy),\ndot(gl_FragColor.rgb, weights.yzx)\n);\n",
    "  float average = (gl_FragColor.r + gl_FragColor.g + gl_FragColor.b) / 3.0;",
    "  gl_FragColor.rgb += (average - gl_FragColor.rgb) * (1.0 - 1.0 / (1.001 - sat));",
    "}"
  ].join("\n")
};

const FlatSkyShader = {
  uniforms: {
    luminance: { value: 1 },
    turbidity: { value: 2 },
    rayleigh: { value: 0.2 },
    mieCoefficient: { value: 0.005 },
    mieDirectionalG: { value: 0.8 },
    sunPosition: { value: new Vector3() },
    up: { value: new Vector3(0, 1, 0) },
    time: { value: 0.0 },
    hue: { value: 0.5 },
    sat: { value: 0.0 }
  },

  vertexShader: [
    "uniform vec3 sunPosition;",
    "uniform float rayleigh;",
    "uniform float turbidity;",
    "uniform float mieCoefficient;",
    "uniform vec3 up;",

    "varying vec3 vWorldPosition;",
    "varying vec3 vSunDirection;",
    "varying float vSunfade;",
    "varying vec3 vBetaR;",
    "varying vec3 vBetaM;",
    "varying float vSunE;",

    // constants for atmospheric scattering
    "const float e = 2.71828182845904523536028747135266249775724709369995957;",
    "const float pi = 3.141592653589793238462643383279502884197169;",

    // wavelength of used primaries, according to preetham
    "const vec3 lambda = vec3( 680E-9, 550E-9, 450E-9 );",
    // this pre-calcuation replaces older TotalRayleigh(vec3 lambda) function:
    "const vec3 totalRayleigh = vec3( 5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5 );",

    // mie stuff
    // K coefficient for the primaries
    "const float v = 4.0;",
    "const vec3 K = vec3( 0.686, 0.678, 0.666 );",
    // MieConst = pi * pow( ( 2.0 * pi ) / lambda, vec3( v - 2.0 ) ) * K
    "const vec3 MieConst = vec3( 1.8399918514433978E14, 2.7798023919660528E14, 4.0790479543861094E14 );",

    // earth shadow hack
    // cutoffAngle = pi / 1.95;
    "const float cutoffAngle = 1.6110731556870734;",
    "const float steepness = 1.5;",
    "const float EE = 1000.0;",

    "float sunIntensity( float zenithAngleCos ) {",
    "  zenithAngleCos = clamp( zenithAngleCos, -1.0, 1.0 );",
    "  return EE * max( 0.0, 1.0 - pow( e, -( ( cutoffAngle - acos( zenithAngleCos ) ) / steepness ) ) );",
    "}",

    "vec3 totalMie( float T ) {",
    "  float c = ( 0.2 * T ) * 10E-18;",
    "  return 0.434 * c * MieConst;",
    "}",

    "void main() {",

    "  vec4 worldPosition = modelMatrix * vec4( position, 1.0 );",
    "  vWorldPosition = worldPosition.xyz;",

    "  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
    "  gl_Position.z = gl_Position.w;", // set z to camera.far

    "  vSunDirection = normalize( sunPosition );",

    "  vSunE = sunIntensity( dot( vSunDirection, up ) );",

    "  vSunfade = 1.0 - clamp( 1.0 - exp( ( sunPosition.y / 450000.0 ) ), 0.0, 1.0 );",
    "  float rayleighCoefficient = rayleigh - ( 1.0 * ( 1.0 - vSunfade ) );",

    // extinction (absorbtion + out scattering)
    // rayleigh coefficients
    "  vBetaR = totalRayleigh * rayleigh;",

    // mie coefficients
    "  vBetaM = totalMie( turbidity ) * mieCoefficient;",

    "}"
  ].join("\n"),

  fragmentShader: [
    "varying vec3 vWorldPosition;",
    "varying vec3 vSunDirection;",
    "varying float vSunfade;",
    "varying vec3 vBetaR;",
    "varying vec3 vBetaM;",
    "varying float vSunE;",
    "uniform float hue;",
    "uniform float sat;",

    "uniform float luminance;",
    "uniform float mieDirectionalG;",
    "uniform vec3 up;",
    "uniform float time;",

    "const vec3 cameraPos = vec3( 0.0, 0.0, 0.0 );",
    "const vec2 iResolution = vec2(2048, 2048);",

    // constants for atmospheric scattering
    "const float pi = 3.141592653589793238462643383279502884197169;",

    "const float n = 1.0003;", // refractive index of air
    "const float N = 2.545E25;", // number of molecules per unit volume for air at 288.15K and 1013mb (sea level -45 celsius)

    // optical length at zenith for molecules
    "const float rayleighZenithLength = 8.4E3;",
    "const float mieZenithLength = 1.25E3;",
    // 66 arc seconds -> degrees, and the cosine of that
    "const float sunAngularDiameterCos = 0.999956676946448443553574619906976478926848692873900859324;",

    // 3.0 / ( 16.0 * pi )
    "const float THREE_OVER_SIXTEENPI = 0.05968310365946075;",
    // 1.0 / ( 4.0 * pi )
    "const float ONE_OVER_FOURPI = 0.07957747154594767;",

    "float rayleighPhase( float cosTheta ) {",
    "  return THREE_OVER_SIXTEENPI * ( 1.0 + pow( cosTheta, 2.0 ) );",
    "}",

    "float hgPhase( float cosTheta, float g ) {",
    "  float g2 = pow( g, 2.0 );",
    "  float inverse = 1.0 / pow( 1.0 - 2.0 * g * cosTheta + g2, 1.5 );",
    "  return ONE_OVER_FOURPI * ( ( 1.0 - g2 ) * inverse );",
    "}",

    // Filmic ToneMapping http://filmicgames.com/archives/75
    "const float A = 0.15;",
    "const float B = 0.50;",
    "const float C = 0.10;",
    "const float D = 0.20;",
    "const float E = 0.02;",
    "const float F = 0.30;",

    "const mat2 m = mat2( 1.6,  1.2, -1.2,  1.6 );",

    "const float whiteScale = 1.0748724675633854;", // 1.0 / Uncharted2Tonemap(1000.0)

    "vec3 Uncharted2Tonemap( vec3 x ) {",
    "  return ( ( x * ( A * x + C * B ) + D * E ) / ( x * ( A * x + B ) + D * F ) ) - E / F;",
    "}",

    "void main() {",
    // optical length
    // cutoff angle at 90 to avoid singularity in next formula.
    "  float zenithAngle = acos( max( 0.0, dot( up, normalize( vWorldPosition - cameraPos ) ) ) );",
    "  float inverse = 1.0 / ( cos( zenithAngle ) + 0.15 * pow( 93.885 - ( ( zenithAngle * 180.0 ) / pi ), -1.253 ) );",
    "  float sR = rayleighZenithLength * inverse;",
    "  float sM = mieZenithLength * inverse;",

    // combined extinction factor
    "  vec3 Fex = exp( -( vBetaR * sR + vBetaM * sM ) );",

    // in scattering
    "  float cosTheta = dot( normalize( vWorldPosition - cameraPos ), vSunDirection );",

    "  float rPhase = rayleighPhase( cosTheta * 0.5 + 0.5 );",
    "  vec3 betaRTheta = vBetaR * rPhase;",

    "  float mPhase = hgPhase( cosTheta, mieDirectionalG );",
    "  vec3 betaMTheta = vBetaM * mPhase;",

    "  vec3 Lin = pow( vSunE * ( ( betaRTheta + betaMTheta ) / ( vBetaR + vBetaM ) ) * ( 1.0 - Fex ), vec3( 1.5 ) );",
    "  Lin *= mix( vec3( 1.0 ), pow( vSunE * ( ( betaRTheta + betaMTheta ) / ( vBetaR + vBetaM ) ) * Fex, vec3( 1.0 / 2.0 ) ), clamp( pow( 1.0 - dot( up, vSunDirection ), 5.0 ), 0.0, 1.0 ) );",

    // nightsky
    "  vec3 direction = normalize( vWorldPosition - cameraPos );",
    "  float theta = acos( direction.y ); // elevation --> y-axis, [-pi/2, pi/2]",
    "  float phi = atan( direction.z, direction.x ); // azimuth --> x-axis [-pi/2, pi/2]",
    "  vec3 L0 = vec3( 0.1 ) * Fex;",

    // composition + solar disc
    "  float sundisk = smoothstep( sunAngularDiameterCos, sunAngularDiameterCos + 0.00002, cosTheta );",
    "  L0 += ( vSunE * 19000.0 * Fex ) * sundisk;",

    "  vec3 texColor = ( Lin + L0 ) * 0.04 + vec3( 0.0, 0.0003, 0.00075 );",

    "  vec3 curr = Uncharted2Tonemap( ( log2( 2.0 / pow( luminance, 4.0 ) ) ) * texColor );",
    "  vec3 color = curr * whiteScale;",

    "  vec3 retColor = pow( color, vec3( 1.0 / ( 1.2 + ( 1.2 * vSunfade ) ) ) );",
    " gl_FragColor = vec4( retColor, 1.0 );",
    "  float contrast = 0.1;",
    // Saturate sky and hue shift
    "gl_FragColor.rgb = (gl_FragColor.rgb - 0.5) / (1.0 - contrast) + 0.5;",
    "float angle = hue * 3.14159265;\nfloat sh = sin(angle), ch = cos(angle);\nvec3 weights = (vec3(2.0 * ch, -sqrt(3.0) * sh - ch, sqrt(3.0) * sh - ch) + 1.0) / 3.0;\nfloat len = length(gl_FragColor.rgb);\ngl_FragColor.rgb = vec3(\ndot(gl_FragColor.rgb, weights.xyz),\ndot(gl_FragColor.rgb, weights.zxy),\ndot(gl_FragColor.rgb, weights.yzx)\n);\n",
    "  float average = (gl_FragColor.r + gl_FragColor.g + gl_FragColor.b) / 3.0;",
    "  gl_FragColor.rgb += (average - gl_FragColor.rgb) * (1.0 - 1.0 / (1.001 - sat));",
    "}"
  ].join("\n")
};

class Sky extends Mesh {
  constructor() {
    super();

    this.lowMaterial = new ShaderMaterial({
      fragmentShader: FlatSkyShader.fragmentShader,
      vertexShader: FlatSkyShader.vertexShader,
      uniforms: UniformsUtils.clone(FlatSkyShader.uniforms)
    });

    this.highMaterial = new ShaderMaterial({
      fragmentShader: CloudySkyShader.fragmentShader,
      vertexShader: CloudySkyShader.vertexShader,
      uniforms: UniformsUtils.clone(CloudySkyShader.uniforms)
    });

    this.skyMaterials = [this.lowMaterial, this.highMaterial];
    this.geometry = new SkyboxBufferGeometry(1, 1, 1);
    this.material = window.APP.lowDetail ? this.lowMaterial : this.highMaterial;

    this.renderOrder = RENDER_ORDER.SKY;
    this.frustumCulled = false;

    // Check for skybox URL meta tag
    const skyboxUrl = this.getSkyboxUrlFromMeta();
    if (skyboxUrl) {
      this.loadSkybox(skyboxUrl);
      setSkyboxUrlMetaTag(skyboxUrl);
    }
  }

  getSkyboxUrlFromMeta() {
    return getSkyboxUrlFromMetaTags();
  }

  loadSkybox(url) {
    setSkyboxUrlMetaTag(url);
    const loader = new CubeTextureLoader();
    loader.load(
      [
        `${url}/px.jpg`, `${url}/nx.jpg`,
        `${url}/py.jpg`, `${url}/ny.jpg`,
        `${url}/pz.jpg`, `${url}/nz.jpg`
      ],
      (texture) => {
        this.material = new ShaderMaterial({
          uniforms: {
            skybox: { value: texture }
          },
          vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
              vec4 worldPosition = modelMatrix * vec4(position, 1.0);
              vWorldPosition = worldPosition.xyz;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform samplerCube skybox;
            varying vec3 vWorldPosition;
            void main() {
              gl_FragColor = textureCube(skybox, normalize(vWorldPosition));
            }
            setSkyboxUrlMetaTag(url);
          `
        });
        this.material.needsUpdate = true;
      }
    );
  }

  setColor(color) {
    const tmp2 = {};
    color.getHSL(tmp2);

    // Kludge for white colors, keep sky blue
    if (tmp2.s === 0 && tmp2.h === 0) {
      tmp2.h = 0.5;
    }

    // Hacky, eyeballed this one.
    const hue = tmp2.h + 1.4;

    for (const mat of [this.highMaterial, this.lowMaterial]) {
      mat.uniforms.hue.value = hue * 2.0;
      mat.uniforms.sat.value = tmp2.s;
      mat.uniformsNeedUpdate = true;
    }
  }

  onAnimationTick({ delta }) {
    const mat = window.APP.detailLevel === 0 ? this.highMaterial : this.lowMaterial;
    const time = this.material.uniforms.time.value + delta;

    if (this.material !== mat) {
      this.material = mat;
      this.material.needsUpdate = true;
    }

    this.material.uniforms.time.value = time;
  }
}

export default Sky;
