export const PANEL_EXPANSION_STATES = {
  EXPANDING: 0,
  EXPANDED: 1,
  COLLAPSING: 2,
  COLLAPSED: 3
};

const DEFAULT_NAV_PANEL_WIDTH = 400;
const DEFAULT_PRESENCE_PANEL_WIDTH = 220;
export const PANEL_EXPAND_DURATION_MS = 150;

import BezierEasing from "bezier-easing";
const panelExpandStep = BezierEasing(0.12, 0.98, 0.18, 0.98);

export class UIAnimationSystem {
  constructor(sceneEl) {
    this.sceneEl = sceneEl;
    this.lastTickT = 0;
    this.panelExpansionState = PANEL_EXPANSION_STATES.EXPANDING;

    this.sceneLeft = -1;
    this.sceneRight = -1;
    this.panelExpandStartT = 0;
    this.setTargetSceneSizes();

    // Initialize nav and presence width CSS vars to stored state.
    document.documentElement.style.setProperty("--nav-width", `${this.targetSceneLeft}px`);
    document.documentElement.style.setProperty("--presence-width", `${this.targetSceneRight}px`);
  }

  expandSidePanels() {
    this.performPanelExpansion(PANEL_EXPANSION_STATES.EXPANDING);
    this.sceneEl.emit("animated_resize_started");
  }

  collapseSidePanels() {
    this.performPanelExpansion(PANEL_EXPANSION_STATES.COLLAPSING);
    this.sceneEl.emit("animated_resize_started");
  }

  performPanelExpansion(newState) {
    if (
      this.panelExpansionState === PANEL_EXPANSION_STATES.EXPANDING ||
      this.panelExpansionState === PANEL_EXPANSION_STATES.COLLAPSING
    )
      return;

    this.panelExpansionState = newState;
    this.setTargetSceneSizes();
    this.panelExpandStartT = this.lastTickT;
  }

  setTargetSceneSizes() {
    const store = window.APP.store;
    this.targetSceneLeft = store.state.uiState.navPanelWidth || DEFAULT_NAV_PANEL_WIDTH;
    this.targetSceneRight = store.state.uiState.presencePanelWidth || DEFAULT_PRESENCE_PANEL_WIDTH;
  }

  tick(t) {
    this.performPanelAnimationStep(t);
    this.lastTickT = t;
  }

  performPanelAnimationStep(t) {
    if (
      this.panelExpansionState === PANEL_EXPANSION_STATES.EXPANDED ||
      this.panelExpansionState === PANEL_EXPANSION_STATES.COLLAPSED
    )
      return;

    let animT = Math.min(1.0, Math.max(0.0, (t - this.panelExpandStartT) / PANEL_EXPAND_DURATION_MS));
    animT = panelExpandStep(animT);
    animT = this.panelExpansionState === PANEL_EXPANSION_STATES.EXPANDING ? animT : 1 - animT;

    const sceneLeft = Math.floor(animT * this.targetSceneLeft);
    const sceneRight = Math.floor(animT * this.targetSceneRight);

    if (sceneLeft !== this.sceneLeft || sceneRight !== this.sceneRight) {
      this.sceneLeft = sceneLeft;
      this.sceneRight = sceneRight;
      this.applySceneSize();

      const width = document.body.clientWidth - sceneLeft - sceneRight;
      this.sceneEl.camera.aspect = width / this.sceneEl.canvas.height;
      this.sceneEl.camera.updateProjectionMatrix();
    } else {
      let finished = false;

      if (this.panelExpansionState === PANEL_EXPANSION_STATES.EXPANDING) {
        this.panelExpansionState = PANEL_EXPANSION_STATES.EXPANDED;
        finished = true;
      } else if (this.panelExpansionState === PANEL_EXPANSION_STATES.COLLAPSING) {
        this.panelExpansionState = PANEL_EXPANSION_STATES.COLLAPSED;
        finished = true;
      }

      if (finished) {
        this.sceneEl.resize();
        this.sceneEl.emit("animated_resize_complete");
      }
    }
  }

  applySceneSize() {
    const scene = document.querySelector("a-scene");
    const uiWrap = document.querySelector("#jel-ui-wrap");

    scene.style.setProperty("--scene-left", `${this.sceneLeft}px`);
    scene.style.setProperty("--scene-right", `${this.sceneRight}px`);
    uiWrap.style.setProperty("--scene-left", `${this.sceneLeft}px`);
    uiWrap.style.setProperty("--scene-right", `${this.sceneRight}px`);
  }
}
