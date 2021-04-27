import BezierEasing from "bezier-easing";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import qsTruthy from "../../hubs/utils/qs_truthy";

const skipPanels = qsTruthy("skip_panels");

// Used for managing the animation of the major UI panels

export const PANEL_EXPANSION_STATES = {
  EXPANDING: 0,
  EXPANDED: 1,
  COLLAPSING: 2,
  COLLAPSED: 3
};

const DEFAULT_NAV_PANEL_WIDTH = 400;
const DEFAULT_PRESENCE_PANEL_WIDTH = 220;
export const PANEL_EXPAND_DURATION_MS = 250;

const panelExpandStep = BezierEasing(0.12, 0.98, 0.18, 0.98);

export class UIAnimationSystem {
  constructor(sceneEl) {
    this.sceneEl = sceneEl;
    waitForDOMContentLoaded().then(() => (this.neon = document.querySelector("#neon")));

    this.lastTickT = 0;
    this.panelExpansionState = PANEL_EXPANSION_STATES.EXPANDING;

    this.sceneLeft = -1;
    this.sceneRight = -1;
    this.panelExpandStartT = 0;
    this.setTargetSceneSizes();
    this.store = window.APP.store;

    // Hacky, need to apply continuously until react renders DOM.
    const initialUIApplyInterval = setInterval(() => {
      if (!this.applyUI(this.targetSceneLeft, this.targetSceneRight)) return;
      clearInterval(initialUIApplyInterval);
    }, 250);

    const layoutOnFocus = () => {
      // Attempt to fix issues with layout not being set when focusing window
      if (document.visibilityState === "visible") {
        this.applyUI(this.targetSceneLeft, this.targetSceneRight);
      }
    };

    window.addEventListener("focus", layoutOnFocus);
    document.addEventListener("visibilitychange", layoutOnFocus);

    // Initialize nav and presence width CSS vars to stored state.
    document.documentElement.style.setProperty("--nav-width", `${this.targetSceneLeft}px`);
    document.documentElement.style.setProperty("--presence-width", `${this.targetSceneRight}px`);
    window.addEventListener("resize", () => this.applySceneSize(null, null, true));
  }

  expandSidePanels() {
    if (this.panelExpansionState === PANEL_EXPANSION_STATES.EXPANDED) return;
    this.performPanelExpansion(PANEL_EXPANSION_STATES.EXPANDING);
    this.sceneEl.emit("animated_resize_started");
    this.store.handleActivityFlag("widen");
  }

  collapseSidePanels() {
    if (this.panelExpansionState === PANEL_EXPANSION_STATES.COLLAPSED) return;
    this.performPanelExpansion(PANEL_EXPANSION_STATES.COLLAPSING);
    this.sceneEl.emit("animated_resize_started");
    this.store.handleActivityFlag("narrow");
  }

  isCollapsingOrCollapsed() {
    return (
      this.panelExpansionState === PANEL_EXPANSION_STATES.COLLAPSING ||
      this.panelExpansionState === PANEL_EXPANSION_STATES.COLLAPSED
    );
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

    // Pre-emptively re-layout UI since doing it every frame causes FPS drop
    if (newState === PANEL_EXPANSION_STATES.EXPANDING) {
      this.applyUI(this.targetSceneLeft, this.targetSceneRight);
    } else {
      this.applyUI(0, 0);
    }
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

    let sceneLeft = Math.floor(animT * this.targetSceneLeft);
    let sceneRight = Math.floor(animT * this.targetSceneRight);

    if (skipPanels) {
      sceneLeft = 0;
      sceneRight = 0;
    }

    if (sceneLeft !== this.sceneLeft || sceneRight !== this.sceneRight) {
      this.applySceneSize(sceneLeft, sceneRight);

      const width = this.sceneEl.canvas.parentElement.offsetWidth;
      const height = this.sceneEl.canvas.parentElement.offsetHeight;
      this.sceneEl.camera.aspect = width / height;
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

  applySceneSize(sceneLeft, sceneRight, includeUI = false) {
    if (sceneLeft !== null) {
      this.sceneLeft = sceneLeft;
    }

    if (sceneRight !== null) {
      this.sceneRight = sceneRight;
    }

    const width = document.body.clientWidth - this.sceneLeft - this.sceneRight;
    this.sceneEl.style.cssText = `left: ${this.sceneLeft}px; width: ${width}px;`;
    this.neon.style.cssText = `left: ${this.sceneLeft}px; width: ${width}px;`;

    if (includeUI) {
      this.applyUI(this.sceneLeft, this.sceneRight);
    }
  }

  // Returns true if was applied successfully
  applyUI(left, right) {
    if (skipPanels) {
      left = 0;
      right = 0;
    }

    const body = document.body;

    const width = body.clientWidth - left - right;
    const gazeCursor = document.getElementById("gaze-cursor");

    if (gazeCursor) {
      const center = Math.floor(left + width / 2.0);
      gazeCursor.style.cssText = `left: ${center - 3}px; top: 50vh;`;
    }

    const wrap = document.getElementById("jel-ui-wrap");
    if (wrap) {
      wrap.style.cssText = `left: ${left}px; width: ${width}px;`;

      if (left === 0) {
        document.body.classList.add("panels-expanded");
      } else {
        document.body.classList.remove("panels-expanded");
      }

      return true;
    } else {
      return false;
    }
  }
}
