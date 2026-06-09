"use strict";

// Node-side driver for the webspace engine runtime harness.
//
// Launches a real (headless) Chromium with WebGL, loads a webspace that pulls in
// the engine bundle from the dev server, waits for the world to enter, and then
// proxies a set of imperative commands into the in-page `window.__harness` API
// (see ../src/harness.js). All the visual/3D work happens in the page; this class
// is a thin, scriptable remote control + screenshot grabber.

const path = require("path");
const fs = require("fs");

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch (e) {
  chromium = null;
}

const DEFAULT_ENGINE = "http://localhost:8080/assets/js/index.js";

class WebspaceHarness {
  constructor(opts = {}) {
    this.opts = {
      ...opts,
      headless: opts.headless !== false,
      width: opts.width || 1280,
      height: opts.height || 720,
      verbose: !!opts.verbose,
      screenshotDir: opts.screenshotDir || path.join(__dirname, "screenshots")
    };
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  log(...args) {
    if (this.opts.verbose) console.error("[harness]", ...args);
  }

  async launch() {
    if (!chromium) {
      throw new Error(
        "playwright is not installed. Run:  npm i -D playwright && npx playwright install chromium"
      );
    }
    this.browser = await chromium.launch({
      headless: this.opts.headless,
      args: [
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
        "--ignore-gpu-blocklist",
        "--enable-webgl",
        "--disable-web-security",
        "--allow-file-access-from-files",
        "--no-sandbox",
        "--mute-audio"
      ]
    });
    this.context = await this.browser.newContext({
      viewport: { width: this.opts.width, height: this.opts.height },
      deviceScaleFactor: 1,
      ignoreHTTPSErrors: true
    });
    this.page = await this.context.newPage();

    this.page.on("console", msg => {
      if (this.opts.verbose) console.error("[page]", msg.type(), msg.text());
    });
    this.page.on("pageerror", err => console.error("[page-error]", err.message));
    return this;
  }

  // Load a webspace. `target` may be:
  //   - a path to a local .html file (loaded via file://)
  //   - a full http(s) URL
  async open(target, { engineUrl = DEFAULT_ENGINE, timeoutMs = 90000 } = {}) {
    let url;
    if (/^https?:\/\//.test(target) || /^file:\/\//.test(target)) {
      url = target;
    } else {
      const abs = path.resolve(target);
      if (!fs.existsSync(abs)) throw new Error("webspace file not found: " + abs);
      url = "file://" + abs.replace(/\\/g, "/");
    }
    this.log("opening", url, "engine", engineUrl);

    await this.page.goto(url, { waitUntil: "load", timeout: timeoutMs });

    // Wait for the harness global to appear (engine bundle loaded + booted).
    await this.page.waitForFunction(() => !!window.__harness, null, { timeout: timeoutMs });
    this.log("engine booted, waiting for scene to enter...");

    await this.page.evaluate(ms => window.__harness.waitUntilReady(ms), timeoutMs);
    this.log("scene entered");

    // Make sure the render canvas is visible & sized for screenshots.
    await this.page.evaluate(() => {
      const root = window.DOM_ROOT || document;
      const canvas = root.querySelector(".a-canvas");
      if (canvas) {
        canvas.classList.remove("a-hidden");
        canvas.style.width = "100%";
        canvas.style.height = "100%";
      }
      if (window.APP && window.APP.scene && window.APP.scene.resize) window.APP.scene.resize();
    });
    return this;
  }

  // Call a method on window.__harness with JSON-serializable args.
  async call(method, ...args) {
    return this.page.evaluate(
      ({ method, args }) => {
        const fn = window.__harness[method];
        if (typeof fn !== "function") throw new Error("no harness method: " + method);
        return Promise.resolve(fn.apply(window.__harness, args));
      },
      { method, args }
    );
  }

  // ---- introspection ----
  info() {
    return this.call("info");
  }
  pose() {
    return this.call("pose");
  }
  listEntities() {
    return this.call("listEntities");
  }

  // ---- movement ----
  move(spec) {
    return this.call("move", spec);
  }
  turn(radians, frames) {
    return this.call("turn", radians, frames);
  }
  teleport(spec) {
    return this.call("teleport", spec);
  }
  look(pitch) {
    return this.call("look", pitch);
  }

  // ---- media ----
  spawnMedia(spec) {
    return this.call("spawnMedia", spec);
  }
  spawnDuck() {
    return this.call("spawnDuck");
  }

  // ---- editing ----
  setWorldHtml(html, opts) {
    return this.call("setWorldHtml", html, opts || {});
  }
  getWorldHtml() {
    return this.call("getWorldHtml");
  }
  setEnvironment(settings) {
    return this.call("setEnvironment", settings);
  }
  setUIVisible(visible) {
    return this.call("setUIVisible", visible);
  }

  // Arbitrary in-page evaluation (escape hatch). `source` is a function body string.
  async eval(source) {
    return this.page.evaluate(`(async () => { ${source} })()`);
  }

  // ---- screenshots ----
  async screenshot(name) {
    fs.mkdirSync(this.opts.screenshotDir, { recursive: true });
    const file = name && path.isAbsolute(name)
      ? name
      : path.join(this.opts.screenshotDir, name || `shot-${Date.now()}.png`);
    // Give the renderer a couple frames to present the latest state.
    await this.page.evaluate(
      () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
    );
    await this.page.screenshot({ path: file });
    this.log("screenshot ->", file);
    return file;
  }

  async close() {
    if (this.browser) await this.browser.close();
    this.browser = this.context = this.page = null;
  }
}

module.exports = { WebspaceHarness, DEFAULT_ENGINE };
