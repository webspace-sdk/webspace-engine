import { computeObjectAABB, getBox, getScaleCoefficient } from "../utils/auto-box-collider";
import { ensureOwnership, getNetworkedEntity } from "../../jel/utils/ownership-utils";
import { ParticleEmitter } from "lib-hubs/packages/three-particle-emitter/lib/esm/index";
import loadingParticleSrc from "!!url-loader!../../assets/jel/images/loading-particle.png";
import {
  resolveUrl,
  getDefaultResolveQuality,
  injectCustomShaderChunks,
  addMeshScaleAnimation,
  closeExistingMediaMirror
} from "../utils/media-utils";
import {
  isNonCorsProxyDomain,
  guessContentType,
  proxiedUrlFor,
  isHubsRoomUrl,
  isLocalHubsSceneUrl,
  isLocalHubsAvatarUrl
} from "../utils/media-url-utils";
import { addAnimationComponents } from "../utils/animation";
import qsTruthy from "../utils/qs_truthy";

import { SOUND_MEDIA_LOADING, SOUND_MEDIA_LOADED } from "../systems/sound-effects-system";
import { setMatrixWorld, disposeExistingMesh, disposeNode } from "../utils/three-utils";

import { SHAPE } from "three-ammo/constants";

const fetchContentType = url => {
  return fetch(url, { method: "HEAD" }).then(r => r.headers.get("content-type"));
};

const forceMeshBatching = qsTruthy("batchMeshes");
const forceImageBatching = true; //qsTruthy("batchImages");
const disableBatching = qsTruthy("disableBatching");

const loadingParticleImage = new Image();
loadingParticleImage.src = loadingParticleSrc;
const loadingParticleTexture = new THREE.Texture(loadingParticleImage);
loadingParticleImage.onload = () => (loadingParticleTexture.needsUpdate = true);

