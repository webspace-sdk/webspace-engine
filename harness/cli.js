#!/usr/bin/env node
"use strict";

// CLI front-end for the webspace runtime harness.
//
// Usage:
//   node harness/cli.js <webspace> <step> [step ...] [--flags]
//
// <webspace> is a path to a local .html webspace or an http(s) URL.
// Steps run in order against the same loaded world, then the browser closes.
//
// Steps (key=value pairs are comma-separated):
//   info                          print scene/avatar info as JSON
//   pose                          print avatar pose
//   entities                      list media entities in the world
//   screenshot:name.png           save a viewport screenshot
//   move:forward=2,strafe=0,frames=40
//   turn:1.57                     rotate in place (radians, +left)
//   teleport:x=0,y=1.6,z=3,rotationY=0
//   spawn:url=https://...,zOffset=-2,scale=0.5
//   duck                          spawn the built-in duck in front of you
//   env:backgroundColor=#202030   set environment-settings keys
//   sethtml:@path/to/world.html   replace the world from an HTML file
//   gethtml:out.html              serialize current world to a file
//   eval:@path/to/snippet.js      run arbitrary in-page JS (async body)
//   wait:1500                     sleep N milliseconds
//
// Flags: --headed  --verbose  --engine=URL  --out=DIR  --width=N --height=N
//
// Example:
//   node harness/cli.js harness/webspaces/sample.html \
//       screenshot:before.png duck move:forward=3,frames=60 \
//       turn:1.57 spawn:url=https://example.com/img.png screenshot:after.png

const path = require("path");
const fs = require("fs");
const { WebspaceHarness } = require("./driver");

function parseKV(s) {
  const out = {};
  if (!s) return out;
  for (const pair of s.split(",")) {
    const i = pair.indexOf("=");
    if (i === -1) continue;
    const k = pair.slice(0, i).trim();
    let v = pair.slice(i + 1).trim();
    if (v !== "" && !isNaN(Number(v)) && !/^#/.test(v)) v = Number(v);
    else if (v === "true") v = true;
    else if (v === "false") v = false;
    out[k] = v;
  }
  return out;
}

function readArg(v) {
  // "@file" means read file contents.
  if (typeof v === "string" && v.startsWith("@")) {
    return fs.readFileSync(path.resolve(v.slice(1)), "utf8");
  }
  return v;
}

async function runStep(h, step) {
  const colon = step.indexOf(":");
  const cmd = (colon === -1 ? step : step.slice(0, colon)).trim();
  const arg = colon === -1 ? "" : step.slice(colon + 1);

  switch (cmd) {
    case "info":
      return ["info", await h.info()];
    case "pose":
      return ["pose", await h.pose()];
    case "entities":
      return ["entities", await h.listEntities()];
    case "screenshot":
      return ["screenshot", await h.screenshot(arg || undefined)];
    case "move":
      return ["move", await h.move(parseKV(arg))];
    case "turn":
      return ["turn", await h.turn(Number(arg))];
    case "teleport":
      return ["teleport", await h.teleport(parseKV(arg))];
    case "spawn":
      return ["spawn", await h.spawnMedia(parseKV(arg))];
    case "duck":
      return ["duck", await h.spawnDuck()];
    case "env":
      return ["env", await h.setEnvironment(parseKV(arg))];
    case "ui":
      return ["ui", await h.setUIVisible(arg !== "off" && arg !== "false" && arg !== "0")];
    case "sethtml":
      return ["sethtml", await h.setWorldHtml(readArg(arg))];
    case "gethtml": {
      const html = await h.getWorldHtml();
      if (arg) fs.writeFileSync(path.resolve(arg), html);
      return ["gethtml", arg ? `wrote ${arg} (${html.length} bytes)` : html];
    }
    case "eval":
      return ["eval", await h.eval(readArg(arg))];
    case "wait":
      await new Promise(r => setTimeout(r, Number(arg) || 0));
      return ["wait", `${arg}ms`];
    default:
      throw new Error("unknown step: " + step);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const flags = {};
  const positional = [];
  for (const a of argv) {
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      flags[k] = v === undefined ? true : v;
    } else {
      positional.push(a);
    }
  }
  if (positional.length === 0) {
    console.error("usage: node harness/cli.js <webspace> <step> [step ...] [--flags]");
    process.exit(2);
  }
  const [webspace, ...steps] = positional;

  const h = new WebspaceHarness({
    headless: !flags.headed,
    verbose: !!flags.verbose,
    width: flags.width ? Number(flags.width) : 1280,
    height: flags.height ? Number(flags.height) : 720,
    screenshotDir: flags.out ? path.resolve(flags.out) : undefined
  });

  let exitCode = 0;
  try {
    await h.launch();
    await h.open(webspace, flags.engine ? { engineUrl: flags.engine } : undefined);
    console.error("[harness] world ready:", JSON.stringify(await h.info()));
    for (const step of steps) {
      const [label, result] = await runStep(h, step);
      console.log(`>> ${label}:`, typeof result === "string" ? result : JSON.stringify(result));
    }
  } catch (e) {
    console.error("[harness] ERROR:", e && e.stack ? e.stack : e);
    exitCode = 1;
  } finally {
    await h.close();
  }
  process.exit(exitCode);
}

main();
