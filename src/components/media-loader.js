import { getBox, getScaleCoefficient } from "../utils/auto-box-collider";
import { ensureOwnership, getNetworkedEntity, isSynchronized } from "../utils/ownership-utils";
import { ParticleEmitter } from "lib-hubs/packages/three-particle-emitter/lib/esm/index";
import loadingParticleSrc from "!!url-loader!../assets/images/loading-particle.png";
import { VOX_CONTENT_TYPE } from "../utils/vox-utils";
import {
  injectCustomShaderChunks,
  addMeshScaleAnimation,
  closeExistingMediaMirror,
  preflightUrl,
  MEDIA_VIEW_COMPONENTS,
  getDefaultResolveQuality
} from "../utils/media-utils";
import { guessContentType, isWebspaceUrl } from "../utils/media-url-utils";
import { parseUrlAndCheckRelative } from "../utils/url-utils";
import { addAnimationComponents } from "../utils/animation";

import { SOUND_MEDIA_LOADING, SOUND_MEDIA_LOADED } from "../systems/sound-effects-system";
import { disposeExistingMesh, disposeNode } from "../utils/three-utils";

import { SHAPE } from "three-ammo/constants";

const loadingParticleImage = new Image();
loadingParticleImage.src = loadingParticleSrc;
const loadingParticleTexture = new THREE.Texture(loadingParticleImage);
loadingParticleImage.onload = () => (loadingParticleTexture.needsUpdate = true);

