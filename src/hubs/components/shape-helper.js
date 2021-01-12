import { SHAPE, FIT } from "three-ammo/constants";
import { almostEqualVec3 } from "../utils/three-utils";

AFRAME.registerComponent("shape-helper", {
  schema: {
    type: {
      default: SHAPE.HULL,
      oneOf: [
        SHAPE.BOX,
        SHAPE.CYLINDER,
        SHAPE.SPHERE,
        SHAPE.CAPSULE,
        SHAPE.CONE,
        SHAPE.HULL,
        SHAPE.HACD,
        SHAPE.VHACD,
        SHAPE.MESH,
        SHAPE.HEIGHTFIELD
      ]
    },
    fit: { default: FIT.ALL, oneOf: [FIT.ALL, FIT.MANUAL] },
    halfExtents: { type: "vec3", default: { x: 1, y: 1, z: 1 } },
    minHalfExtent: { default: 0 },
    maxHalfExtent: { default: Number.POSITIVE_INFINITY },
    sphereRadius: { default: NaN },
    cylinderAxis: { default: "y", oneOf: ["x", "y", "z"] },
    margin: { default: 0.01 },
    offset: { type: "vec3", default: { x: 0, y: 0, z: 0 } },
    orientation: { type: "vec4", default: { x: 0, y: 0, z: 0, w: 1 } },
    heightfieldData: { default: [] },
    heightfieldDistance: { default: 1 },
    includeInvisible: { default: false }
  },

  multiple: true,

  init: function() {
    this.system = this.el.sceneEl.systems["hubs-systems"].physicsSystem;
    this.alive = true;
    this.uuid = -1;
    this.system.registerShapeHelper(this);
  },

  init2: function() {
    this.lastScale = new THREE.Vector3(1, 1, 1);
    this.mesh = null;

    let bodyEl = this.el;
    this.bodyHelper = bodyEl.components["body-helper"] || null;
    while (!this.bodyHelper && bodyEl.parentNode != this.el.sceneEl) {
      bodyEl = bodyEl.parentNode;
      if (bodyEl.components["body-helper"]) {
        this.bodyHelper = bodyEl.components["body-helper"];
      }
    }
    if (!this.bodyHelper || this.bodyHelper.uuid === null || this.bodyHelper.uuid === undefined) {
      console.warn("body not found");
      return;
    }
    if (this.data.fit === FIT.ALL) {
      if (!this.el.object3DMap.mesh) {
        console.error("Cannot use FIT.ALL without object3DMap.mesh");
        return;
      }
      this.mesh = this.el.object3DMap.mesh;
    }
  },

  tick: function() {
    if (!this.bodyHelper) return;
    if (this.uuid === -1) {
      if (this.mesh) {
        this.mesh.updateMatrices();
      }

      this.uuid = this.system.addShapes(this.bodyHelper.uuid, this.mesh, this.data);

      // HUGE HACK - sometimes when shapes are created on load their setLocalScale collision is for some
      // reason not being applied unless we wait some time. The proper scale is being passed in during
      // addShapes but yet somehow the shape can end up being massively over scaled. (Perhaps some other
      // internal state about the collision shape is dependent.)
      //
      // This causes a delayed call to updateShapesScale to resolve this. (The tick method is still necessary
      // to deal with scaling of the inner mesh.)
      //
      // To confirm this, create a text label of short length: sometimes when loading the scene it will have
      // a huge shape.
      this.shapeReady = false;
      setTimeout(() => (this.shapeReady = true), 1000);
    }

    if (!this.shapeReady) return;
    if (!this.mesh) return;
    if (almostEqualVec3(this.mesh.scale, this.lastScale)) return;
    this.system.updateShapesScale(this.uuid, this.mesh, this.data);
    this.lastScale.copy(this.mesh.scale);
  },

  remove: function() {
    if (this.uuid !== -1) {
      this.system.removeShapes(this.bodyHelper.uuid, this.uuid);
    }
    this.alive = false;
  }
});
