export const PANEL_EXPANSION_STATES = {
  EXPANDING: 0,
  EXPANDED: 1,
  COLLAPSING: 2,
  COLLAPSED: 3
};

const DEFAULT_NAV_PANEL_WIDTH = 300;
const DEFAULT_PRESENCE_PANEL_WIDTH = 300;
const PANEL_EXPAND_DURATION_MS = 250;

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

  togglePanelExpansion() {
    if (
      this.panelExpansionState === PANEL_EXPANSION_STATES.EXPANDING ||
      this.panelExpansionState === PANEL_EXPANSION_STATES.COLLAPSING
    )
      return;

    if (this.panelExpansionState === PANEL_EXPANSION_STATES.EXPANDED) {
      this.panelExpansionState = PANEL_EXPANSION_STATES.COLLAPSING;
    } else {
      this.panelExpansionState = PANEL_EXPANSION_STATES.EXPANDING;
    }

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
      this.sceneEl.resize();
    } else {
      if (this.panelExpansionState === PANEL_EXPANSION_STATES.EXPANDING) {
        this.panelExpansionState = PANEL_EXPANSION_STATES.EXPANDED;
      } else {
        this.panelExpansionState = PANEL_EXPANSION_STATES.COLLAPSED;
      }
    }
  }

  applySceneSize() {
    document.documentElement.style.setProperty("--scene-left", `${this.sceneLeft}px`);
    document.documentElement.style.setProperty("--scene-right", `${this.sceneRight}px`);
  }
}
