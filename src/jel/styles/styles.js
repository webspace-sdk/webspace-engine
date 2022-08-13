import { NORMALIZE_CSS, JEL_NORMALIZE_CSS } from "./normalize-css";
import { ATOM_TREE, SPACE_TREE } from "./trees";
import { CREATE_SELECT } from "./create-select";
import { EMOJIS } from "./emojis";
import { AFRAME_CSS } from "./aframe";
import { QUILL_CORE, QUILL_BUBBLE, QUILL_EMOJI, QUILL_HIGHLIGHT } from "./quill";
import { JEL_THEME_VARS } from "./jel-theme";

export const ROOT_DOM_STYLES = `
  html {
    box-sizing: border-box;
    line-height: 1;
  
    font-family: Lato, Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"
  }
  
  body {
    background-color: #333;
    margin: 0;
    overflow: hidden;
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
  ${AFRAME_CSS}

  #jel-ui {
    --nav-width: 300px;
    --presence-width: 200px;
  }

  #nav-drag-target {
    --nav-width: 300px;
  }

  #presence-drag-target {
    --presence-width: 200px;
  }

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

  a-scene {
    height: 100%;
    top: 0;
    position: fixed;
    z-index: 3;
    visibility: hidden;
  }

  a-scene.visible {
    visibility: visible;
  }

  #jel-ui.vr-mode-stretch .a-canvas {
    width: 200% !important;
  }

  #gaze-cursor {
    position: absolute;
    mix-blend-mode: color-dodge;
    width: 6px;
    height: 6px;
    z-index: 10000;
    pointer-events: none;
    visibility: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  #gaze-cursor .cursor {
    width: 6px;
    height: 6px;
    border-radius: 4px;
    background-color: rgba(128, 128, 128);
  }

  #gaze-cursor.show {
    visibility: visible;
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

  #jel-ui.panels-collapsed #presence-drag-target {
    display: none;
  }

  #jel-ui.panels-collapsed #nav-drag-target {
    display: none;
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

  .a-enter-vr, .a-orientation-modal {
    display: none;
  }

  .grab-cursor {
    cursor: grab;
  }

  .no-cursor {
    cursor: none;
  }

  .webxr-realities, .webxr-sessions {
    -moz-user-select: none;
    -webkit-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }

  // HACK: Deals with a performance regression in Chrome 75 where, once
  // enough elements are on the page, the Chrome "reader" functionality continually
  // scanning the page on mouse drag kills performance.

  a-entity {
    display: none;
  }

  .svg-icon {
    overflow: visible;
    display: inline-block;
    font-size: inherit;
    vertical-align: -0.125em;
    height: 1em;
  }
`;
