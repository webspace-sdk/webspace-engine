import { paths } from "./userinput/paths";
import { SOUND_TOGGLE_MIC } from "./sound-effects-system";

// Every frame, looks for input paths that trigger UI-relevant events and handles them.
AFRAME.registerSystem("ui-hotkeys", {
  init() {
    this.mediaSearchStore = window.APP.mediaSearchStore;
    this.store = window.APP.store;
  },

  tick: function() {
    const canSpawnMedia = window.APP.hubChannel.can("spawn_and_move_media");
    const isInspecting = SYSTEMS.cameraSystem.isInspecting();

    if (!this.userinput) {
      this.userinput = this.el.systems.userinput;
    }

    if (this.userinput.get(paths.actions.toggleKeyTips)) {
      this.store.update({ settings: { hideKeyTips: !this.store.state.settings.hideKeyTips } });
    }

    if (this.userinput.get(paths.actions.create) && canSpawnMedia && !isInspecting) {
      if (this.el.sceneEl.is("entered")) {
        this.el.emit("action_create");
        this.store.handleActivityFlag("createMenu");
      }
    }

    if (this.userinput.get(paths.actions.toggleTriggerMode) && canSpawnMedia && !isInspecting) {
      SYSTEMS.builderSystem.toggle();
      SYSTEMS.launcherSystem.toggle();
    }

    if (this.userinput.get(paths.actions.muteMic)) {
      window.APP.store.handleActivityFlag("toggleMuteKey");
      SYSTEMS.soundEffectsSystem.playSoundOneShot(SOUND_TOGGLE_MIC);
      this.el.emit("action_mute");
    }

    let slotToEquip = 0;

    if (this.userinput.get(paths.actions.undo)) {
      SYSTEMS.undoSystem.doUndo();
    } else if (this.userinput.get(paths.actions.redo)) {
      SYSTEMS.undoSystem.doRedo();
    }

    if (this.userinput.get(paths.actions.equip1)) {
      slotToEquip = 1;
    } else if (this.userinput.get(paths.actions.equip2)) {
      slotToEquip = 2;
    } else if (this.userinput.get(paths.actions.equip3)) {
      slotToEquip = 3;
    } else if (this.userinput.get(paths.actions.equip4)) {
      slotToEquip = 4;
    } else if (this.userinput.get(paths.actions.equip5)) {
      slotToEquip = 5;
    } else if (this.userinput.get(paths.actions.equip6)) {
      slotToEquip = 6;
    } else if (this.userinput.get(paths.actions.equip7)) {
      slotToEquip = 7;
    } else if (this.userinput.get(paths.actions.equip8)) {
      slotToEquip = 8;
    } else if (this.userinput.get(paths.actions.equip9)) {
      slotToEquip = 9;
    } else if (this.userinput.get(paths.actions.equip0)) {
      slotToEquip = 10;
    }
    const { store } = window.APP;

    if (slotToEquip > 0) {
      if (SYSTEMS.launcherSystem.enabled) {
        store.update({ equips: { launcher: store.state.equips[`launcherSlot${slotToEquip}`] } });
      } else {
        slotToEquip += store.state.equips.colorPage * 10;
        store.update({ equips: { color: store.state.equips[`colorSlot${slotToEquip}`] } });
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
