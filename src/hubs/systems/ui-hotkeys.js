import { paths } from "./userinput/paths";
import mixpanel from "mixpanel-browser";

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

    if (canSpawnMedia) {
      // Disable layers for now given confusion
      //if (this.userinput.get(paths.actions.nextMediaLayer)) {
      //  this.el.systems["hubs-systems"].mediaPresenceSystem.selectNextMediaLayer();
      //}
      //if (this.userinput.get(paths.actions.previousMediaLayer)) {
      //  this.el.systems["hubs-systems"].mediaPresenceSystem.selectPreviousMediaLayer();
      //}
      //if (this.userinput.get(paths.actions.mediaLayer1)) {
      //  this.el.systems["hubs-systems"].mediaPresenceSystem.setActiveLayer(0);
      //}
      //if (this.userinput.get(paths.actions.mediaLayer2)) {
      //  this.el.systems["hubs-systems"].mediaPresenceSystem.setActiveLayer(1);
      //}
      //if (this.userinput.get(paths.actions.mediaLayer3)) {
      //  this.el.systems["hubs-systems"].mediaPresenceSystem.setActiveLayer(2);
      //}
      //if (this.userinput.get(paths.actions.mediaLayer4)) {
      //  this.el.systems["hubs-systems"].mediaPresenceSystem.setActiveLayer(3);
      //}
      //if (this.userinput.get(paths.actions.mediaLayer5)) {
      //  this.el.systems["hubs-systems"].mediaPresenceSystem.setActiveLayer(4);
      //}
      //if (this.userinput.get(paths.actions.mediaLayer6)) {
      //  this.el.systems["hubs-systems"].mediaPresenceSystem.setActiveLayer(5);
      //}
      //if (this.userinput.get(paths.actions.mediaLayer7)) {
      //  this.el.systems["hubs-systems"].mediaPresenceSystem.setActiveLayer(6);
      //}
      //if (this.userinput.get(paths.actions.mediaLayer8)) {
      //  this.el.systems["hubs-systems"].mediaPresenceSystem.setActiveLayer(7);
      //}
      //if (this.userinput.get(paths.actions.mediaLayer9)) {
      //  this.el.systems["hubs-systems"].mediaPresenceSystem.setActiveLayer(8);
      //}
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
