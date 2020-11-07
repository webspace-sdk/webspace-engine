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
      }
    }

    if (this.userinput.get(paths.actions.muteMic)) {
      this.el.emit("action_mute");
    }

    if (canSpawnMedia) {
      if (this.userinput.get(paths.actions.nextMediaLayer)) {
        this.el.systems["hubs-systems"].mediaPresenceSystem.selectNextMediaLayer();
      }

      if (this.userinput.get(paths.actions.previousMediaLayer)) {
        this.el.systems["hubs-systems"].mediaPresenceSystem.selectPreviousMediaLayer();
      }
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
