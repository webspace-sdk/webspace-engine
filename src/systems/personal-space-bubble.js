import { forEachMaterial } from "../utils/material-utils";
import qsTruthy from "../utils/qs_truthy";

const isDebug = qsTruthy("debug");

/**
 * Updates invaders every tick, doing one per frame on mobile VR.
 * testing multiline things
 * @namespace avatar/personal-space-bubble
 * @system personal-space-bubble
 */
AFRAME.registerSystem("personal-space-bubble", {
  schema: {
    debug: { default: false },
    enabled: { default: true }
  },

  init() {
    this.invaders = [];
    this.bubbles = [];
    this._updateInvaders = this._updateInvaders.bind(this);
  },

  registerBubble(bubble) {
    this.bubbles.push(bubble);
  },

  unregisterBubble(bubble) {
    const index = this.bubbles.indexOf(bubble);

    if (index !== -1) {
      this.bubbles.splice(index, 1);
    }
  },

  registerInvader(invader) {
    NAF.utils.getNetworkedEntity(invader.el).then(networkedEl => {
      const owner = NAF.utils.getNetworkOwner(networkedEl);

      if (owner !== NAF.clientId) {
        this.invaders.push(invader);
      }
    });
  },

  unregisterInvader(invader) {
    const index = this.invaders.indexOf(invader);

    if (index !== -1) {
      this.invaders.splice(index, 1);
    }
  },

  update() {
    for (let i = 0; i < this.bubbles.length; i++) {
      this.bubbles[i].updateDebug();
    }

    for (let i = 0; i < this.invaders.length; i++) {
      this.invaders[i].updateDebug();
      if (!this.data.enabled) {
        this.invaders[i].setInvading(false);
      }
    }

    if (this.data.enabled) {
      this.el.addState("spacebubble");
    } else {
      this.el.removeState("spacebubble");
    }
  },

  tick() {
    this._updateInvaders();
  },

  _updateInvaders: (function() {
    const tempInvasionFlags = [];

    const setInvaderFlag = (i, invaders, bx, by, bz, radius) => {
      // Hide the invader if inside the bubble
      const invader = invaders[i];
      const { elements } = invader.el.object3D.matrixWorld;
      const ix = elements[12];
      const iy = elements[13];
      const iz = elements[14];

      const dx = bx - ix;
      const dy = by - iy;
      const dz = bz - iz;
      const distanceSqInvaderToBubble = dx * dx + dy * dy + dz * dz;
      const radiusSum = radius + invader.data.radius;

      if (distanceSqInvaderToBubble < radiusSum * radiusSum) {
        tempInvasionFlags[i] = true;
      }
    };

    const flushInvadingFlagsForIndex = (i, invaders) => {
      const invader = invaders[i];
      const flag = tempInvasionFlags[i];

      if (invader.invading !== flag) {
        invader.setInvading(flag);
      }
    };

    return function() {
      if (!this.data.enabled) return;
      const { invaders, bubbles } = this;

      if (invaders.length === 0) return;

      tempInvasionFlags.length = 0;

      // precondition for this stuff -- the bubbles and invaders need updated world matrices.
      // right now this is satisfied because we update the world matrices in the character controller
      for (let i = 0; i < invaders.length; i++) {
        invaders[i].el.object3D.updateMatrices(); // We read matrixWorld below, update matrices here
        tempInvasionFlags[i] = false;
      }

      // Loop through all of the space bubbles (usually one)
      for (let i = 0; i < bubbles.length; i++) {
        const bubble = bubbles[i];
        const bubbleObj = bubble.el.object3D;

        bubbleObj.updateMatrices();

        const { elements } = bubbleObj.matrixWorld;
        const bx = elements[12];
        const by = elements[13];
        const bz = elements[14];
        const radius = bubble.data.radius;

        for (let j = 0; j < invaders.length; j++) {
          setInvaderFlag(j, invaders, bx, by, bz, radius);
        }
      }

      for (let i = 0; i < invaders.length; i++) {
        flushInvadingFlagsForIndex(i, invaders);
      }
    };
  })()
});

