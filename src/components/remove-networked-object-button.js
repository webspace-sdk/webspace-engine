import { ensureOwnership, getNetworkedEntity } from "../../jel/utils/ownership-utils";

AFRAME.registerComponent("remove-networked-object-button", {
  init() {
    this.onClick = () => {
      if (!ensureOwnership(this.targetEl)) return;

      // DEAD, see object-info-dialog for remove pattern
      /*this.targetEl.setAttribute("animation__remove", {
        property: "scale",
        dur: 200,
        to: { x: 0.01, y: 0.01, z: 0.01 },
        easing: "easeInQuad"
      });

      this.el.parentNode.removeAttribute("visibility-while-frozen");
      this.el.parentNode.setAttribute("visible", false);

      this.targetEl.addEventListener("animationcomplete", () => {
        takeOwnership(this.targetEl);
        this.targetEl.parentNode.removeChild(this.targetEl);
      });*/
    };

    getNetworkedEntity(this.el).then(networkedEl => {
      this.targetEl = networkedEl;
    });
  },

  play() {
    this.el.object3D.addEventListener("interact", this.onClick);
  },

  pause() {
    this.el.object3D.removeEventListener("interact", this.onClick);
  }
});
