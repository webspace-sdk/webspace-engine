module.exports = api => {
  api.cache(true);

  return {
    presets: ["@babel/react", ["@babel/preset-env", { useBuiltIns: false }]],
    plugins: [
      ["react-intl", { messagesDir: "./public/messages", enforceDescriptions: false }],
      "transform-react-jsx-img-import",
      "babel-plugin-styled-components"
    ]
  };
};
