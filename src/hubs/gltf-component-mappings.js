import "./components/gltf-model-plus";

function registerRootSceneComponent(componentName) {
  AFRAME.GLTFModelPlus.registerComponent(componentName, componentName, (el, componentName, componentData) => {
    const sceneEl = AFRAME.scenes[0];

    sceneEl.setAttribute(componentName, componentData);
  });
}

// TODO not sure why this is needed, changes water color significantly
registerRootSceneComponent("background");

AFRAME.GLTFModelPlus.registerComponent("duck", "duck", el => {
  el.setAttribute("duck", "");
  el.setAttribute("quack", { quackPercentage: 0.1 });
});
AFRAME.GLTFModelPlus.registerComponent("quack", "quack");
