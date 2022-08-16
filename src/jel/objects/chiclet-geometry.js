import glb from "!!url-loader!../../assets/jel/models/chiclet.glb";
import glbFlipped from "!!url-loader!../../assets/jel/models/chiclet-flip.glb";

export const chicletGeometry = new Promise(res => {
  new THREE.GLTFLoader(THREE.LoadingManager()).load(glb, async gltf => {
    res(gltf.scene.children[2].geometry);
  });
});

export const chicletGeometryFlipped = new Promise(res => {
  new THREE.GLTFLoader(THREE.LoadingManager()).load(glbFlipped, async gltf => {
    res(gltf.scene.children[2].geometry);
  });
});