AFRAME.registerComponent("media-loader", {
  schema: {
    src: { type: "string" },
    createdAt: { default: 0 },
    initialContents: { type: "string" },
    version: { type: "number", default: 1 }, // Used to force a re-resolution
    fitToBox: { default: false },
    contentType: { default: null },
    contentSubtype: { default: null },
    addedLocally: { default: false },
    skipLoader: { default: false },
    animate: { default: true },
    linkedEl: { default: null }, // This is the element of which this is a linked derivative. See linked-media.js
    stackAxis: { default: 0 },
    stackSnapPosition: { default: false },
    stackSnapScale: { default: false },
    retryFetchFromSameOrigin: { default: true },
    mediaOptions: {
      default: {},
      parse: v => (typeof v === "object" ? v : JSON.parse(v)),
      stringify: JSON.stringify
    },
    locked: { default: false }
  },

  init() {
    this.onError = this.onError.bind(this);
    this.showLoader = this.showLoader.bind(this);
    this.cleanupLoader = this.cleanupLoader.bind(this);
    this.onMediaLoaded = this.onMediaLoaded.bind(this);
    this.handleLinkedElRemoved = this.handleLinkedElRemoved.bind(this);
    this.refresh = this.refresh.bind(this);
    this.animating = false;
    this.cachedShouldShowLoader = null;

    if (!this.data.locked) {
      SYSTEMS.skyBeamSystem.register(this.el.object3D);
    }

    SYSTEMS.undoSystem.register(this.el);

    if (isSynchronized(this.el)) {
      getNetworkedEntity(this.el).then(networkedEl => {
        this.networkedEl = networkedEl;
      });
    }
  },

  updateScale: (function() {
    const center = new THREE.Vector3();
    return function(fitToBox) {
      this.el.object3D.updateMatrices();
      const mesh = this.el.getObject3D("mesh");
      if (!mesh) return;
      mesh.updateMatrices();
      // Move the mesh such that the center of its bounding box is in the same position as the parent matrix position
      const box = getBox(this.el, mesh);
      const scaleCoefficient = fitToBox ? getScaleCoefficient(0.5, box) : 1;
      const { min, max } = box;
      center.addVectors(min, max).multiplyScalar(0.5 * scaleCoefficient);
      mesh.scale.multiplyScalar(scaleCoefficient);
      mesh.position.sub(center);
      mesh.matrixNeedsUpdate = true;
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

    SYSTEMS.skyBeamSystem.unregister(this.el.object3D);
    SYSTEMS.undoSystem.unregister(this.el);
    SYSTEMS.characterController.removeWalkableModel(this.el.object3D);

    if (SYSTEMS.cameraSystem.inspected === this.el.object3D) {
      SYSTEMS.cameraSystem.uninspect();
    }

    const sfx = SYSTEMS.soundEffectsSystem;

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
    this.setToSingletonMediaComponent("media-image", { src: "error" });
    this.cleanupLoader(true);
    this.el.emit("media-loader-failed");
  },

  shouldShowLoader() {
    if (this.data.skipLoader) return false;

    if (this.cachedShouldShowLoader === null) {
      // Show the loader if the object was spawned in the last 15 seconds.
      // Otherwise assume the object is being loaded as part of a world
      // transition. Cache the result so this returns the same value for
      // subsequent lifecycle events (even after 15s.)
      //
      // Note that this means if you spawn an object and switch worlds quickly
      // it will re-show the animation. But this seemed to be the best way
      // to determine if this object was spawned right in front of you by another
      // user
      this.cachedShouldShowLoader = Math.floor(NAF.connection.getServerTime() / 1000) - this.data.createdAt <= 15;
    }

    return this.cachedShouldShowLoader;
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
    this.loaderParticles.userData.excludeFromBoundingBox = true;

    this.el.setObject3D("loader-particles", this.loaderParticles);

    this.updateScale(true, false);

    if (this.el.sceneEl.is("entered") && this.shouldShowLoader()) {
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

    if (this.el.sceneEl.is("entered") && this.shouldShowLoader() && this.data.animate) {
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

      if (this.el.components["gltf-model-plus"] && this.data.locked) {
        SYSTEMS.characterController.addWalkableModel(this.el.object3D);
      }
    };

    if (this.shouldShowLoader() && this.data.animate) {
      if (!this.animating) {
        this.animating = true;
        if (shouldUpdateScale) this.updateScale(this.data.fitToBox);
        const mesh = this.el.getObject3D("mesh");

        if (mesh) {
          const scale = { x: 0.001, y: 0.001, z: 0.001 };
          scale.x = mesh.scale.x < scale.x ? mesh.scale.x * 0.001 : scale.x;
          scale.y = mesh.scale.y < scale.y ? mesh.scale.x * 0.001 : scale.y;
          scale.z = mesh.scale.z < scale.z ? mesh.scale.x * 0.001 : scale.z;
          addMeshScaleAnimation(mesh, scale, finish);
        }
      }
    } else {
      if (shouldUpdateScale) this.updateScale(this.data.fitToBox);
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
    const { src, version, contentSubtype, locked } = this.data;
    if (!src) return;

    const mediaSrcChanged = oldData.src !== src && !!oldData.src;
    const versionChanged = !!(oldData.version && oldData.version !== version);
    const lockedChanged = oldData.locked !== undefined && oldData.locked !== locked;

    if (lockedChanged) {
      const isModel = !!this.el.components["gltf-model-plus"];

      if (this.data.locked) {
        SYSTEMS.skyBeamSystem.unregister(this.el.object3D);

        if (isModel) {
          SYSTEMS.characterController.addWalkableModel(this.el.object3D);
        }
      } else {
        SYSTEMS.skyBeamSystem.register(this.el.object3D);

        if (isModel) {
          SYSTEMS.characterController.removeWalkableModel(this.el.object3D);
        }
      }

      this.el.emit("media_locked_changed");
    }

    if (oldData.src && !mediaSrcChanged && !versionChanged && !forceLocalRefresh) return;

    if (versionChanged) {
      this.el.emit("media_refreshing");
    }

    if (forceLocalRefresh) {
      this.clearMediaComponents();
    }

    try {
      if ((forceLocalRefresh || oldData.src !== src) && !this.showLoaderTimeout && this.shouldShowLoader()) {
        // Delay loader so we don't do it if media is locally cached, etc.
        this.showLoaderTimeout = setTimeout(this.showLoader, 100);
      }

      let contentUrl = src;
      let accessibleContentUrl = src;
      let accessibleContentAudioUrl = null;
      let contentType = this.data.contentType;

      const [parsedUrl, isRelativeUrl] = parseUrlAndCheckRelative(src);

      if (
        typeof src === "string" &&
        !src.startsWith("data:") &&
        !src.startsWith("webspace:") &&
        contentType !== VOX_CONTENT_TYPE &&
        !isRelativeUrl
      ) {
        try {
          const is360 = !!(this.data.mediaOptions.projection && this.data.mediaOptions.projection.startsWith("360"));
          const quality = getDefaultResolveQuality(is360);
          const forceLink = !!this.data.mediaOptions.forceLink;
          const preflightResponse = await preflightUrl(parsedUrl, quality, forceLink);

          contentType = preflightResponse.contentType || guessContentType(src) || contentType;
          contentUrl = preflightResponse.contentUrl;
          accessibleContentUrl = preflightResponse.accessibleContentUrl;
          accessibleContentAudioUrl = preflightResponse.accessibleContentAudioUrl;
        } catch (e) { // eslint-disable-line
          console.error(e);
        }
      } else {
        contentType = guessContentType(src) || contentType;
      }

      // Fetching voxel data from origin or webrtc is handled by vox system.
      const isPackedVoxel = contentType && contentType.startsWith(VOX_CONTENT_TYPE);

      if (isRelativeUrl && !isPackedVoxel) {
        const { atomAccessManager } = window.APP;
        contentUrl = accessibleContentUrl = await atomAccessManager.contentUrlForRelativePath(
          decodeURIComponent(src),
          contentType
        );

        // Retry if 404 for up to 2 mintues, since origin asset uploads can have delay in deploying relative assets
        if (
          this.data.retryFetchFromSameOrigin &&
          !accessibleContentUrl.startsWith("data:") &&
          !accessibleContentUrl.startsWith("blob:")
        ) {
          // Check if accessibleContentUrl has the same origin as the current page
          let parsedAccessibleContentUrl = null;

          try {
            parsedAccessibleContentUrl = new URL(accessibleContentUrl);
          } catch (e) {
            try {
              parsedAccessibleContentUrl = new URL(accessibleContentUrl, document.location.href);
            } catch (e) { // eslint-disable-line
            }
          }

          if (parsedAccessibleContentUrl && parsedAccessibleContentUrl.origin === document.location.origin) {
            for (let i = 0; i < 90; i++) {
              try {
                const res = await fetch(accessibleContentUrl);
                if (res.status !== 404) break;
              } catch (e) {
                // Empty
              } finally {
                // Re-fetch accessible content URL because presence may actually have origin information which
                // would allow a direct fetch.
                contentUrl = accessibleContentUrl = await atomAccessManager.contentUrlForRelativePath(
                  decodeURIComponent(src),
                  contentType
                );
              }

              await new Promise(res => setTimeout(res, 2500));
            }
          }
        }
      }

      // TODO we should probably just never return "application/octet-stream" as expectedContentType, since its not really useful
      if (contentType === "application/octet-stream") {
        contentType = guessContentType(contentUrl) || contentType;
      }

      // Some servers treat m3u8 playlists as "audio/x-mpegurl", we always want to treat them as HLS videos
      if (contentType === "audio/x-mpegurl") {
        contentType = "application/vnd.apple.mpegurl";
      }

      if (!mediaSrcChanged) {
        // Clear loader, if any.
        disposeExistingMesh(this.el);
      }

      if (mediaSrcChanged) {
        // Don't animate when changing src
        this.data.animate = false;
      }

      // We don't want to emit media_resolved for index updates.
      if (forceLocalRefresh || mediaSrcChanged) {
        this.el.emit("media_resolved", { src, raw: accessibleContentUrl, contentType });
      } else {
        this.el.emit("media_refreshed", { src, raw: accessibleContentUrl, contentType });
      }

      this.el.addEventListener("media-load-error", () => this.cleanupLoader());

      if (!src.startsWith("webspace://") && !contentType) {
        // Unknown content type, fail
        throw new Error(`No content type for ` + src);
      }

      if (src.startsWith("webspace://entities/") && src.includes("/components/media-text")) {
        this.el.addEventListener("text-loaded", () => this.onMediaLoaded(SHAPE.BOX), { once: true });

        const fitContent = contentSubtype !== "page";
        const transparent = contentSubtype === "banner";
        const properties = { src: accessibleContentUrl, fitContent, transparent };
        const mediaOptions = this.data.mediaOptions;

        if (mediaOptions.foregroundColor) {
          properties.foregroundColor = mediaOptions.foregroundColor;
        }

        if (mediaOptions.backgroundColor) {
          properties.backgroundColor = mediaOptions.backgroundColor;
        }

        if (mediaOptions.font) {
          properties.font = mediaOptions.font;
        }

        this.setToSingletonMediaComponent("media-text", properties, mediaSrcChanged);
      } else if (src.startsWith("webspace://entities/") && src.includes("/components/media-emoji")) {
        this.el.addEventListener("model-loaded", () => this.onMediaLoaded(SHAPE.BOX), { once: true });

        this.setToSingletonMediaComponent("media-emoji", { src: accessibleContentUrl }, mediaSrcChanged);
      } else if (contentType === "video/vnd.webspaces-bridge") {
        this.el.setAttribute("floaty-object", {
          autoLockOnRelease: true, // Needed so object becomes kinematic on release for repositioning
          reduceAngularFloat: true,
          releaseGravity: -1
        });
        this.el.addEventListener(
          "canvas-loaded",
          e => {
            this.onMediaLoaded(e.detail.projection === "flat" ? SHAPE.BOX : null);
          },
          { once: true }
        );

        const canvasAttributes = Object.assign({}, this.data.mediaOptions, {
          src: accessibleContentUrl,
          contentType
        });

        this.setToSingletonMediaComponent("media-canvas", canvasAttributes, mediaSrcChanged);

        // These behaviors cause the video bridge to follow the avatar.
        this.el.setAttribute("pinned-to-self", {});
        this.el.setAttribute("look-at-self", {});

        SYSTEMS.externalCameraSystem.setExternalCameraTrackedEntity(this.el);
      } else if (
        contentType.startsWith("video/") ||
        contentType.startsWith("audio/") ||
        contentType.startsWith("application/dash") ||
        AFRAME.utils.material.isHLS(contentUrl, contentType)
      ) {
        let linkedVideoTexture, linkedAudioSource, linkedMediaElementAudioSource;
        if (this.data.linkedEl) {
          const linkedMediaVideo = this.data.linkedEl.components["media-video"];

          linkedVideoTexture = linkedMediaVideo.videoTexture;
          linkedAudioSource = linkedMediaVideo.audioSource;
          linkedMediaElementAudioSource = linkedMediaVideo.mediaElementAudioSource;
        }

        let startTime = null;

        // When adding a new video, parse the initial time
        if (this.data.addedLocally && this.data.mediaOptions.time === undefined) {
          const qsTime = parseInt(parsedUrl.searchParams.get("t"));
          const hashTime = parseInt(new URLSearchParams(parsedUrl.hash.substring(1)).get("t"));
          startTime = hashTime || qsTime || 0;
        }

        this.el.setAttribute("floaty-object", { reduceAngularFloat: true, releaseGravity: -1 });
        this.el.addEventListener(
          "video-loaded",
          e => {
            this.onMediaLoaded(e.detail.projection === "flat" ? SHAPE.BOX : null);
          },
          { once: true }
        );

        const videoAttributes = Object.assign({}, this.data.mediaOptions, {
          src: accessibleContentUrl,
          audioSrc: accessibleContentAudioUrl || null,
          contentType,
          linkedVideoTexture,
          linkedAudioSource,
          linkedMediaElementAudioSource
        });

        if (startTime !== null) {
          videoAttributes.time = startTime;
        }

        this.setToSingletonMediaComponent("media-video", videoAttributes, mediaSrcChanged);

        // Add the media-stream component to any entity that is streaming this client's video stream.
        if (contentType === "video/vnd.webspaces-webrtc" && src.indexOf(NAF.clientId)) {
          this.el.setAttribute("media-stream", {});
        }
      } else if (contentType.startsWith("image/")) {
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
        this.setToSingletonMediaComponent(
          "media-image",
          Object.assign({}, this.data.mediaOptions, {
            src: accessibleContentUrl,
            version,
            contentType
          }),
          mediaSrcChanged
        );
      } else if (contentType.startsWith("application/pdf")) {
        this.setToSingletonMediaComponent(
          "media-pdf",
          Object.assign({}, this.data.mediaOptions, {
            src: accessibleContentUrl,
            contentType
          }),
          mediaSrcChanged
        );

        if (this.data.mediaOptions.pagable !== false) {
          this.el.setAttribute("media-pager", {});
        }

        this.el.setAttribute("floaty-object", { reduceAngularFloat: true, releaseGravity: -1 });
        this.el.addEventListener(
          "pdf-loaded",
          () => {
            this.cleanupLoader();
            this.onMediaLoaded(SHAPE.BOX);
          },
          { once: true }
        );
      } else if (
        contentType.includes("application/octet-stream") ||
        contentType.includes("x-zip-compressed") ||
        contentType.startsWith("model/gltf")
      ) {
        this.el.addEventListener(
          "model-loaded",
          () => {
            this.onMediaLoaded(SHAPE.HULL, true);
            addAnimationComponents(this.el);
          },
          { once: true }
        );
        this.el.addEventListener("model-error", this.onError, { once: true });
        this.el.setAttribute("floaty-object", { gravitySpeedLimit: 1.85 });
        this.setToSingletonMediaComponent(
          "gltf-model-plus",
          Object.assign({}, this.data.mediaOptions, {
            src: accessibleContentUrl,
            contentType: contentType,
            inflate: true,
            modelToWorldScale: this.data.fitToBox ? 0.0001 : 1.0
          }),
          mediaSrcChanged
        );
      } else if (isPackedVoxel) {
        this.el.addEventListener("model-loaded", () => this.onMediaLoaded(null, false), { once: true });
        this.el.addEventListener("model-error", this.onError, { once: true });
        this.el.setAttribute("floaty-object", { gravitySpeedLimit: 1.85 });
        this.setToSingletonMediaComponent(
          "media-vox",
          Object.assign({}, this.data.mediaOptions, {
            src: accessibleContentUrl
          }),
          mediaSrcChanged
        );
      } else if (contentType.startsWith("text/html")) {
        this.el.addEventListener(
          "image-loaded",
          async () => {
            if (await isWebspaceUrl(src)) {
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
        this.setToSingletonMediaComponent(
          "media-image",
          Object.assign({}, this.data.mediaOptions, {
            src: contentUrl,
            version,
            contentType: guessContentType(contentUrl) || "image/png"
          }),
          mediaSrcChanged
        );
      } else if (contentType.startsWith("model/vox-binary")) {
        const voxSrc = await this.importVoxFromUrl(contentUrl);

        this.el.setAttribute("media-loader", { src: voxSrc, contentType: VOX_CONTENT_TYPE });
        this.el.addEventListener("model-loaded", () => this.onMediaLoaded(null, false), { once: true });
        this.el.addEventListener("model-error", this.onError, { once: true });
        this.el.setAttribute("floaty-object", { gravitySpeedLimit: 1.85 });
        this.setToSingletonMediaComponent(
          "media-vox",
          Object.assign({}, this.data.mediaOptions, {
            src: voxSrc
          }),
          mediaSrcChanged
        );
      } else {
        throw new Error(`Unsupported content type: ${contentType}`);
      }

      this.el.emit("media-view-added");
    } catch (e) {
      console.error("Error adding media", e);
      this.onError();
    }
  },

  setToSingletonMediaComponent(attr, properties, removeExisting = false) {
    for (const component of MEDIA_VIEW_COMPONENTS) {
      if (component === attr && !removeExisting) continue;
      this.el.removeAttribute(component);
    }

    if (attr !== "media-pdf") {
      this.el.removeAttribute("media-pager");
    }

    this.el.setAttribute(attr, properties);
  },

  clearMediaComponents() {
    for (const component of MEDIA_VIEW_COMPONENTS) {
      this.el.removeAttribute(component);
    }

    this.el.removeAttribute("media-pager");
  },

  consumeInitialContents: function() {
    if (!this.data.initialContents) return;

    const contents = this.data.initialContents;
    this.el.setAttribute("media-loader", { initialContents: null });

    // To avoid race conditions, blank it out immediately
    this.data.initialContents = null;

    return contents;
  },

  async importVoxFromUrl(/*importUrl*/) {
    // TODO VOX
    //const spaceId = await getSpaceIdFromHistory();
    //const { voxSystem } = SYSTEMS;
    //const {
    //  vox: [{ vox_id: voxId, url }]
    //} = await createVox(spaceId);
    //const sync = await voxSystem.getSync(voxId);
    //// A VOX being loaded should be imported and then the src changed to the appropriate URL.
    //await new Promise(res => {
    //  new VOXLoader().load(importUrl, async voxFileChunks => {
    //    for (let frame = 0; frame < voxFileChunks.length; frame++) {
    //      if (frame > 0) continue; // TODO multiple frames. Breaks physics, etc.
    //      const { palette, data } = voxFileChunks[frame];
    //      let vsx = 0;
    //      let vsy = 0;
    //      let vsz = 0;
    //      for (let i = 0; i < data.length; i += 4) {
    //        vsx = Math.max(data[i + 0] + 1, vsx);
    //        vsz = Math.max(data[i + 1] + 1, vsz);
    //        vsy = Math.max(data[i + 2] + 1, vsy);
    //      }
    //      const size = [Math.min(vsx, MAX_VOX_SIZE), Math.min(vsy, MAX_VOX_SIZE), Math.min(vsz, MAX_VOX_SIZE)];
    //      const iPalToVoxColor = i => {
    //        const rgba = palette[i];
    //        const r = 0x000000ff & rgba;
    //        const g = (0x0000ff00 & rgba) >>> 8;
    //        const b = (0x00ff0000 & rgba) >>> 16;
    //        return voxColorForRGBT(r, g, b);
    //      };
    //      const [minX, maxX, minY, maxY, minZ, maxZ] = xyzRangeForSize(size);
    //      const shiftX = shiftForSize(size[0]);
    //      const shiftY = shiftForSize(size[1]);
    //      const shiftZ = shiftForSize(size[2]);
    //      const voxChunk = new VoxChunk(size);
    //      for (let i = 0; i < data.length; i += 4) {
    //        const x = data[i + 0];
    //        const z = data[i + 1];
    //        const y = data[i + 2];
    //        const c = data[i + 3];
    //        const voxX = x - shiftX;
    //        const voxY = y - shiftY;
    //        let voxZ = z - shiftZ;
    //        // ?? not sure why this is needed but objects come in mirrored
    //        voxZ = voxZ == 0 ? 0 : voxZ < 0 ? -voxZ : -voxZ + 1;
    //        if (voxX >= minX && voxX <= maxX && voxY >= minY && voxY <= maxY && voxZ >= minZ && voxZ <= maxZ) {
    //          const voxColor = iPalToVoxColor(c);
    //          voxChunk.setColorAt(voxX, voxY, voxZ, voxColor);
    //        }
    //      }
    //      await sync.applyChunk(voxChunk, frame, [0, 0, 0]);
    //      res();
    //    }
    //  });
    //});
    //return url;
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
        window.APP.atomAccessManager.addEventListener("permissions_updated", this.update);
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