AFRAME.registerComponent("media-loader", {
  schema: {
    fileId: { type: "string" },
    src: { type: "string" },
    initialContents: { type: "string" },
    version: { type: "number", default: 1 }, // Used to force a re-resolution
    fitToBox: { default: false },
    moveTheParentNotTheMesh: { default: false },
    resolve: { default: true },
    contentType: { default: null },
    contentSubtype: { default: null },
    mediaLayer: { default: null },
    addedLocally: { default: false },
    linkedEl: { default: null }, // This is the element of which this is a linked derivative. See linked-media.js
    mediaOptions: {
      default: {},
      parse: v => (typeof v === "object" ? v : JSON.parse(v)),
      stringify: JSON.stringify
    }
  },

  init() {
    this.onError = this.onError.bind(this);
    this.showLoader = this.showLoader.bind(this);
    this.cleanupLoader = this.cleanupLoader.bind(this);
    this.onMediaLoaded = this.onMediaLoaded.bind(this);
    this.handleLinkedElRemoved = this.handleLinkedElRemoved.bind(this);
    this.refresh = this.refresh.bind(this);
    this.animating = false;

    const hubsSystems = this.el.sceneEl.systems["hubs-systems"];
    hubsSystems.skyBeamSystem.register(this.el.object3D);

    getNetworkedEntity(this.el).then(networkedEl => {
      this.networkedEl = networkedEl;

      if (typeof this.data.mediaLayer === "number") {
        hubsSystems.mediaPresenceSystem.updateDesiredMediaPresence(this.el);
      }
    });
  },

  updateScale: (function() {
    const center = new THREE.Vector3();
    const originalMeshMatrix = new THREE.Matrix4();
    const desiredObjectMatrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const box = new THREE.Box3();
    return function(fitToBox, moveTheParentNotTheMesh) {
      this.el.object3D.updateMatrices();
      const mesh = this.el.getObject3D("mesh");
      if (!mesh) return;
      mesh.updateMatrices();
      if (moveTheParentNotTheMesh) {
        if (fitToBox) {
          console.warn(
            "Unexpected combination of inputs. Can fit the mesh to a box OR move the parent to the mesh, but did not expect to do both.",
            this.el
          );
        }
        // Keep the mesh exactly where it is, but move the parent transform such that it aligns with the center of the mesh's bounding box.
        originalMeshMatrix.copy(mesh.matrixWorld);
        computeObjectAABB(mesh, box);
        center.addVectors(box.min, box.max).multiplyScalar(0.5);
        this.el.object3D.matrixWorld.decompose(position, quaternion, scale);
        desiredObjectMatrix.compose(
          center,
          quaternion,
          scale
        );
        setMatrixWorld(this.el.object3D, desiredObjectMatrix);
        mesh.updateMatrices();
        setMatrixWorld(mesh, originalMeshMatrix);
      } else {
        // Move the mesh such that the center of its bounding box is in the same position as the parent matrix position
        const box = getBox(this.el, mesh);
        const scaleCoefficient = fitToBox ? getScaleCoefficient(0.5, box) : 1;
        const { min, max } = box;
        center.addVectors(min, max).multiplyScalar(0.5 * scaleCoefficient);
        mesh.scale.multiplyScalar(scaleCoefficient);
        mesh.position.sub(center);
        mesh.matrixNeedsUpdate = true;
      }
    };
  })(),

  removeShape(id) {
    if (this.el.getAttribute("shape-helper__" + id)) {
      this.el.removeAttribute("shape-helper__" + id);
    }
  },

  tick(t, dt) {
    if (this.loaderParticles) {
      this.loaderParticles.update(dt / 1000);
    }
  },

  handleLinkedElRemoved(e) {
    if (e.detail.name === "media-loader") {
      this.data.linkedEl.removeEventListener("componentremoved", this.handleLinkedElRemoved);

      // this should be revisited if we ever use media linking for something other than media mirroring UX --
      // right now it is assumed if there is a linkedEl, this is the currently active mirrored media
      closeExistingMediaMirror();
    }
  },

  remove() {
    if (this.data.linkedEl) {
      this.data.linkedEl.removeEventListener("componentremoved", this.handleLinkedElRemoved);
    }

    const hubsSystems = this.el.sceneEl.systems["hubs-systems"];
    hubsSystems.skyBeamSystem.unregister(this.el.object3D);

    const sfx = hubsSystems.soundEffectsSystem;

    if (this.loadingSoundEffect) {
      sfx.stopPositionalAudio(this.loadingSoundEffect);
      this.loadingSoundEffect = null;
    }
    if (this.loadedSoundEffect) {
      sfx.stopPositionalAudio(this.loadedSoundEffect);
      this.loadedSoundEffect = null;
    }
    this.cleanupLoader(true);
  },

  onError() {
    this.el.removeAttribute("gltf-model-plus");
    this.el.removeAttribute("media-pager");
    this.el.removeAttribute("media-video");
    this.el.removeAttribute("media-pdf");
    this.el.removeAttribute("media-text");
    this.el.setAttribute("media-image", { src: "error" });
    this.cleanupLoader(true);
  },

  async showLoader() {
    if (this.el.object3DMap.mesh) {
      this.cleanupLoader();
      return;
    }

    this.loaderParticles = new ParticleEmitter(null);
    this.loaderParticles.startOpacity = 1.0;
    this.loaderParticles.middleOpacity = 0.8;
    this.loaderParticles.endOpacity = 0.7;
    this.loaderParticles.colorCurve = "linear";
    this.loaderParticles.sizeCurve = "linear";
    this.loaderParticles.startSize = 0.005;
    this.loaderParticles.endSize = 0;
    this.loaderParticles.sizeRandomness = 0.05;
    this.loaderParticles.ageRandomness = 1.5;
    this.loaderParticles.angularVelocity = 0;
    this.loaderParticles.lifetime = 0.2;
    this.loaderParticles.lifetimeRandomness = 1.2;
    this.loaderParticles.particleCount = window.APP.detailLevel === 0 ? 30 : 20;
    this.loaderParticles.startVelocity = new THREE.Vector3(0, 0, 0.55);
    this.loaderParticles.endVelocity = new THREE.Vector3(0, 0, 1.05);
    this.loaderParticles.velocityCurve = "linear";
    this.loaderParticles.material.uniforms.map.value = loadingParticleTexture;
    this.loaderParticles.updateParticles();
    this.loaderParticles.position.y = -0.5;
    this.loaderParticles.scale.x = 0.35;
    this.loaderParticles.scale.y = 0.35;
    this.loaderParticles.rotation.set(-Math.PI / 2, 0, 0);
    this.loaderParticles.matrixNeedsUpdate = true;
    this.el.setObject3D("loader-particles", this.loaderParticles);

    this.updateScale(true, false);

    if (this.el.sceneEl.is("entered") && this.data.addedLocally) {
      this.loadingSoundEffect = this.el.sceneEl.systems["hubs-systems"].soundEffectsSystem.playPositionalSoundFollowing(
        SOUND_MEDIA_LOADING,
        this.el.object3D,
        true
      );
    }

    delete this.showLoaderTimeout;
  },

  cleanupLoader(skipClosingAnimation) {
    clearTimeout(this.showLoaderTimeout);
    delete this.showLoaderTimeout;

    if (this.loadingSoundEffect) {
      this.el.sceneEl.systems["hubs-systems"].soundEffectsSystem.stopPositionalAudio(this.loadingSoundEffect);
      this.loadingSoundEffect = null;
    }
    if (this.loaderParticles) {
      if (skipClosingAnimation) {
        this.el.removeObject3D("loader-particles");
        this.loaderParticles.material.uniforms.map.value = null;
        disposeNode(this.loaderParticles);
        this.loaderParticles = null;
      } else {
        this.loaderParticles.lifetime = 6.5;
        this.loaderParticles.middleOpacity = 0.0;
        this.loaderParticles.endOpacity = 0.0;
        for (let i = 0; i < this.loaderParticles.particleCount; i++) {
          this.loaderParticles.lifetimes[i] = 6;
        }

        setTimeout(() => {
          if (this.loaderParticles) {
            this.el.removeObject3D("loader-particles");
            this.loaderParticles.material.uniforms.map.value = null;
            disposeNode(this.loaderParticles);
            this.loaderParticles = null;
          }
        }, 5000);
      }
    }
  },

  updateHoverableVisuals: (function() {
    const boundingBox = new THREE.Box3();
    const boundingSphere = new THREE.Sphere();
    return function() {
      const hoverableVisuals = this.el.components["hoverable-visuals"];

      if (hoverableVisuals && this.el.object3DMap.mesh) {
        if (!this.injectedCustomShaderChunks) {
          this.injectedCustomShaderChunks = true;
          hoverableVisuals.uniforms = injectCustomShaderChunks(this.el.object3D);
        }

        boundingBox.setFromObject(this.el.object3DMap.mesh);
        boundingBox.getBoundingSphere(boundingSphere);
        hoverableVisuals.geometryRadius = boundingSphere.radius / this.el.object3D.scale.y;
      }
    };
  })(),

  onMediaLoaded(physicsShape = null, shouldUpdateScale) {
    const el = this.el;
    this.cleanupLoader();

    if (this.el.sceneEl.is("entered") && this.data.addedLocally) {
      this.loadedSoundEffect = this.el.sceneEl.systems["hubs-systems"].soundEffectsSystem.playPositionalSoundFollowing(
        SOUND_MEDIA_LOADED,
        this.el.object3D,
        false
      );
    }

    const finish = () => {
      this.animating = false;

      if (physicsShape) {
        el.setAttribute("shape-helper", {
          type: physicsShape,
          minHalfExtent: 0.04
        });
      }

      this.updateHoverableVisuals();

      if (this.data.linkedEl) {
        this.el.sceneEl.systems["linked-media"].registerLinkage(this.data.linkedEl, this.el);
        this.data.linkedEl.addEventListener("componentremoved", this.handleLinkedElRemoved);
      }

      el.emit("media-loaded");
    };

    if (this.data.addedLocally) {
      if (!this.animating) {
        this.animating = true;
        if (shouldUpdateScale) this.updateScale(this.data.fitToBox, this.data.moveTheParentNotTheMesh);
        const mesh = this.el.getObject3D("mesh");
        const scale = { x: 0.001, y: 0.001, z: 0.001 };
        scale.x = mesh.scale.x < scale.x ? mesh.scale.x * 0.001 : scale.x;
        scale.y = mesh.scale.y < scale.y ? mesh.scale.x * 0.001 : scale.y;
        scale.z = mesh.scale.z < scale.z ? mesh.scale.x * 0.001 : scale.z;
        addMeshScaleAnimation(mesh, scale, finish);
      }
    } else {
      if (shouldUpdateScale) this.updateScale(this.data.fitToBox, this.data.moveTheParentNotTheMesh);
      finish();
    }
  },

  refresh() {
    if (this.networkedEl && !ensureOwnership(this.networkedEl)) return;

    // When we refresh, we bump the version to the current timestamp.
    //
    // The only use-case for refresh right now is re-fetching screenshots.
    this.el.setAttribute("media-loader", { version: Math.floor(Date.now() / 1000) });
  },

  async update(oldData, forceLocalRefresh) {
    const { src, version, contentSubtype } = this.data;
    if (!src) return;

    const mediaChanged = oldData.src !== src;
    const versionChanged = !!(oldData.version && oldData.version !== version);
    if (!mediaChanged && !versionChanged && !forceLocalRefresh) return;

    if (versionChanged) {
      this.el.emit("media_refreshing");
    }

    if (forceLocalRefresh) {
      this.el.removeAttribute("gltf-model-plus");
      this.el.removeAttribute("media-pager");
      this.el.removeAttribute("media-video");
      this.el.removeAttribute("media-pdf");
      this.el.removeAttribute("media-image");
      this.el.removeAttribute("media-text");
    }

    try {
      if ((forceLocalRefresh || mediaChanged) && !this.showLoaderTimeout && this.data.addedLocally) {
        // Delay loader so we don't do it if media is locally cached, etc.
        this.showLoaderTimeout = setTimeout(this.showLoader, 100);
      }

      let canonicalUrl = src;
      let canonicalAudioUrl = src;
      let accessibleUrl = src;
      let contentType = this.data.contentType;
      let thumbnail;

      const parsedUrl = new URL(src);

      // We want to resolve and proxy some hubs urls, like rooms and scene links,
      // but want to avoid proxying assets in order for this to work in dev environments
      const isLocalModelAsset =
        isNonCorsProxyDomain(parsedUrl.hostname) && (guessContentType(src) || "").startsWith("model/gltf");

      if (this.data.resolve && !src.startsWith("data:") && !src.startsWith("jel:") && !isLocalModelAsset) {
        const is360 = !!(this.data.mediaOptions.projection && this.data.mediaOptions.projection.startsWith("360"));
        const quality = getDefaultResolveQuality(is360);
        const result = await resolveUrl(src, quality, version, forceLocalRefresh);
        canonicalUrl = result.origin;

        // handle protocol relative urls
        if (canonicalUrl.startsWith("//")) {
          canonicalUrl = location.protocol + canonicalUrl;
        }

        canonicalAudioUrl = result.origin_audio;
        if (canonicalAudioUrl && canonicalAudioUrl.startsWith("//")) {
          canonicalAudioUrl = location.protocol + canonicalAudioUrl;
        }

        contentType = (result.meta && result.meta.expected_content_type) || contentType;
        thumbnail = result.meta && result.meta.thumbnail && proxiedUrlFor(result.meta.thumbnail);
      }

      // todo: we don't need to proxy for many things if the canonical URL has permissive CORS headers
      accessibleUrl = proxiedUrlFor(canonicalUrl);

      // if the component creator didn't know the content type, we didn't get it from reticulum, and
      // we don't think we can infer it from the extension, we need to make a HEAD request to find it out
      contentType = contentType || guessContentType(canonicalUrl) || (await fetchContentType(accessibleUrl));

      // TODO we should probably just never return "application/octet-stream" as expectedContentType, since its not really useful
      if (contentType === "application/octet-stream") {
        contentType = guessContentType(canonicalUrl) || contentType;
      }

      // Some servers treat m3u8 playlists as "audio/x-mpegurl", we always want to treat them as HLS videos
      if (contentType === "audio/x-mpegurl") {
        contentType = "application/vnd.apple.mpegurl";
      }

      // Clear loader, if any.
      disposeExistingMesh(this.el);

      // We don't want to emit media_resolved for index updates.
      if (forceLocalRefresh || mediaChanged) {
        this.el.emit("media_resolved", { src, raw: accessibleUrl, contentType });
      } else {
        this.el.emit("media_refreshed", { src, raw: accessibleUrl, contentType });
      }

      this.el.addEventListener("media-load-error", () => this.cleanupLoader());

      if (src.startsWith("jel://entities/") && src.includes("/components/media-text")) {
        this.el.removeAttribute("gltf-model-plus");
        this.el.removeAttribute("media-image");
        this.el.removeAttribute("media-video");
        this.el.removeAttribute("media-pdf");
        this.el.removeAttribute("media-pager");

        this.el.addEventListener("text-loaded", () => this.onMediaLoaded(SHAPE.BOX), { once: true });

        const fitContent = contentSubtype !== "page";
        this.el.setAttribute("media-text", { src: accessibleUrl, fitContent });
      } else if (
        contentType.startsWith("video/") ||
        contentType.startsWith("audio/") ||
        contentType.startsWith("application/dash") ||
        AFRAME.utils.material.isHLS(canonicalUrl, contentType)
      ) {
        let linkedVideoTexture, linkedAudioSource, linkedMediaElementAudioSource;
        if (this.data.linkedEl) {
          const linkedMediaVideo = this.data.linkedEl.components["media-video"];

          linkedVideoTexture = linkedMediaVideo.videoTexture;
          linkedAudioSource = linkedMediaVideo.audioSource;
          linkedMediaElementAudioSource = linkedMediaVideo.mediaElementAudioSource;
        }

        const qsTime = parseInt(parsedUrl.searchParams.get("t"));
        const hashTime = parseInt(new URLSearchParams(parsedUrl.hash.substring(1)).get("t"));
        const startTime = hashTime || qsTime || 0;
        this.el.removeAttribute("gltf-model-plus");
        this.el.removeAttribute("media-image");
        this.el.removeAttribute("media-text");
        this.el.removeAttribute("media-pdf");
        this.el.setAttribute("floaty-object", { reduceAngularFloat: true, releaseGravity: -1 });
        this.el.addEventListener(
          "video-loaded",
          e => {
            this.onMediaLoaded(e.detail.projection === "flat" ? SHAPE.BOX : null);
          },
          { once: true }
        );
        this.el.setAttribute(
          "media-video",
          Object.assign({}, this.data.mediaOptions, {
            src: accessibleUrl,
            audioSrc: canonicalAudioUrl ? proxiedUrlFor(canonicalAudioUrl) : null,
            time: startTime,
            contentType,
            linkedVideoTexture,
            linkedAudioSource,
            linkedMediaElementAudioSource
          })
        );
        if (this.el.components["position-at-border__freeze"]) {
          this.el.setAttribute("position-at-border__freeze", { isFlat: true });
        }
        if (this.el.components["position-at-border__freeze-unprivileged"]) {
          this.el.setAttribute("position-at-border__freeze-unprivileged", { isFlat: true });
        }
      } else if (contentType.startsWith("image/")) {
        this.el.removeAttribute("gltf-model-plus");
        this.el.removeAttribute("media-video");
        this.el.removeAttribute("media-text");
        this.el.removeAttribute("media-pdf");
        this.el.removeAttribute("media-pager");
        this.el.addEventListener(
          "image-loaded",
          e => {
            this.onMediaLoaded(e.detail.projection === "flat" ? SHAPE.BOX : null);

            if (contentSubtype === "photo-camera") {
              this.el.setAttribute("hover-menu__photo", {
                template: "#photo-hover-menu",
                isFlat: true
              });
            }
          },
          { once: true }
        );
        this.el.setAttribute("floaty-object", { reduceAngularFloat: true, releaseGravity: -1 });
        let batch = !disableBatching && forceImageBatching;
        if (typeof this.data.mediaOptions.batch !== "undefined" && !this.data.mediaOptions.batch) {
          batch = false;
        }
        this.el.setAttribute(
          "media-image",
          Object.assign({}, this.data.mediaOptions, {
            src: accessibleUrl,
            version,
            contentType,
            batch
          })
        );

        if (this.el.components["position-at-border__freeze"]) {
          this.el.setAttribute("position-at-border__freeze", { isFlat: true });
        }
        if (this.el.components["position-at-border__freeze-unprivileged"]) {
          this.el.setAttribute("position-at-border__freeze-unprivileged", { isFlat: true });
        }
      } else if (contentType.startsWith("application/pdf")) {
        this.el.removeAttribute("gltf-model-plus");
        this.el.removeAttribute("media-video");
        this.el.removeAttribute("media-text");
        this.el.removeAttribute("media-image");
        this.el.setAttribute(
          "media-pdf",
          Object.assign({}, this.data.mediaOptions, {
            src: accessibleUrl,
            contentType,
            batch: false // Batching disabled until atlas is updated properly
          })
        );
        this.el.setAttribute("media-pager", {});
        this.el.setAttribute("floaty-object", { reduceAngularFloat: true, releaseGravity: -1 });
        this.el.addEventListener(
          "pdf-loaded",
          () => {
            this.cleanupLoader();
            this.onMediaLoaded(SHAPE.BOX);
          },
          { once: true }
        );

        if (this.el.components["position-at-border__freeze"]) {
          this.el.setAttribute("position-at-border__freeze", { isFlat: true });
        }
        if (this.el.components["position-at-border__freeze-unprivileged"]) {
          this.el.setAttribute("position-at-border__freeze-unprivileged", { isFlat: true });
        }
      } else if (
        contentType.includes("application/octet-stream") ||
        contentType.includes("x-zip-compressed") ||
        contentType.startsWith("model/gltf")
      ) {
        this.el.removeAttribute("media-image");
        this.el.removeAttribute("media-video");
        this.el.removeAttribute("media-text");
        this.el.removeAttribute("media-pdf");
        this.el.removeAttribute("media-pager");
        this.el.addEventListener(
          "model-loaded",
          () => {
            this.onMediaLoaded(SHAPE.HULL, true);
            addAnimationComponents(this.el);
          },
          { once: true }
        );
        this.el.addEventListener("model-error", this.onError, { once: true });
        let batch = !disableBatching && forceMeshBatching;
        if (typeof this.data.mediaOptions.batch !== "undefined" && !this.data.mediaOptions.batch) {
          batch = false;
        }
        this.el.setAttribute("floaty-object", { gravitySpeedLimit: 1.85 });
        this.el.setAttribute(
          "gltf-model-plus",
          Object.assign({}, this.data.mediaOptions, {
            src: accessibleUrl,
            contentType: contentType,
            inflate: true,
            toon: true,
            batch,
            modelToWorldScale: this.data.fitToBox ? 0.0001 : 1.0
          })
        );
      } else if (contentType.startsWith("text/html")) {
        this.el.removeAttribute("gltf-model-plus");
        this.el.removeAttribute("media-video");
        this.el.removeAttribute("media-text");
        this.el.removeAttribute("media-pdf");
        this.el.removeAttribute("media-pager");
        this.el.addEventListener(
          "image-loaded",
          async () => {
            const mayChangeScene = this.el.sceneEl.systems.permissions.can("update_hub_meta");

            if (await isLocalHubsAvatarUrl(src)) {
              this.el.setAttribute("hover-menu__hubs-item", {
                template: "#avatar-link-hover-menu",
                isFlat: true
              });
            } else if ((await isHubsRoomUrl(src)) || ((await isLocalHubsSceneUrl(src)) && mayChangeScene)) {
              this.el.setAttribute("hover-menu__hubs-item", {
                template: "#hubs-destination-hover-menu",
                isFlat: true
              });
            } else {
              this.el.setAttribute("hover-menu__link", { template: "#link-hover-menu", isFlat: true });
            }
            this.onMediaLoaded(SHAPE.BOX);
          },
          { once: true }
        );
        this.el.setAttribute("floaty-object", { reduceAngularFloat: true, releaseGravity: -1 });
        let batch = !disableBatching && forceImageBatching;
        if (typeof this.data.mediaOptions.batch !== "undefined" && !this.data.mediaOptions.batch) {
          batch = false;
        }
        this.el.setAttribute(
          "media-image",
          Object.assign({}, this.data.mediaOptions, {
            src: thumbnail,
            version,
            contentType: guessContentType(thumbnail) || "image/png",
            batch
          })
        );
        if (this.el.components["position-at-border__freeze"]) {
          this.el.setAttribute("position-at-border__freeze", { isFlat: true });
        }
        if (this.el.components["position-at-border__freeze-unprivileged"]) {
          this.el.setAttribute("position-at-border__freeze-unprivileged", { isFlat: true });
        }
      } else {
        throw new Error(`Unsupported content type: ${contentType}`);
      }
    } catch (e) {
      if (this.el.components["position-at-border__freeze"]) {
        this.el.setAttribute("position-at-border__freeze", { isFlat: true });
      }
      if (this.el.components["position-at-border__freeze-unprivileged"]) {
        this.el.setAttribute("position-at-border__freeze-unprivileged", { isFlat: true });
      }
      console.error("Error adding media", e);
      this.onError();
    }
  },

  consumeInitialContents: function() {
    if (!this.data.initialContents) return;

    const contents = this.data.initialContents;
    this.el.setAttribute("media-loader", { initialContents: null });
    return contents;
  }
});

AFRAME.registerComponent("media-pager", {
  schema: {
    index: { default: 0 },
    maxIndex: { default: 0 }
  },

  init() {
    this.update = this.update.bind(this);

    this.el.setAttribute("hover-menu__pager", { template: "#pager-hover-menu", isFlat: true });
    this.el.components["hover-menu__pager"].getHoverMenu().then(menu => {
      // If we got removed while waiting, do nothing.
      if (!this.el.parentNode) return;

      this.hoverMenu = menu;
      this.pageLabel = this.el.querySelector(".page-label");

      this.update();
      this.el.emit("pager-loaded");
    });

    getNetworkedEntity(this.el)
      .then(networkedEl => {
        this.networkedEl = networkedEl;
        window.APP.hubChannel.addEventListener("permissions_updated", this.update);
      })
      .catch(() => {}); //ignore exception, entity might not be networked

    this.el.addEventListener("pdf-loaded", async () => {
      this.update();
    });
  },

  async update() {
    if (this.pageLabel) {
      this.pageLabel.setAttribute("text", "value", `${this.data.index + 1}/${this.data.maxIndex + 1}`);
    }
  }
});
