import { CursorTargettingSystem } from "./cursor-targetting-system";
import { PositionAtBorderSystem } from "../components/position-at-border";
import { BoneVisibilitySystem } from "../components/bone-visibility";
import { AnimationMixerSystem } from "../components/animation-mixer";
import { UVScrollSystem } from "../components/uv-scroll";
import { CursorTogglingSystem } from "./cursor-toggling-system";
import { PhysicsSystem } from "./physics-system";
import { ConstraintsSystem } from "./constraints-system";
import { TwoPointStretchingSystem } from "./two-point-stretching-system";
import { SingleActionButtonSystem, HoldableButtonSystem, HoverButtonSystem } from "./button-systems";
import { DrawingMenuSystem } from "./drawing-menu-system";
import { HoverMenuSystem } from "./hover-menu-system";
import { SuperSpawnerSystem } from "./super-spawner-system";
import { HapticFeedbackSystem } from "./haptic-feedback-system";
import { SoundEffectsSystem } from "./sound-effects-system";
import { BatchManagerSystem } from "./render-manager-system";
import { ScenePreviewCameraSystem } from "./scene-preview-camera-system";
import { InteractionSfxSystem } from "./interaction-sfx-system";
import { SpriteSystem } from "./sprites";
import { CameraSystem } from "./camera-system";
import { CharacterControllerSystem } from "./character-controller-system";
import { waitForDOMContentLoaded } from "../utils/async-utils";
import { CursorPoseTrackingSystem } from "./cursor-pose-tracking";
import { ScaleInScreenSpaceSystem } from "./scale-in-screen-space";
import { AudioSettingsSystem } from "./audio-settings-system";
import { EnterVRButtonSystem } from "./enter-vr-button-system";
import { MediaPresenceSystem } from "../../jel/systems/media-presence-system";
import { AudioSystem } from "./audio-system";
import { MediaStreamSystem } from "./media-stream-system";
import { WrappedEntitySystem } from "../../jel/systems/wrapped-entity-system";
import { TerrainSystem } from "../../jel/systems/terrain-system";
import { AtmosphereSystem } from "../../jel/systems/atmosphere-system";
import { UIAnimationSystem } from "../../jel/systems/ui-animation-system";
import { AvatarSystem } from "../../jel/systems/avatar-system";
import { SkyBeamSystem } from "../../jel/systems/sky-beam-system";
import { HelpersSystem } from "../../jel/systems/helpers-system";
import { MediaInteractionSystem } from "../../jel/systems/media-interaction-system";
import { CameraRotatorSystem } from "../../hubs/systems/camera-rotator-system";
import { KeyboardTipSystem } from "../../jel/systems/keyboard-tip-system";
import { AutoQualitySystem } from "../../jel/systems/auto-quality-system";
import { VoxmojiSystem } from "../../jel/systems/voxmoji-system";
import { ProjectileSystem } from "../../jel/systems/projectile-system";
import { LauncherSystem } from "../../jel/systems/launcher-system";
import { PasteSystem } from "../../hubs/systems/paste-system";

