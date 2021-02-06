import nextTick from "../utils/next-tick";
const MIN_FRAMES_BETWEEN_TEXTURE_UPLOADS = 10;
const MAX_TEXTURE_UPLOAD_PIXELS_PER_FRAME = 1024 * 1024 + 1;

function loadAsync(loader, url, onProgress) {
  return new Promise((resolve, reject) => loader.load(url, resolve, onProgress, reject));
}

let nextUploadFrame = 0;
let totalPixelsUploaded = 0;

export default class HubsTextureLoader {
  constructor(manager = THREE.DefaultLoadingManager, retainImages = true) {
    this.manager = manager;
    this.crossOrigin = "anonymous";
    this.retainImages = retainImages;
  }

  load(url, onLoad, onProgress, onError) {
    const texture = new THREE.Texture();

    this.loadTextureAsync(texture, url, onProgress)
      .then(() => onLoad(texture))
      .catch(onError);

    return texture;
  }

  // Returns [texture, { width, height }]
  async loadTextureAsync(texture, src, preload, onProgress) {
    let imageLoader;

    if (window.createImageBitmap !== undefined) {
      imageLoader = new THREE.ImageBitmapLoader(this.manager);
      texture.flipY = false;
    } else {
      imageLoader = new THREE.ImageLoader(this.manager);
    }

    imageLoader.setCrossOrigin(this.crossOrigin);
    imageLoader.setPath(this.path);

    const resolvedUrl = this.manager.resolveURL(src);

    const image = await loadAsync(imageLoader, resolvedUrl, onProgress);
    const pixels = image.width * image.height;
    const frameScheduler = AFRAME.scenes[0].systems["frame-scheduler"];

    if (preload) {
      // Rate limit texture loading
      if (totalPixelsUploaded + pixels >= MAX_TEXTURE_UPLOAD_PIXELS_PER_FRAME) {
        while (nextUploadFrame > frameScheduler.frameIndex) await nextTick();
        nextUploadFrame = frameScheduler.frameIndex + MIN_FRAMES_BETWEEN_TEXTURE_UPLOADS;
        totalPixelsUploaded = 0;
      } else {
        totalPixelsUploaded += pixels;
      }
    }

    const loader = this;

    texture.image = image;

    // Image was just added to cache before this function gets called, disable caching by immediatly removing it
    THREE.Cache.remove(resolvedUrl);

    texture.needsUpdate = true;
    const info = { width: image.width, height: image.height, hasAlpha: image.hasAlpha };

    return await new Promise(res => {
      texture.onUpdate = function() {
        if (texture.image && !loader.retainImages) {
          // Delete texture data once it has been uploaded to the GPU
          image.close && image.close();
          delete texture.image;
        }

        if (preload) {
          res(info);
        }
      };

      if (preload) {
        AFRAME.scenes[0].renderer.initTexture(texture);
      } else {
        res(info);
      }
    });
  }

  setCrossOrigin(value) {
    this.crossOrigin = value;
    return this;
  }

  setPath(value) {
    this.path = value;
    return this;
  }
}
