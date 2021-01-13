// media-loader:
// src
// fitToBox
// fileId
// contentType
// contentSubtype
// version
// mediaLayer

const tmpPos = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const tmpScale = new THREE.Vector3();

export default class WorldExporter {
  currentWorldToHtml() {
    const { hubMetadata, hubChannel } = window.APP;
    const metadata = hubMetadata.getMetadata(hubChannel.hubId);
    const doc = document.implementation.createHTMLDocument(metadata.displayName);
    const mediaEls = [...document.querySelectorAll("[shared]")].filter(el => el.components["media-loader"]);

    mediaEls.sort((x, y) => (x.id > y.id ? -1 : x.id < y.id ? 1 : 0));

    for (const el of mediaEls) {
      const exportEl = this.elToExportEl(doc, el);
      if (!exportEl) continue;

      doc.body.appendChild(exportEl);
    }

    return new XMLSerializer().serializeToString(doc);
  }

  elToExportEl(doc, el) {
    const { terrainSystem } = AFRAME.scenes[0].systems["hubs-systems"];
    const { src, fileId, contentSubtype } = el.components["media-loader"].data;

    let exportEl;

    if (el.components["media-image"]) {
      exportEl = doc.createElement("img");
      exportEl.setAttribute("crossorigin", "anonymous");
    }

    if (el.components["media-video"]) {
      exportEl = doc.createElement("video");
      const { audioSrc, volume, loop, time, videoPaused } = el.components["media-video"].data;

      exportEl.setAttribute("crossorigin", "anonymous");
      exportEl.setAttribute("controls", "");

      if (videoPaused) {
        exportEl.setAttribute("currentTime", time);
      } else {
        exportEl.setAttribute("autoplay", "");
      }

      if (loop) {
        exportEl.setAttribute("loop", "");
      }

      if (volume <= 0) {
        exportEl.setAttribute("muted", "");
      }

      if (audioSrc && audioSrc !== src) {
        exportEl.setAttribute("data-audio-src", audioSrc);
      }
    }

    if (exportEl) {
      const { object3D, id } = el;

      exportEl.src = src;
      exportEl.id = id.replaceAll("naf-", "");

      if (fileId) {
        exportEl.setAttribute("data-file-id", fileId);
      }

      if (contentSubtype) {
        exportEl.setAttribute("data-content-subtype", contentSubtype);
      }

      object3D.updateMatrices();
      object3D.matrixWorld.decompose(tmpPos, tmpQuat, tmpScale);

      // Normalize Y to be terrain-agnostic
      const height = terrainSystem.getTerrainHeightAtWorldCoord(tmpPos.x, tmpPos.z);
      const x = tmpPos.x;
      const y = tmpPos.y - height;
      const z = tmpPos.z;

      // Axis angle
      const t = Math.sqrt(1 - tmpQuat.w * tmpQuat.w);
      const rx = tmpQuat.x / t;
      const ry = tmpQuat.y / t;
      const rz = tmpQuat.z / t;
      const rr = 2 * Math.acos(tmpQuat.w);

      const style = `translate3d(${x}, ${y}, ${z}); rotate3d(${rx}, ${ry}, ${rz}, ${rr}rad); scale3D(${tmpScale.x}, ${
        tmpScale.y
      }, ${tmpScale.z});`;

      exportEl.setAttribute("style", style);
    }

    return exportEl;
  }
}

window.WorldExporter = WorldExporter;