function createSphereGizmo(radius) {
  const geometry = new THREE.SphereBufferGeometry(radius, 10, 10);
  const wireframe = new THREE.WireframeGeometry(geometry);
  const line = new THREE.LineSegments(wireframe);
  line.material.opacity = 0.5;
  line.material.transparent = true;
  return line;
}

function findInvaderMesh(entity) {
  while (entity && !(entity.components && entity.components["gltf-model-plus"])) {
    entity = entity.parentNode;
  }
  // TODO this assumes a single skinned mesh, should be some way for avatar to override this
  return entity && entity.object3D.getObjectByProperty("type", "SkinnedMesh");
}

const DEBUG_OBJ = "psb-debug";

/**
 * Represents an entity that can invade a personal space bubble
 * @namespace avatar/personal-space-bubble
 * @component personal-space-invader
 */
AFRAME.registerComponent("personal-space-invader", {
  schema: {
    radius: { type: "number", default: 0.1 },
    useMaterial: { default: false },
    debug: { default: false },
    invadingOpacity: { default: 0.3 }
  },

  init() {
    const system = this.el.sceneEl.systems["personal-space-bubble"];
    system.registerInvader(this);
    if (this.data.useMaterial) {
      const mesh = findInvaderMesh(this.el);
      if (mesh) {
        this.targetMesh = mesh;
      }
    }
    this.invading = false;
    this.alwaysHidden = false;
  },

  update() {
    this.radiusSquared = this.data.radius * this.data.radius;
    this.updateDebug();
  },

  // Allow external callers to tell this invader to always hide this element, regardless of invasion state
  setAlwaysHidden(alwaysHidden) {
    this.alwaysHidden = alwaysHidden;
    this.applyInvasionToMesh(this.invading);
  },

  updateDebug() {
    const system = this.el.sceneEl.systems["personal-space-bubble"];
    if (system.data.debug || this.data.debug) {
      !this.el.object3DMap[DEBUG_OBJ] && this.el.setObject3D(DEBUG_OBJ, createSphereGizmo(this.data.radius));
    } else if (this.el.object3DMap[DEBUG_OBJ]) {
      this.el.removeObject3D(DEBUG_OBJ);
    }
  },

  remove() {
    this.el.sceneEl.systems["personal-space-bubble"].unregisterInvader(this);
  },

  setInvading(invading) {
    if (this.invading === invading) return;

    this.applyInvasionToMesh(invading);
    this.invading = invading;
  },

  disable() {
    if (this.invading) {
      this.applyInvasionToMesh(false);
    }

    this.disabled = true;
  },

  enable() {
    this.disabled = false;
    this.applyInvasionToMesh(this.invading);
  },

  applyInvasionToMesh(invading) {
    if (this.disabled) return;

    if (this.targetMesh && this.targetMesh.material && !this.alwaysHidden) {
      forEachMaterial(this.targetMesh, material => {
        material.opacity = invading ? this.data.invadingOpacity : 1;
        material.transparent = invading;
      });
    } else {
      this.el.object3D.visible = !invading && !this.alwaysHidden;
    }
  }
});

/**
 * Represents a personal space bubble on an entity.
 * @namespace avatar/personal-space-bubble
 * @component personal-space-bubble
 */
AFRAME.registerComponent("personal-space-bubble", {
  schema: {
    radius: { type: "number", default: 0.8 },
    debug: { default: false }
  },
  init() {
    this.system.registerBubble(this);
  },

  update() {
    this.radiusSquared = this.data.radius * this.data.radius;
    this.updateDebug();
  },

  updateDebug() {
    if (!isDebug) return;

    if (this.system.data.debug || this.data.debug) {
      !this.el.object3DMap[DEBUG_OBJ] && this.el.setObject3D(DEBUG_OBJ, createSphereGizmo(this.data.radius));
    } else if (this.el.object3DMap[DEBUG_OBJ]) {
      this.el.removeObject3D(DEBUG_OBJ);
    }
  },

  remove() {
    this.system.unregisterBubble(this);
  }
});
