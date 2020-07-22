import { getNetworkedEntity, getNetworkOwner } from "../../jel/utils/ownership-utils";

AFRAME.registerComponent("mute-button", {
  init() {
    this.onClick = () => {
      this.mute(this.owner);
    };
    getNetworkedEntity(this.el).then(networkedEl => {
      this.owner = getNetworkOwner(networkedEl);
    });
  },

  play() {
    this.el.object3D.addEventListener("interact", this.onClick);
  },

  pause() {
    this.el.object3D.removeEventListener("interact", this.onClick);
  },

  async mute(clientId) {
    this.el.sceneEl.emit("action_mute_client", { clientId });
  }
});
