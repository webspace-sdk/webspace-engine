import { isInQuillEditor } from "../utils/quill-utils";
import {
  RESETABLE_MEDIA_VIEW_COMPONENTS,
  BAKABLE_MEDIA_VIEW_COMPONENTS,
  isLockedMedia,
  getMediaViewComponent
} from "../utils/media-utils";
import { cursorIsVisible, CURSOR_LOCK_STATES, getCursorLockState } from "../utils/dom-utils";
import { TRANSFORM_MODE } from "./transform-selected-object";
import { paths } from "./userinput/paths";
import { BRUSH_TYPES, BRUSH_MODES } from "../constants";

const shiftPath = paths.device.keyboard.key("shift");

export class KeyboardTipSystem {
  constructor(sceneEl, cameraSystem) {
    this.scene = sceneEl;
    this.tipsToShow = null;
    this.store = window.APP.store;
    this.interaction = sceneEl.systems.interaction;
    this.transformSystem = sceneEl.systems["transform-selected-object"];
    this.scaleSystem = sceneEl.systems["scale-object"];
    this.cameraSystem = cameraSystem;
  }

  tick() {
    let showTips = null;

    if (!this.tipEl) {
      this.tipEl = DOM_ROOT.getElementById("key-tips");
      if (!this.tipEl) return;
    }

    const hidden = this.store.state.settings.hideKeyTips;
    const shiftMouseLook = this.scene.systems.userinput.get(shiftPath);

    if (!hidden) {
      if (isInQuillEditor()) {
        showTips = "text_editor";
      } else if (this.scene.is("pointer-exited")) {
        showTips = this.scene.is("unmuted") ? "pointer_exited_unmuted" : "pointer_exited_muted";
      } else {
        const expanded = getCursorLockState() === CURSOR_LOCK_STATES.LOCKED_PERSISTENT;
        showTips = expanded
          ? this.scene.is("unmuted")
            ? "idle_full_unmuted"
            : "idle_full_muted"
          : shiftMouseLook
            ? "idle_key_mouselook_panels"
            : "idle_panels";

        if (SYSTEMS.characterController.fly) {
          showTips += "_fly";
        }

        if (this.transformSystem.transforming) {
          if (this.scaleSystem.isScaling) {
            showTips = "scale";
          } else if (this.transformSystem.mode === TRANSFORM_MODE.AXIS) {
            showTips = "rotate";
          } else if (this.transformSystem.mode === TRANSFORM_MODE.SLIDE) {
            showTips = "slide";
          } else if (this.transformSystem.mode === TRANSFORM_MODE.MOVEX) {
            showTips = "movex";
          } else if (this.transformSystem.mode === TRANSFORM_MODE.MOVEY) {
            showTips = "movey";
          } else if (this.transformSystem.mode === TRANSFORM_MODE.MOVEZ) {
            showTips = "movez";
          } else if (this.transformSystem.mode === TRANSFORM_MODE.LIFT) {
            showTips = "lift";
          } else if (this.transformSystem.mode === TRANSFORM_MODE.STACK) {
            showTips = "stack";
          }
        } else {
          const held =
            this.interaction.state.leftHand.held ||
            this.interaction.state.rightHand.held ||
            this.interaction.state.rightRemote.held ||
            this.interaction.state.leftRemote.held;

          if (held) {
            showTips = "holding_interactable";
          } else {
            const hovered =
              this.interaction.state.leftHand.hovered ||
              this.interaction.state.rightHand.hovered ||
              this.interaction.state.rightRemote.hovered ||
              this.interaction.state.leftRemote.hovered;

            if (hovered && cursorIsVisible()) {
              const { components } = hovered;
              const isLocked = isLockedMedia(hovered);

              if (!isLocked) {
                if (components["media-text"]) {
                  showTips = "text";
                } else if (components["media-video"]) {
                  showTips = components["media-video"].data.videoPaused ? "video_paused" : "video_playing";
                } else if (components["media-vox"]) {
                  if (SYSTEMS.builderSystem.enabled) {
                    const expanded = getCursorLockState() === CURSOR_LOCK_STATES.LOCKED_PERSISTENT;
                    const editing = SYSTEMS.cameraSystem.isEditing();
                    const suffix = editing ? "_edit" : expanded ? "_full" : "";
                    if (SYSTEMS.builderSystem.brushType === BRUSH_TYPES.PICK) {
                      showTips = `vox_pick${suffix}`;
                    } else if (SYSTEMS.builderSystem.brushType === BRUSH_TYPES.FILL) {
                      showTips = `vox_fill${suffix}`;
                    } else {
                      const mode = SYSTEMS.builderSystem.brushMode;
                      switch (mode) {
                        case BRUSH_MODES.ADD:
                          showTips = `vox_attach${suffix}`;
                          break;
                        case BRUSH_MODES.REMOVE:
                          showTips = `vox_remove${suffix}`;
                          break;
                        case BRUSH_MODES.PAINT:
                          showTips = `vox_paint${suffix}`;
                          break;
                      }
                    }
                  } else {
                    showTips = "vox";
                  }
                } else if (components["media-pdf"]) {
                  showTips = "pdf";
                } else {
                  const component = getMediaViewComponent(hovered);

                  const isBakable = BAKABLE_MEDIA_VIEW_COMPONENTS.includes(component?.name);
                  const isResetable = RESETABLE_MEDIA_VIEW_COMPONENTS.includes(component?.name);

                  if (isResetable && isBakable) {
                    showTips = "hover_bakable_resetable_interactable";
                  } else if (isResetable) {
                    showTips = "hover_resetable_interactable";
                  } else if (isBakable) {
                    showTips = "hover_bakable_interactable";
                  } else {
                    showTips = "hover_interactable";
                  }
                }
              } /* else {
                const component = getMediaViewComponent(hovered);

                if (components["media-video"]) {
                  showTips = components["media-video"].data.videoPaused
                    ? "locked_video_paused"
                    : "locked_video_playing";
                } else if (components["media-pdf"]) {
                  showTips = "locked_pdf";
                } else if (components["media-vox"]) {
                  showTips = "locked_vox";
                } else {
                  const isBakable = BAKABLE_MEDIA_VIEW_COMPONENTS.includes(component?.name);
                  showTips = isBakable ? "hover_locked_bakable_interactable" : "hover_locked_interactable";
                }
              }*/
            }
          }
        }
      }

      // Don't override _edit if we're inspecting to edit (vox)
      if (!this.cameraSystem.isInAvatarView() && !showTips.endsWith("_edit")) {
        if (this.cameraSystem.allowCursor) {
          showTips = "focus_edit";
        } else {
          showTips = "focus";
        }
      }
    } else {
      showTips = "closed";
    }

    if (showTips !== this.tipsToShow) {
      this.tipEl.setAttribute("data-show-tips", showTips);
      this.tipsToShow = showTips;
    }
  }
}
