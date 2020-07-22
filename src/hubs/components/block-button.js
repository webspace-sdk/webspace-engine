import { getNetworkedEntity, getNetworkOwner } from "../../jel/utils/ownership-utils";

/**
 * Registers a click handler and invokes the block method on the NAF adapter for the owner associated with its entity.
 * @namespace network
 * @component block-button
 */
AFRAME.registerComponent("block-button", {
  init() {
    this.onClick = () => {
      this.block(this.owner);
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

  block(clientId) {
    window.APP.hubChannel.hide(clientId);
  }
});
