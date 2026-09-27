// Immersive VR (Quest browser, Vision Pro Safari, PC VR). Postprocessing is off while presenting: the
// effect composer isn't stereo-aware and headsets need the frame time.
export async function isImmersiveVRSupported() {
  try {
    return !!(navigator.xr && (await navigator.xr.isSessionSupported("immersive-vr")));
  } catch (e) {
    return false;
  }
}

export async function enterImmersiveVR() {
  const scene = AFRAME.scenes[0];
  if (!scene || scene.is("vr-mode") || !(await isImmersiveVRSupported())) return false;

  scene.addState("vr-entered");
  scene.systems.effects.disableEffects = true;
  await scene.enterVR();
  return true;
}

export function exitImmersiveVR() {
  const scene = AFRAME.scenes[0];
  if (scene && scene.is("vr-mode")) scene.exitVR();
}
