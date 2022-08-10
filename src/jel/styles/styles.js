import { NORMALIZE_CSS, JEL_NORMALIZE_CSS } from "./normalize-css";
import { ATOM_TREE, SPACE_TREE } from "./trees";
import { CREATE_SELECT } from "./create-select";
import { EMOJIS } from "./emojis";
import { QUILL_CORE, QUILL_BUBBLE, QUILL_EMOJI, QUILL_HIGHLIGHT } from "./quill";
import { JEL_THEME_VARS } from "./jel-theme";

export const ROOT_DOM_STYLES = `
  html {
    box-sizing: border-box;
    line-height: 1;
  
    font-family: Lato, Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"
  }
  
  :root {
    --nav-width: 300px;
    --presence-width: 200px;
  }
  
  body {
    background-color: #333;
    margin: 0;
  }
  
  body:focus {
    outline: none;
  }
    
  body::before {
    content: "sm";
    display: none;
  }

  a-assets img {
    display: none;
  }
`;

export const SHADOW_DOM_STYLES = `
  ${JEL_THEME_VARS}

  ${NORMALIZE_CSS}
  ${JEL_NORMALIZE_CSS}

  @keyframes expand-tree-node { from { transform: rotate(0deg); } to { transform: rotate(90deg); } }
  @keyframes collapse-tree-node { from { transform: rotate(90deg); } to { transform: rotate(0deg); } }

  @keyframes float_logo { from { top: -18px; } to { top: -5px; }  }
  @keyframes float_logo_shadow { from { transform: scaleX(1.2) } to { transform: scaleX(1.0); }  }

  ${EMOJIS}
  ${QUILL_CORE}
  ${QUILL_BUBBLE}
  ${QUILL_EMOJI}
  ${QUILL_HIGHLIGHT}
  ${ATOM_TREE}
  ${SPACE_TREE}
  ${CREATE_SELECT}

  input::placeholder {
    color: var(--input-text-color);
  }

  #neon {
    display: none;
  }

  .base-panel {
    color: var(--panel-text-color);
    background-color: var(--panel-background-color);
    font-weight: $small-text-weight;
  }

  .secondary-panel {
    color: var(--panel-text-color);
    background-color: var(--secondary-panel-background-color);
    font-weight: $small-text-weight;
    font-size: var(--panel-text-size);
    font-weight: var(--panel-text-weight);
  }

  .show-when-popped {
     position: relative;
     opacity: 0;
     pointer-events: none;
     transition: opacity 0.15s linear;
  }

  .show-when-popped .slide-down-when-popped {
     transform: translateY(-4px) scale(0.95, 0.95);
     transition: transform 0.15s linear;
  }

  .show-when-popped .slide-up-when-popped {
     transform: translateY(4px) scale(0.95, 0.95);
     transition: transform 0.15s linear;
  }

  .show-when-popped :focus-within {
     opacity: 1;
     pointer-events: auto;
     transition: opacity 0.15s linear;
  }

  .show-when-popped :focus-within .slide-down-when-popped, .show-when-popped :focus-within .slide-up-when-popped {
     transform: translateY(0px) scale(1, 1);
     transition: transform 0.15s cubic-bezier(0.76, -0.005, 0.515, 2.25);
  }

  .show-when-popped :focus-within .modal-background {
     pointer-events: auto;
  }

  .fast-show-when-popped {
     opacity: 0;
     pointer-events: none;
     transition: opacity 0.05s linear;
  }

  .fast-show-when-popped:focus-within {
     opacity: 1;
     pointer-events: auto;
     transition: opacity 0.05s linear;
  }

  .fast-show-when-popped:focus-within .modal-background {
     pointer-events: auto;
  }

  .svg-overlay-shadow {
    filter: drop-shadow(0px 0px 4px var(--menu-shadow-color));
  }

  .presence-list .rc-virtual-list-scrollbar {
    background-color: transparent;
  }

  .presence-list .rc-virtual-list-scrollbar-thumb {
    background-color: var(--scroll-thumb-color) !important;
    width: 4px !important;
  }

  :host(body) {
    overflow: hidden;
  }

  :host(body) a-scene {
    height: 100%;
    top: 0;
    position: fixed;
    z-index: 3;
    visibility: hidden;
  }

  :host(body) a-scene.visible {
    visibility: visible;
  }

  :host(.show-css-cursor) #gaze-cursor{
    overflow: hidden;
  }

  #jel-popup-root {
    position: absolute;
    pointer-events: none;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    z-index: 7;
  }

  #nav-drag-target {
    position: absolute;
    width: 32px;
    left: calc(var(--nav-width) - 16px);
    top: 0;
    z-index: 6;
    height: 100%;
    cursor: col-resize;
    display: block;
  }

  #presence-drag-target {
    position: absolute;
    width: 32px;
    right: calc(var(--presence-width) - 16px);
    top: 0;
    z-index: 6;
    height: 100%;
    cursor: col-resize;
    display: block;
  }

  :host(.panels-collapsed) #presence-drag-target {
    display: none;
  }

  :host(.panels-collapsed) #nav-drag-target {
    display: none;
  }

  :host(.panels-collapsed) #jel-ui-wrap,
  :host(.paused) #jel-ui-wrap {
    height: 100%;
  }

  :host(.panels-collapsed) #asset-panel {
    display: none;
  }

  :host(.panels-collapsed) #left-expand-trigger {
    display: flex;
  }

  :host(.paused) #jel-interface.hub-type-world #jel-ui-wrap {
    pointer-events: auto;
    background-color: rgba(0, 0, 0, 0.6);
  }

  :host(.paused) #jel-interface.hub-type-channel #jel-ui-wrap {
    pointer-events: none;
    background-color: transparent;
  }

  :host(.paused) #jel-interface.hub-type-world #asset-panel {
    display: none;
  }

  :host(.paused) #jel-interface.hub-type-channel #asset-panel {
    display: none;
  }

  :host(.panels-collapsed) #right-expand-trigger {
    display: flex;
  }

  :host(.panels-collapsed) #bottom-expand-trigger {
    display: flex;
  }

  :host(.low-detail) #fade-edges {
    background: none;
  }

  :host(.paused) #paused-info-label {
    display: block;
  }

  :host(.paused) #unpaused-info-label {
    display: none;
  }

  :host(.paused) #unpaused-info-label-2 {
    display: none;
  }

  :host(.paused) .external-camera-on #external-camera-canvas {
    display: none;
  }

  :host(.paused) .external-camera-on #external-camera-rotate-button {
    display: none;
  }

  :host(.paused) #key-tips-wrap {
      opacity: 0.4;
  }

  :host(.panels-collapsed) #device-statuses {
    display: flex;
  }

  :host(.paused) #device-statuses {
    display: none;
  }

  :host(.panels-collapsed) #snackbar {
    display: none;
  }

  :host(.paused) #snackbar {
    display: none;
  }

  :host(.panels-collapsed) #self-panel {
     background-color: var(--canvas-overlay-neutral-item-background-color);
     text-shadow: 0px 0px 4px var(--menu-shadow-color);
     border-radius: 0 12px 0 0;
  }

  :host(.panels-collapsed) #top-panel {
     display: none;
  }

  :host(.panels-collapsed) #chat-log {
    bottom: 64px;
  }

  :host(.paused) #chat-log {
      visibility: hidden;
  }

  :host(.panels-collapsed) .hide-when-expanded {
    display: none;
  }

  :host(.panels-collapsed) .pause-info-label {
     bottom: 76px;
  }

  .quill-editor-wrap {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
  }
`;
