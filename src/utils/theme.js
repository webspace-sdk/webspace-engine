import { waitForShadowDOMContentLoaded } from "./async-utils";
import "./configs";

// Node these should be synchronized with the top of shared.scss
const DEFAULT_ACTION_COLOR = "#FF3464";
const DEFAULT_ACTION_COLOR_LIGHT = "#FF74A4";

const DEFAULT_COLORS = {
  "action-color": DEFAULT_ACTION_COLOR,
  "action-label-color": DEFAULT_ACTION_COLOR,
  "action-color-disabled": DEFAULT_ACTION_COLOR_LIGHT,
  "action-color-highlight": DEFAULT_ACTION_COLOR_LIGHT,
  "action-text-color": "#FFFFFF",
  "action-subtitle-color": "#F0F0F0",
  "notice-background-color": "#2F80ED",
  "notice-text-color": "#FFFFFF",
  "favorited-color": "#FFC000"
};

function getThemeColor(name) {
  if (window.APP_CONFIG && window.APP_CONFIG.theme && window.APP_CONFIG.theme[name])
    return window.APP_CONFIG.theme[name];

  return DEFAULT_COLORS[name];
}

waitForShadowDOMContentLoaded().then(() => {
  const actionColor = getThemeColor("action-color");
  const actionHoverColor = getThemeColor("action-color-highlight");

  if (DOM_ROOT.querySelector("#rounded-text-button")) {
    // NOTE, using the object-based {} setAttribute variant in a-frame
    // seems to not work in Firefox here -- the entities with the mixins are not
    // updated.
    DOM_ROOT.querySelector("#rounded-text-button").setAttribute(
      "text-button",
      `textHoverColor: ${actionHoverColor}; textColor: ${actionColor}; backgroundColor: #fff; backgroundHoverColor: #aaa;`
    );

    DOM_ROOT.querySelector("#rounded-button").setAttribute(
      "text-button",
      `textHoverColor: ${actionHoverColor}; textColor: ${actionColor}; backgroundColor: #fff; backgroundHoverColor: #aaa;`
    );

    DOM_ROOT.querySelector("#rounded-text-action-button").setAttribute(
      "text-button",
      `textHoverColor: #fff; textColor: #fff; backgroundColor: ${actionColor}; backgroundHoverColor: ${actionHoverColor}`
    );

    DOM_ROOT.querySelector("#rounded-action-button").setAttribute(
      "text-button",
      `textHoverColor: #fff; textColor: #fff; backgroundColor: ${actionColor}; backgroundHoverColor: ${actionHoverColor}`
    );
  }
});

function applyThemeToTextButton(el, highlighted) {
  el.setAttribute(
    "text-button",
    "backgroundColor",
    highlighted ? getThemeColor("action-color-highlight") : getThemeColor("action-color")
  );
  el.setAttribute(
    "text-button",
    "backgroundHoverColor",
    highlighted ? "#aaa" : getThemeColor("action-color-highlight")
  );
}

export { applyThemeToTextButton, getThemeColor };
