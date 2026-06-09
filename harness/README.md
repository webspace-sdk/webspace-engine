# Webspace Engine Runtime Harness

A scriptable remote control for a *running* webspace. It launches a headless
Chromium with WebGL, loads a webspace that pulls the engine bundle from the dev
server, waits for the world to fully enter, and then lets you:

- **view screenshots** of the 3D scene,
- **drive the avatar** around (walk, strafe, turn, teleport),
- **spawn media** (images/models/text/ducks) into the world,
- **edit the webspace** (replace world HTML, tweak environment settings),
- inspect avatar pose and the media entities present.

## How it works

```
 cli.js / driver.js  ──Playwright──>  Chromium (WebGL)
                                          │
                                          ▼
                              webspace .html  +  engine bundle
                                          │
                                          ▼
                              window.__harness  (src/harness.js)
                              → SYSTEMS.characterController (movement)
                              → media-utils.addMedia*       (spawn)
                              → WorldImporter / env settings (edit)
```

`src/harness.js` is compiled into the engine bundle (imported from
`src/index.js`) and exposes `window.__harness`. The Node side
(`harness/driver.js`) proxies calls into it and grabs screenshots with
Playwright's page capture (works regardless of `preserveDrawingBuffer`).

## Setup

```bash
npm install                              # engine deps (npm ci can choke on the git-fork deps)
npm i -D playwright                      # driver dep
npx playwright install chromium          # browser

# Serve the engine bundle (publicPath = "/", default app config, no reticulum):
npx webpack serve --mode=development --port 8080 --host 0.0.0.0
```

Leave the dev server running. The sample webspace
(`harness/webspaces/sample.html`) references
`http://localhost:8080/assets/js/index.js`.

## Use

```bash
# Boot, screenshot, spawn a duck, walk forward, screenshot again:
node harness/cli.js harness/webspaces/sample.html \
    info \
    screenshot:before.png \
    duck \
    move:forward=3,frames=60 \
    turn:1.57 \
    screenshot:after.png

# Spawn an image and recolor the world (hide UI chrome for a clean shot):
node harness/cli.js harness/webspaces/sample.html \
    ui:off \
    spawn:url=https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg,zOffset=-2 \
    env:ground=#7a3fb0,sky=#ff7a1a,grass=#c050d0 \
    screenshot:scene.png

# Edit a webspace: import authored HTML, view it, serialize it back out:
node harness/cli.js harness/webspaces/sample.html \
    sethtml:@harness/webspaces/edit-test.html \
    teleport:x=0,y=1.6,z=4 \
    screenshot:edited.png \
    gethtml:harness/webspaces/exported.html
```

Screenshots are written to `harness/screenshots/` by default (`--out=DIR` to
change).

### Programmatic use

```js
const { WebspaceHarness } = require("./harness/driver");
const h = new WebspaceHarness({ verbose: true });
await h.launch();
await h.open("harness/webspaces/sample.html");
await h.spawnMedia({ url: "https://example.com/model.glb" });
await h.move({ forward: 2, frames: 40 });
await h.screenshot("out.png");
await h.close();
```

## Step reference (CLI)

| Step | Meaning |
|------|---------|
| `info` / `pose` / `entities` | print scene/avatar/media state |
| `screenshot:NAME.png` | save a viewport screenshot |
| `move:forward=2,strafe=0,frames=40` | walk (avatar-local, physics-integrated) |
| `turn:RAD` | rotate in place (radians, + = left) |
| `teleport:x=,y=,z=,rotationY=` | hard teleport (ground-snapped) |
| `spawn:url=...,zOffset=-2,scale=0.5` | spawn media in front of the avatar |
| `duck` | spawn the built-in duck (see caveat below) |
| `env:ground=#7a3fb0,sky=#ff7a1a` | recolor the world (channels: `ground edge leaves bark rock grass sky water`; hex or `{r,g,b}`) |
| `ui:off` / `ui:on` | hide/show the 2D UI overlay (panels, hints, modals) for clean 3D screenshots |
| `sethtml:@world.html` | replace/merge the world from a webspace HTML file (this is how you *edit* a webspace) |
| `gethtml:out.html` | serialize the current world to canonical webspace HTML (round-trippable) |
| `eval:@snippet.js` | run arbitrary in-page JS (async body) |
| `wait:MS` | sleep |

## Notes & caveats

- **Webspace HTML format.** `sethtml`/`gethtml` use the engine's own
  `WorldImporter` / `DomSerializeSystem`, so media are semantic tags
  (`<img>`, `<model>`, `<video>`, `<label>`, `<a>`, `<embed>`) with a 7-char `id`
  and a CSS `transform` whose `translate3d` is in **cm** (`100cm` = 1 m). See
  `webspaces/edit-test.html` for a hand-authored example.
- **Clean screenshots.** When a webspace is opened from a local file, the engine
  shows a "grant folder access" modal (it wants write access to persist edits).
  It does not block the JS-driven harness; use `ui:off` to hide it (and all other
  chrome) before screenshots.
- **`file://` asset uploads.** Spawns that *upload an asset* — the built-in
  `duck` (an SVOX model) and local file uploads — require granted folder write
  access, so they report `src: "error"` in pure headless `file://` runs. Spawning
  media from an **external URL** (`spawn:url=…`) needs no upload and always works.
- **External model CORS.** Some external `.glb` URLs don't resolve through the
  engine's CORS proxy and will sit on the loading placeholder; host the model on a
  CORS-friendly origin (or alongside the webspace) if a model won't appear.
