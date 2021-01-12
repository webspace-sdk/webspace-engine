import { paths } from "./userinput/paths";

// Every frame, looks for input paths that trigger UI-relevant events and handles them.
AFRAME.registerSystem("ui-hotkeys", {
  init() {
    this.mediaSearchStore = window.APP.mediaSearchStore;
    this.store = window.APP.store;
  },

  tick: function() {
    const canSpawnMedia = window.APP.hubChannel.can("spawn_and_move_media");

    if (!this.userinput) {
      this.userinput = this.el.systems.userinput;
    }

    if (this.userinput.get(paths.actions.toggleKeyTips)) {
      this.store.update({ settings: { hideKeyTips: !this.store.state.settings.hideKeyTips } });
    }

    if (this.userinput.get(paths.actions.create)) {
      if (this.el.sceneEl.is("entered")) {
        this.el.emit("action_create");
        this.store.handleActivityFlag("createMenu");
      }
    }

    if (this.userinput.get(paths.actions.muteMic)) {
      window.APP.store.handleActivityFlag("toggleMuteKey");
      this.el.emit("action_mute");
    }

    if (this.userinput.get(paths.actions.emojiEquip1)) {
      window.APP.store.update({ equips: { launcher: window.APP.store.state.equips.launcherSlot1 } });
    } else if (this.userinput.get(paths.actions.emojiEquip2)) {
      window.APP.store.update({ equips: { launcher: window.APP.store.state.equips.launcherSlot2 } });
    } else if (this.userinput.get(paths.actions.emojiEquip3)) {
      window.APP.store.update({ equips: { launcher: window.APP.store.state.equips.launcherSlot3 } });
    } else if (this.userinput.get(paths.actions.emojiEquip4)) {
      window.APP.store.update({ equips: { launcher: window.APP.store.state.equips.launcherSlot4 } });
    } else if (this.userinput.get(paths.actions.emojiEquip5)) {
      window.APP.store.update({ equips: { launcher: window.APP.store.state.equips.launcherSlot5 } });
    } else if (this.userinput.get(paths.actions.emojiEquip6)) {
      window.APP.store.update({ equips: { launcher: window.APP.store.state.equips.launcherSlot6 } });
    } else if (this.userinput.get(paths.actions.emojiEquip7)) {
      window.APP.store.update({ equips: { launcher: window.APP.store.state.equips.launcherSlot7 } });
    } else if (this.userinput.get(paths.actions.emojiEquip8)) {
      window.APP.store.update({ equips: { launcher: window.APP.store.state.equips.launcherSlot8 } });
    } else if (this.userinput.get(paths.actions.emojiEquip9)) {
      window.APP.store.update({ equips: { launcher: window.APP.store.state.equips.launcherSlot9 } });
    } else if (this.userinput.get(paths.actions.emojiEquip0)) {
      window.APP.store.update({ equips: { launcher: window.APP.store.state.equips.launcherSlot10 } });
    }
  },

  focusChat: function(prefix) {
    const target = document.querySelector(".chat-focus-target");
    if (!target) return;

    target.focus();

    if (prefix) {
      target.value = prefix;
    }
  }
});
