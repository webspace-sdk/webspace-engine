const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
//const RemoveUnusedFilesWebpackPlugin = require("remove-unused-files-webpack-plugin").default;
const webpack = require("webpack");
const HTMLWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;
const TOML = require("@iarna/toml");
const fetch = require("node-fetch");

function createDefaultAppConfig() {
  const schemaPath = path.join(__dirname, "src", "schema.toml");
  const schemaString = fs.readFileSync(schemaPath).toString();

  let appConfigSchema;

  try {
    appConfigSchema = TOML.parse(schemaString);
  } catch (e) {
    console.error("Error parsing schema.toml on line " + e.line + ", column " + e.column + ": " + e.message);
    throw e;
  }

  const appConfig = {};

  for (const [categoryName, category] of Object.entries(appConfigSchema)) {
    appConfig[categoryName] = {};

    // Enable all features with a boolean type
    if (categoryName === "features") {
      for (const [key, schema] of Object.entries(category)) {
        if (key === "require_account_for_join") {
          appConfig[categoryName][key] = false;
        } else {
          appConfig[categoryName][key] = schema.type === "boolean" ? true : null;
        }
      }
    }
  }

  return appConfig;
}

async function fetchAppConfigAndEnvironmentVars() {
  if (!fs.existsSync(".ret.credentials")) {
    throw new Error("Not logged in to Hubs Cloud. Run `npm run login` first.");
  }

  const { host, token } = JSON.parse(fs.readFileSync(".ret.credentials"));

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  };

  // Load the Hubs Cloud instance's app config in development
  const appConfigsResponse = await fetch(`https://${host}/api/v1/app_configs`, { headers });

  if (!appConfigsResponse.ok) {
    throw new Error(`Error fetching Hubs Cloud config "${appConfigsResponse.statusText}"`);
  }

  const appConfig = await appConfigsResponse.json();

  // dev.reticulum.io doesn't run ita
  if (host === "dev.reticulum.io") {
    return appConfig;
  }

  const hubsConfigsResponse = await fetch(`https://${host}/api/ita/configs/hubs`, { headers });

  const hubsConfigs = await hubsConfigsResponse.json();

  if (!hubsConfigsResponse.ok) {
    throw new Error(`Error fetching Hubs Cloud config "${hubsConfigsResponse.statusText}"`);
  }

  const { shortlink_domain, thumbnail_server, terra_server } = hubsConfigs.general;

  process.env.RETICULUM_SERVER = host;
  process.env.SHORTLINK_DOMAIN = shortlink_domain;
  process.env.THUMBNAIL_SERVER = thumbnail_server;
  process.env.TERRA_SERVER = terra_server;

  return appConfig;
}

const threeExamplesDir = path.resolve(__dirname, "node_modules", "three", "examples");
const basisTranscoderPath = path.resolve(threeExamplesDir, "js", "libs", "basis", "basis_transcoder.js");
const basisWasmPath = path.resolve(threeExamplesDir, "js", "libs", "basis", "basis_transcoder.wasm");

