const HueSaturationShader = {
  uniforms: {
    tDiffuse: {
      type: "t",
      value: null
    },
    hue: {
      type: "f",
      value: 0
    },
    saturation: {
      type: "f",
      value: 0
    }
  },
  vertexShader:
    "varying vec2 vUv;\nvoid main() {\nvUv = uv;\ngl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n}",
  fragmentShader:
    "uniform sampler2D tDiffuse;\nuniform float hue;\nuniform float saturation;\nvarying vec2 vUv;\nvoid main() {\ngl_FragColor = texture2D( tDiffuse, vUv );\nfloat angle = hue * 3.14159265;\nfloat s = sin(angle), c = cos(angle);\nvec3 weights = (vec3(2.0 * c, -sqrt(3.0) * s - c, sqrt(3.0) * s - c) + 1.0) / 3.0;\nfloat len = length(gl_FragColor.rgb);\ngl_FragColor.rgb = vec3(\ndot(gl_FragColor.rgb, weights.xyz),\ndot(gl_FragColor.rgb, weights.zxy),\ndot(gl_FragColor.rgb, weights.yzx)\n);\nfloat average = (gl_FragColor.r + gl_FragColor.g + gl_FragColor.b) / 3.0;\nif (saturation > 0.0) {\ngl_FragColor.rgb += (average - gl_FragColor.rgb) * (1.0 - 1.0 / (1.001 - saturation));\n} else {\ngl_FragColor.rgb += (average - gl_FragColor.rgb) * (-saturation);\n}\n}"
};

export default HueSaturationShader;
