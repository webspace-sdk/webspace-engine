#version 300 es
precision highp float;
precision highp int;

#define cplx vec2
#define cplx_new(re, im) vec2(re, im)
#define cplx_re(z) z.x
#define cplx_im(z) z.y
#define cplx_exp(z) (exp(z.x) * cplx_new(cos(z.y), sin(z.y)))
#define cplx_scale(z, scalar) (z * scalar)
#define cplx_abs(z) (sqrt(z.x * z.x + z.y * z.y))

// Keep these separate so three only sets them once
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 cameraPosition;

layout(std140) uniform InstanceData {
  mat4 transforms[MAX_INSTANCES];
  vec4 colors[MAX_INSTANCES];
  vec4 uvTransforms[MAX_INSTANCES];
  vec4 mapSettings[MAX_INSTANCES];

  vec4 hubs_SweepParams[MAX_INSTANCES];

  vec3 hubs_InteractorOnePos;
  bool hubs_IsFrozen;

  vec3 hubs_InteractorTwoPos;
  float hubs_Time;

} instanceData;

out vec3 hubs_WorldPosition;
out float fogDepth;

in vec3 position;
in vec2 uv;

#ifdef PSEUDO_INSTANCING
in float instance;
flat out uint vInstance;
#endif

#ifdef VERTEX_COLORS
in vec3 color;
#endif

out vec2 vUv;
out vec4 vColor;

flat out vec4 vUVTransform;
flat out vec4 vMapSettings;

void main() {
  #ifdef PSEUDO_INSTANCING
  uint instanceIndex = uint(instance);
  #elif
  uint instanceIndex = gl_InstanceID;
  #endif

  vColor = instanceData.colors[instanceIndex];

  #ifdef VERTEX_COLORS
  vColor *= vec4(color, 1.0);
  #endif

  vUv = uv;
  vUVTransform = instanceData.uvTransforms[instanceIndex];
  vMapSettings = instanceData.mapSettings[instanceIndex];

  vec4 mvPosition = instanceData.transforms[instanceIndex] * vec4(position, 1.0);

  float rp = 128.0;
  vec4 pos = mvPosition;
  mvPosition = viewMatrix * mvPosition;
  vec2 planedir = normalize(vec2(pos.x - cameraPosition.x, pos.z - cameraPosition.z));
  cplx plane = cplx_new(pos.y - cameraPosition.y, sqrt((pos.x - cameraPosition.x) * (pos.x - cameraPosition.x) + (pos.z - cameraPosition.z) * (pos.z - cameraPosition.z)));
  cplx circle = rp * cplx_exp(cplx_scale(plane, 1.0 / rp)) - cplx_new(rp, 0);
  pos.x = cplx_im(circle) * planedir.x + cameraPosition.x;
  pos.z = cplx_im(circle) * planedir.y + cameraPosition.z;
  pos.y = cplx_re(circle) + cameraPosition.y;
  gl_Position = projectionMatrix * viewMatrix * pos;

  hubs_WorldPosition = (instanceData.transforms[instanceIndex] * vec4(position, 1.0)).xyz;
  vInstance = instanceIndex;

  fogDepth = -mvPosition.z;
}
