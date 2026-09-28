// Immersive VR (Quest browser, Vision Pro Safari, PC VR). Postprocessing is off while presenting: the
// effect composer isn't stereo-aware and headsets need the frame time.

let supportCache = null;

export function isImmersiveVRSupported() {
  if (!supportCache) {
    supportCache = (async () => {
      try {
        return !!(navigator.xr && (await navigator.xr.isSessionSupported("immersive-vr")));
      } catch (e) {
        return false;
      }
    })();
  }

  return supportCache;
}

// A-Frame requests its session with fixed features; also ask for hand tracking, so hands (and their pinches)
// show up as input sources on headsets that support them.
function requestHandTrackingToo() {
  const xr = navigator.xr;
  if (!xr || xr.__webspaceFeaturesPatched) return;
  const requestSession = xr.requestSession.bind(xr);
  xr.requestSession = (mode, init = {}) =>
    requestSession(mode, {
      ...init,
      optionalFeatures: [...new Set([...(init.optionalFeatures || []), "hand-tracking"])]
    });
  xr.__webspaceFeaturesPatched = true;
}

// Resolves true once the headset is presenting, false if the session couldn't start. Call it from a user gesture
// (e.g. a click handler): the session is requested synchronously so browsers that require a gesture accept it.
export function enterImmersiveVR() {
  const scene = window.AFRAME && AFRAME.scenes[0];
  if (!scene || scene.is("vr-mode") || !navigator.xr) return Promise.resolve(false);

  const effects = scene.systems.effects;
  const effectsWereDisabled = effects.disableEffects;

  requestHandTrackingToo();
  scene.addState("vr-entered");
  effects.disableEffects = true;

  return new Promise(resolve => {
    let settled = false;

    const finish = ok => {
      if (settled) return;
      settled = true;
      scene.removeEventListener("enter-vr", onEnter);

      if (!ok) {
        scene.removeState("vr-entered");
        effects.disableEffects = effectsWereDisabled;
      }

      resolve(ok);
    };

    const onEnter = () => finish(true);
    scene.addEventListener("enter-vr", onEnter);

    try {
      // A-Frame swallows requestSession failures, so also give up if the session never starts.
      Promise.resolve(scene.enterVR()).catch(() => finish(false));
    } catch (e) {
      finish(false);
    }

    setTimeout(() => finish(scene.is("vr-mode")), 8000);
  });
}

export function exitImmersiveVR() {
  const scene = window.AFRAME && AFRAME.scenes[0];
  if (scene && scene.is("vr-mode")) scene.exitVR();
}
