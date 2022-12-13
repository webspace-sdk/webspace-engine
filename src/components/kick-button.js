import { getNetworkedEntity, getNetworkOwner } from "../../jel/utils/ownership-utils";

AFRAME.registerComponent("kick-button", {
  init() {
    this.onClick = () => {
      this.kick(this.owner);
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

  async kick(clientId) {
    this.el.sceneEl.emit("action_kick_client", { clientId });
  }
});
