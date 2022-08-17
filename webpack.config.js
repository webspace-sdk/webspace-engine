const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const selfsigned = require("selfsigned");
const webpack = require("webpack");
const cors = require("cors");
const HTMLWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;
const TOML = require("@iarna/toml");
const fetch = require("node-fetch");
const request = require("request");

function createHTTPSConfig() {
  // Generate certs for the local webpack-dev-server.
  if (fs.existsSync(path.join(__dirname, "certs"))) {
    const key = fs.readFileSync(path.join(__dirname, "certs", "key.pem"));
    const cert = fs.readFileSync(path.join(__dirname, "certs", "cert.pem"));

    return { key, cert };
  } else {
    const pems = selfsigned.generate(
      [
        {
          name: "commonName",
          value: "hubs.local"
        }
      ],
      {
        days: 365,
        keySize: 2048,
        algorithm: "sha256",
        extensions: [
          {
            name: "subjectAltName",
            altNames: [
              {
                type: 2,
                value: "hubs.local"
              },
              {
                type: 2,
                value: "hubs.local"
              }
            ]
          }
        ]
      }
    );

    fs.mkdirSync(path.join(__dirname, "certs"));
    fs.writeFileSync(path.join(__dirname, "certs", "cert.pem"), pems.cert);
    fs.writeFileSync(path.join(__dirname, "certs", "key.pem"), pems.private);

    return {
      key: pems.private,
      cert: pems.cert
    };
  }
}

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
  process.env.CORS_PROXY_SERVER = "hubs.local:8080/cors-proxy";
  process.env.THUMBNAIL_SERVER = thumbnail_server;
  process.env.TERRA_SERVER = terra_server;
  process.env.NON_CORS_PROXY_DOMAINS = "hubs.local,hubs.local";

  return appConfig;
}

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
        CORS_PROXY_SERVER: "cors-proxy.jel.app",
        NON_CORS_PROXY_DOMAINS: "hubs.local,jel.dev",
        BASE_ASSETS_PATH: "https://hubs.local:8080/",
        RETICULUM_SERVER: "hubs.local:4000",
        POSTGREST_SERVER: "",
        ITA_SERVER: ""
      });
    }
  }

  // In production, the environment variables are defined in CI or loaded from ita and
  // the app config is injected into the head of the page by Reticulum.

  const host = process.env.HOST_IP || env.localDev || env.remoteDev ? "hubs.local" : "hubs.local";

  return {
    stats: {
      children: true
    },
    resolve: {
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
      https: createHTTPSConfig(),
      client: {
        webSocketURL: {
          hostname: "0.0.0.0",
          port: 8080
        }
      },
      // host: "local-ip", NOTE: probably need this for LAN
      allowedHosts: [host, "hubs.local"],
      headers: {
        "Access-Control-Allow-Origin": "*"
      },
      onBeforeSetupMiddleware: function({ app }) {
        // Local CORS proxy
        app.all("/cors-proxy/*", (req, res) => {
          res.header("Access-Control-Allow-Origin", "*");
          res.header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
          res.header("Access-Control-Allow-Headers", "Range");
          res.header(
            "Access-Control-Expose-Headers",
            "Accept-Ranges, Content-Encoding, Content-Length, Content-Range, Jel-Name, Jel-Entity-Type"
          );
          res.header("Vary", "Origin");
          res.header("X-Content-Type-Options", "nosniff");

          const redirectLocation = req.header("location");

          if (redirectLocation) {
            res.header("Location", "https://hubs.local:8080/cors-proxy/" + redirectLocation);
          }

          if (req.method === "OPTIONS") {
            res.send();
          } else {
            const url = req.path.replace("/cors-proxy/", "");
            request({ url, method: req.method }, error => {
              if (error) {
                console.error(`cors-proxy: error fetching "${url}"\n`, error);
                return;
              }
            }).pipe(res);
          }
        });

        // be flexible with people accessing via a local reticulum on another port
        app.use(cors({ origin: /hubs\.local(:\d*)?$/ }));
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
          test: /\.worker\.js$/,
          loader: "worker-loader",
          options: {
            filename: "assets/js/[name].js",
            publicPath: "/",
            inline: "fallback"
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
          test: /\.(scss|css)$/,
          use: [
            {
              loader: "raw-loader"
            },
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
      new webpack.ProvidePlugin({
        Buffer: ["buffer", "Buffer"]
      }),
      new webpack.ProvidePlugin({
        process: "process/browser"
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
      new CopyWebpackPlugin([
        {
          from: "src/jel.service.js",
          to: "jel.service.js"
        }
      ]),
      // Define process.env variables in the browser context.
      new webpack.DefinePlugin({
        "process.env": JSON.stringify({
          NODE_ENV: argv.mode,
          SHORTLINK_DOMAIN: process.env.SHORTLINK_DOMAIN,
          RETICULUM_SERVER: process.env.RETICULUM_SERVER,
          RETICULUM_SOCKET_SERVER: process.env.RETICULUM_SOCKET_SERVER,
          THUMBNAIL_SERVER: process.env.THUMBNAIL_SERVER,
          TERRA_SERVER: process.env.TERRA_SERVER,
          CORS_PROXY_SERVER: process.env.CORS_PROXY_SERVER,
          NON_CORS_PROXY_DOMAINS: process.env.NON_CORS_PROXY_DOMAINS,
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
