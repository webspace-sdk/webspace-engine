const path = require("path");

module.exports = {
  stories: ["../src/jel/react-components/**/*.stories.mdx", "../src/jel/react-components/*.stories.js", "../src/jel/utils/*.stories.js"],
  addons: ["@storybook/addon-links", "@storybook/addon-essentials", "storybook-addon-designs"],
  webpackFinal: async config => {
    config.module.rules.push({
      test: /\.scss$/,
      use: [
        "style-loader",
        {
          loader: "css-loader",
          options: {
            importLoaders: "1",
            localIdentName: "[name]__[local]___[hash:base64:5]",
            modules: false,
            camelCase: true
          }
        },
        "sass-loader"
      ],
      include: path.resolve(__dirname, "..", "src")
    });

    const svgLoaderRule = config.module.rules.find(rule => rule.test.test(".svg"));
    svgLoaderRule.exclude = /\.svg$/;
    config.module.rules.push({
      test: /\.svg$/,
      use: [
        "url-loader"
      ]
    });

    config.module.rules.push({
      test: /\.svgi$/,
      use: [
        "svg-inline-loader"
      ]
    });

    return config;
  }
};