AFRAME.registerSystem("hubs-systems", {
  init() {
    waitForDOMContentLoaded().then(() => {
      this.DOMContentDidLoad = true;
    });
    this.cursorTogglingSystem = new CursorTogglingSystem();
    this.interactionSfxSystem = new InteractionSfxSystem();
    this.superSpawnerSystem = new SuperSpawnerSystem();
    this.cursorTargettingSystem = new CursorTargettingSystem();
    this.positionAtBorderSystem = new PositionAtBorderSystem();
    this.cameraSystem = new CameraSystem(this.el);
    this.atmosphereSystem = new AtmosphereSystem(this.el, this.cameraSystem);
    this.skyBeamSystem = new SkyBeamSystem(this.el);
    this.voxmojiSystem = new VoxmojiSystem(this.el, this.atmosphereSystem);
    this.physicsSystem = new PhysicsSystem(
      this.el.object3D,
      this.atmosphereSystem,
      this.skyBeamSystem,
      this.voxmojiSystem
    );
    this.constraintsSystem = new ConstraintsSystem(this.physicsSystem);
    this.twoPointStretchingSystem = new TwoPointStretchingSystem();
    this.singleActionButtonSystem = new SingleActionButtonSystem();
    this.holdableButtonSystem = new HoldableButtonSystem();
    this.hoverButtonSystem = new HoverButtonSystem();
    this.hoverMenuSystem = new HoverMenuSystem();
    this.hapticFeedbackSystem = new HapticFeedbackSystem();
    this.audioSystem = new AudioSystem(this.el);
    this.soundEffectsSystem = new SoundEffectsSystem(this.el);
    this.scenePreviewCameraSystem = new ScenePreviewCameraSystem();
    this.spriteSystem = new SpriteSystem(this.el);
    this.batchManagerSystem = new BatchManagerSystem(this.el.object3D, this.el.renderer);
    this.drawingMenuSystem = new DrawingMenuSystem(this.el);
    this.cursorPoseTrackingSystem = new CursorPoseTrackingSystem();
    this.scaleInScreenSpaceSystem = new ScaleInScreenSpaceSystem();
    this.audioSettingsSystem = new AudioSettingsSystem(this.el);
    this.enterVRButtonSystem = new EnterVRButtonSystem(this.el);
    this.mediaInteractionSystem = new MediaInteractionSystem(this.el);
    this.animationMixerSystem = new AnimationMixerSystem();
    this.boneVisibilitySystem = new BoneVisibilitySystem();
    this.uvScrollSystem = new UVScrollSystem();
    this.mediaStreamSystem = new MediaStreamSystem(this.el);
    this.wrappedEntitySystem = new WrappedEntitySystem(this.el, this.atmosphereSystem, this.skyBeamSystem);
    this.projectileSystem = new ProjectileSystem(
      this.el,
      this.voxmojiSystem,
      this.physicsSystem,
      this.wrappedEntitySystem,
      this.soundEffectsSystem
    );
    this.terrainSystem = new TerrainSystem(this.el, this.atmosphereSystem);
    this.characterController = new CharacterControllerSystem(this.el, this.terrainSystem);
    this.mediaPresenceSystem = new MediaPresenceSystem(this.el, this.characterController);
    this.uiAnimationSystem = new UIAnimationSystem(this.el, this.atmosphereSystem);
    this.avatarSystem = new AvatarSystem(this.el, this.atmosphereSystem);
    this.cameraRotatorSystem = new CameraRotatorSystem(this.el);
    this.keyboardTipSystem = new KeyboardTipSystem(this.el, this.cameraSystem);
    this.autoQualitySystem = new AutoQualitySystem(this.el);
    this.helpersSystem = new HelpersSystem(this.el);
    this.launcherSystem = new LauncherSystem(
      this.el,
      this.projectileSystem,
      this.el.systems.userinput,
      this.characterController,
      this.soundEffectsSystem
    );
    this.pasteSystem = new PasteSystem(this.el);
  },

  tick(t, dt) {
    if (!this.DOMContentDidLoad) return;
    const systems = AFRAME.scenes[0].systems;
    systems.userinput.tick2();
    systems.interaction.tick2();

    // We run this earlier in the frame so things have a chance to override properties run by animations
    this.animationMixerSystem.tick(dt);

    this.pasteSystem.tick(t);
    this.cameraRotatorSystem.tick();
    this.characterController.tick(t, dt);
    this.wrappedEntitySystem.tick();
    this.cursorTogglingSystem.tick(systems.interaction, systems.userinput, this.el);
    this.interactionSfxSystem.tick(systems.interaction, systems.userinput, this.soundEffectsSystem);
    this.superSpawnerSystem.tick();
    this.cursorPoseTrackingSystem.tick();
    this.cursorTargettingSystem.tick(t);
    this.positionAtBorderSystem.tick();
    this.scaleInScreenSpaceSystem.tick();
    this.constraintsSystem.tick();
    this.twoPointStretchingSystem.tick();
    this.singleActionButtonSystem.tick();
    this.holdableButtonSystem.tick();
    this.hoverButtonSystem.tick();
    this.drawingMenuSystem.tick();
    this.hoverMenuSystem.tick();
    this.hapticFeedbackSystem.tick(
      this.twoPointStretchingSystem,
      this.singleActionButtonSystem.didInteractLeftThisFrame,
      this.singleActionButtonSystem.didInteractRightThisFrame
    );
    this.soundEffectsSystem.tick();
    this.scenePreviewCameraSystem.tick();
    this.physicsSystem.tick(dt);
    this.batchManagerSystem.tick(t);
    this.cameraSystem.tick(this.el, dt);
    this.spriteSystem.tick(t, dt);
    this.enterVRButtonSystem.tick();
    this.uvScrollSystem.tick(dt);
    this.terrainSystem.tick();
    this.atmosphereSystem.tick(dt);
    this.mediaInteractionSystem.tick(t, dt);
    this.mediaPresenceSystem.tick();
    this.uiAnimationSystem.tick(t, dt);
    this.avatarSystem.tick(t, dt);
    this.skyBeamSystem.tick(t, dt);
    this.voxmojiSystem.tick(t, dt);
    this.projectileSystem.tick(t, dt);
    this.keyboardTipSystem.tick();
    this.autoQualitySystem.tick(t, dt);
    this.helpersSystem.tick(t, dt);
    this.launcherSystem.tick(t, dt);

    // We run this late in the frame so that its the last thing to have an opinion about the scale of an object
    this.boneVisibilitySystem.tick();
  },

  remove() {
    this.cursorTargettingSystem.remove();
  }
});