module.exports = async (env, argv) => {
  env = env || {};

  // Load environment variables from .env files.
  // .env takes precedent over .defaults.env
  // Previously defined environment variables are not overwritten
  dotenv.config({ path: ".env" });
  dotenv.config({ path: ".defaults.env" });

  let appConfig = undefined;

  /**
   * Initialize the Webpack build envrionment for the provided environment.
   */

  if (argv.mode !== "production" || env.bundleAnalyzer) {
    if (env.loadAppConfig || process.env.LOAD_APP_CONFIG) {
      if (!env.localDev) {
        // Load and set the app config and environment variables from the remote server.
        // A Hubs Cloud server or dev.reticulum.io can be used.
        appConfig = await fetchAppConfigAndEnvironmentVars();
      }
    } else {
      // Use the default app config with all featured enabled.
      appConfig = createDefaultAppConfig();
    }

    Object.assign(process.env, {
      HOST: "hubs.local"
    });

    if (env.localDev) {
      // Local Dev Environment (npm run local)
      Object.assign(process.env, {
        HOST: "hubs.local",
        RETICULUM_SOCKET_SERVER: "hubs.local",
        BASE_ASSETS_PATH: "http://localhost:8001/",
        RETICULUM_SERVER: "hubs.local:4000",
        POSTGREST_SERVER: "",
        ITA_SERVER: ""
      });
    }
  }

  // In production, the environment variables are defined in CI or loaded from ita and
  // the app config is injected into the head of the page by Reticulum.

  return {
    stats: {
      children: true
    },
    resolve: {
      alias: {
        // aframe and networked-aframe are still using commonjs modules. this will resolve yjs
        yjs$: path.resolve(__dirname, "./node_modules/yjs/dist/yjs.mjs"),
        // aframe and networked-aframe are still using commonjs modules. three and bitecs are peer dependanciees
        // but they are "smart" and have builds for both ESM and CJS depending on if import or require is used.
        // This forces the ESM version to be used otherwise we end up with multiple instances of the libraries,
        // and for example AFRAME.THREE.Object3D !== THREE.Object3D in Hubs code, which breaks many things.
        three$: path.resolve(__dirname, "./node_modules/three/build/three.module.js"),
        // TODO these aliases are reequired because `three` only "exports" stuff in examples/jsm
        "three/examples/js/libs/basis/basis_transcoder.js": basisTranscoderPath,
        "three/examples/js/libs/basis/basis_transcoder.wasm": basisWasmPath
      },
      fallback: {
        buffer: require.resolve("buffer/"),
        stream: require.resolve("stream-browserify"),
        path: require.resolve("path-browserify"),
        crypto: require.resolve("crypto-browserify")
      }
    },
    entry: {
      jel: path.join(__dirname, "src", "jel.js")
    },
    output: {
      filename: "assets/js/[name].js",
      publicPath: process.env.BASE_ASSETS_PATH || ""
    },
    devtool: argv.mode === "production" ? "source-map" : "inline-source-map",
    devServer: {
      compress: false,
      hot: false,
      client: {
        webSocketURL: {
          hostname: "127.0.0.1",
          port: 8080
        }
      },
      // host: "local-ip", NOTE: probably need this for LAN
      allowedHosts: "all",
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store"
      },
      onBeforeSetupMiddleware: function({ app }) {
        // networked-aframe makes HEAD requests to the server for time syncing. Respond with an empty body.
        app.head("*", function(req, res, next) {
          if (req.method === "HEAD") {
            res.append("Date", new Date().toGMTString());
            res.send("");
          } else {
            next();
          }
        });
      }
    },
    performance: {
      // Ignore media and sourcemaps when warning about file size.
      assetFilter(assetFilename) {
        return !/\.(map|png|jpg|gif|glb|webm)$/.test(assetFilename);
      }
    },
    module: {
      rules: [
        {
          test: /\.html$/,
          loader: "html-loader"
        },
        {
          test: /pdf\.worker\.js$/,
          type: "asset/inline",
          generator: {
            dataUrl: content => {
              return content.toString();
            }
          }
        },
        {
          test: /\.worker\.js$/,
          exclude: /pdf\.worker\.js/,
          use: {
            loader: "worker-loader",
            options: {
              publicPath: "/",
              inline: "fallback"
            }
          }
        },
        {
          test: /\.worklet\.js$/,
          loader: "worklet-loader",
          options: {
            name: "assets/js/[name].js"
          }
        },
        {
          test: /\.js$/,
          exclude: [path.resolve(__dirname, "node_modules")],
          use: {
            loader: "babel-loader"
          }
        },
        {
          test: /\.(css|scss)$/i,
          use: [
            // Translates CSS into CommonJS
            "css-loader",
            // Compiles Sass to CSS
            "sass-loader"
          ]
        },
        {
          test: /\.(png|jpg|gif|glb|ogg|mp3|mp4|wav|woff2|svg|webm)$/,
          use: {
            loader: "file-loader",
            options: {
              // move required assets to output dir and add a hash for cache busting
              name: "[path][name].[ext]",
              // Make asset paths relative to /src
              context: path.join(__dirname, "src")
            }
          }
        },
        {
          test: /\.(svgi)$/,
          use: {
            loader: "svg-inline-loader"
          }
        },
        {
          test: /\.(wasm)$/,
          type: "javascript/auto",
          use: {
            loader: "file-loader",
            options: {
              outputPath: "assets/wasm",
              name: "[name].[ext]"
            }
          }
        },
        {
          test: /\.(glsl|frag|vert)$/,
          use: { loader: "raw-loader" }
        }
      ]
    },

    plugins: [
      // new RemoveUnusedFilesWebpackPlugin({
      //   patterns: ["src/**"],
      //   removeUnused: false, // whether to delete, default is: false
      //   removeInquiry: false // find unused files, before deleting prompt, default: true
      // }),
      new webpack.ProvidePlugin({
        Buffer: ["buffer", "Buffer"]
      }),
      new webpack.ProvidePlugin({
        process: "process/browser.js"
      }),
      new BundleAnalyzerPlugin({
        analyzerMode: env && env.bundleAnalyzer ? "server" : "disabled"
      }),
      new HTMLWebpackPlugin({
        filename: "jel.html",
        template: path.join(__dirname, "src", "jel.html"),
        chunks: ["support", "jel"],
        chunksSortMode: "manual",
        inject: "head",
        minify: {
          removeComments: false
        }
      }),
      // Define process.env variables in the browser context.
      new webpack.DefinePlugin({
        "process.env": JSON.stringify({
          NODE_ENV: argv.mode,
          SHORTLINK_DOMAIN: process.env.SHORTLINK_DOMAIN,
          RETICULUM_SERVER: process.env.RETICULUM_SERVER,
          RETICULUM_SOCKET_SERVER: process.env.RETICULUM_SOCKET_SERVER,
          THUMBNAIL_SERVER: process.env.THUMBNAIL_SERVER,
          TERRA_SERVER: process.env.TERRA_SERVER,
          BUILD_VERSION: process.env.BUILD_VERSION,
          SENTRY_DSN: process.env.SENTRY_DSN,
          MIXPANEL_TOKEN: process.env.MIXPANEL_TOKEN,
          GA_TRACKING_ID: process.env.GA_TRACKING_ID,
          POSTGREST_SERVER: process.env.POSTGREST_SERVER,
          BASE_ASSETS_PATH: process.env.BASE_ASSETS_PATH,
          APP_CONFIG: appConfig
        })
      })
    ]
  };
};
