const BrightnessContrastShader = {
  uniforms: {
    tDiffuse: {
      type: "t",
      value: null
    },
    brightness: {
      type: "f",
      value: 0
    },
    contrast: {
      type: "f",
      value: 0
    }
  },
  vertexShader:
    "varying vec2 vUv;\nvoid main() {\nvUv = uv;\ngl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n}",
  fragmentShader:
    "uniform sampler2D tDiffuse;\nuniform float brightness;\nuniform float contrast;\nvarying vec2 vUv;\nvoid main() {\ngl_FragColor = texture2D( tDiffuse, vUv );\ngl_FragColor.rgb += brightness;\nif (contrast > 0.0) {\ngl_FragColor.rgb = (gl_FragColor.rgb - 0.5) / (1.0 - contrast) + 0.5;\n} else {\ngl_FragColor.rgb = (gl_FragColor.rgb - 0.5) * (1.0 + contrast) + 0.5;\n}\n}"
};

export default BrightnessContrastShader;
