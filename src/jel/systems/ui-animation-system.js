export const PANEL_EXPANSION_STATES = {
  EXPANDING: 0,
  EXPANDED: 1,
  COLLAPSING: 2,
  COLLAPSED: 3
};

const DEFAULT_NAV_PANEL_WIDTH = 300;
const DEFAULT_PRESENCE_PANEL_WIDTH = 300;
const PANEL_EXPAND_DURATION_MS = 100;

export class UIAnimationSystem {
  constructor(sceneEl) {
    this.sceneEl = sceneEl;
    this.lastTickT = 0;
    this.panelExpansionState = PANEL_EXPANSION_STATES.EXPANDING;

    this.navWidth = -1;
    this.presenceWidth = -1;
    this.panelExpandStartT = 0;
    this.setPanelTargetWidths();
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

    this.setPanelTargetWidths();
    this.panelExpandStartT = this.lastTickT;
  }

  setPanelTargetWidths() {
    const store = window.APP.store;
    this.targetNavWidth = store.state.uiState.navPanelWidth || DEFAULT_NAV_PANEL_WIDTH;
    this.targetPresenceWidth = store.state.uiState.presencePanelWidth || DEFAULT_PRESENCE_PANEL_WIDTH;
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
    animT = this.panelExpansionState === PANEL_EXPANSION_STATES.EXPANDING ? animT : 1 - animT;
    const navWidth = Math.floor(animT * this.targetNavWidth);
    const presenceWidth = Math.floor(animT * this.targetPresenceWidth);

    if (navWidth !== this.navWidth || presenceWidth !== this.presenceWidth) {
      this.navWidth = navWidth;
      this.presenceWidth = presenceWidth;
      this.applyPanelWidths();
      this.sceneEl.resize();
    } else {
      if (this.panelExpansionState === PANEL_EXPANSION_STATES.EXPANDING) {
        this.panelExpansionState = PANEL_EXPANSION_STATES.EXPANDED;
      } else {
        this.panelExpansionState = PANEL_EXPANSION_STATES.COLLAPSED;
      }
    }
  }

  applyPanelWidths() {
    document.documentElement.style.setProperty("--nav-width", `${this.navWidth}px`);
    document.documentElement.style.setProperty("--presence-width", `${this.presenceWidth}px`);
  }
}
