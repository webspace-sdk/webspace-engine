import { paths } from "../../hubs/systems/userinput/paths";

const FIRE_DURATION_MS = 350;
const MAX_FIRE_DURATION = 5000;

export class LauncherSystem {
  constructor(sceneEl, projectileSystem, userinput) {
    this.sceneEl = sceneEl;
    this.projectileSystem = projectileSystem;
    this.userinput = userinput;
    this.startedLaunchTime = null;
    this.lastLaunchTime = null;
    this.doneFiring = false;
    this.firedMegamoji = false;
  }

  tick() {
    const { userinput, projectileSystem } = this;
    const spacePath = paths.device.keyboard.key(" ");

    const hasLauncherGesture = userinput.get(spacePath);

    if (hasLauncherGesture) {
      const now = performance.now();

      if (!this.startedLaunchTime) {
        this.startedLaunchTime = now;
      }

      if (now - this.startedLaunchTime > MAX_FIRE_DURATION) {
        if (this.doneFiring) {
          this.doneFiring = true;
          this.startedLaunchTime = null;
          this.lastLaunchTime = null;
        }

        if (now - this.startedLaunchTime > MAX_FIRE_DURATION + 500 && !this.firedMegamoji) {
          // Fire megamoji at the end after air clears
          const payload = projectileSystem.fireEmojiLauncherProjectile(window.APP.store.state.equips.launcher, true);
          window.APP.hubChannel.sendMessage(payload, "emoji_launch");
          this.firedMegamoji = true;
        }
      } else {
        if (!this.doneFiring && (!this.lastLaunchTime || now - this.lastLaunchTime > FIRE_DURATION_MS)) {
          const payload = projectileSystem.fireEmojiLauncherProjectile(window.APP.store.state.equips.launcher);
          window.APP.hubChannel.sendMessage(payload, "emoji_launch");
          this.lastLaunchTime = now;
        }
      }
    } else if (this.startedLaunchTime) {
      this.doneFiring = false;
      this.firedMegamoji = false;
      this.startedLaunchTime = null;
      this.lastLaunchTime = null;
    }
  }
}
