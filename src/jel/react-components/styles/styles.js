import { NORMALIZE_CSS } from "./normalize-css";
import { ATOM_TREE, SPACE_TREE } from "./trees";
import { CREATE_SELECT } from "./create-select";
import { EMOJIS } from "./emojis";
import { QUILL_CORE, QUILL_BUBBLE, QUILL_EMOJI, QUILL_HIGHLIGHT } from "./quill";
import { SMALL_TEXT_SIZE, SMALL_TEXT_WEIGHT, XSMALL_TEXT_SIZE, XSMALL_TEXT_WEIGHT, JEL_THEME_VARS } from "./jel-theme";

export default `
  ${JEL_THEME_VARS}
  ${NORMALIZE_CSS}
  ${EMOJIS}
  ${QUILL_CORE}
  ${QUILL_BUBBLE}
  ${QUILL_EMOJI}
  ${QUILL_HIGHLIGHT}

  @keyframes expand-tree-node { from { transform: rotate(0deg); } to { transform: rotate(90deg); } }
  @keyframes collapse-tree-node { from { transform: rotate(90deg); } to { transform: rotate(0deg); } }

  ${ATOM_TREE}
  ${SPACE_TREE}
  ${CREATE_SELECT}

  *, *:before, *:after {
    box-sizing: inherit;
  }

  blockquote, dl, dd, h1, h2, h3, h4, h5, h6, hr, figure, p, pre {
    margin: 0;
  }
  
  fieldset {
    margin: 0;
    padding: 0;
  }
  
  ol, ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  
  /*
   * Ensure horizontal rules are visible by default
   */
  
  hr {
    border-top-width: 1px;
  }
  
  textarea {
    resize: vertical;
  }
  
  button, [role="button"] {
    cursor: pointer;
    user-select: none;
  }
  
  table {
    border-collapse: collapse;
  }
  
  h1, h2, h3, h4, h5, h6 {
    font-size: inherit;
    font-weight: inherit;
  }
  
  /**
   * Reset form element properties that are easy to forget to
   * style explicitly so you don't inadvertently introduce
   * styles that deviate from your design system. These styles
   * supplement a partial reset that is already applied by
   * normalize.css.
   */
  
  button, input, optgroup, select, textarea {
    padding: 0;
    line-height: inherit;
    color: inherit;
  }
  
  /**
   * Monospace font stack: https://css-tricks.com/snippets/css/font-stacks/
   */
  
  pre, code, kbd, samp {
    font-family: Consolas, "Andale Mono WT", "Andale Mono", "Lucida Console", "Lucida Sans Typewriter", "DejaVu Sans Mono", "Bitstream Vera Sans Mono", "Liberation Mono", "Nimbus Mono L", Monaco, "Courier New", Courier, monospace;
  }
  
  /**
   * Make replaced elements display: block by default as that's
   * the behavior you want almost all of the time. Inspired by
   * CSS Remedy, with svg added as well.
   *
   * https://github.com/mozdevs/cssremedy/issues/14
   */
  
  img, svg, video, canvas, audio, iframe, embed, object {
    display: block;
    vertical-align: middle;
  }
  
  /**
   * Constrain images and videos to the parent width and preserve
   * their instrinsic aspect ratio.
   *
   * https://github.com/mozdevs/cssremedy/issues/14
   */
  
  img, video {
    max-width: 100%;
    height: auto;
  }
  
  label {
    font-size: ${SMALL_TEXT_SIZE};
    font-weight: ${SMALL_TEXT_WEIGHT};
  }
  
  body :focus {
    outline: none;
  }
  
  /* We want svg icons to have title elements for screen readers, but we don't need to show their tooltips when they are inside buttons */
  button svg {
    pointer-events: none;
  }
  
  /**
   * Breakpoint definitions for use wuth react-use-css-breakpoints
   * https://github.com/matthewhall/react-use-css-breakpoints
   */
  body::before {
    content: "sm";
    display: none;
  }
  
  @media (min-width: hubs-theme.$breakpoint-md) {
    body::before {
      content: "md";
    }
  }
  
  @media (min-width: hubs-theme.$breakpoint-lg) {
    body::before {
      content: "lg";
    }
  }
  
  h5 {
    font-size: ${XSMALL_TEXT_SIZE};
    font-weight: ${XSMALL_TEXT_WEIGHT};
  }
  
  label, small {
    font-size: ${XSMALL_TEXT_SIZE};
    font-weight: ${XSMALL_TEXT_WEIGHT};
  }
  
  /**
   * Reset links to optimize for opt-in styling instead of
   * opt-out.
   */
  
  a {
    color: var(--action-color);
  
    &:hover {
      color: var(--action-hover-color);
    }
  
    &:active {
      color: var(--action-pressed-color);
    }
  
    color: inherit;
    text-decoration: inherit;
  }
  
  input::placeholder {
    color: var(--input-text-color);
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

    .slide-down-when-popped {
      transform: translateY(-4px) scale(0.95,0.95);
      transition: transform 0.15s linear
    }

    .slide-up-when-popped {
      transform: translateY(4px) scale(0.95,0.95);
      transition: transform 0.15s linear
    }

    :focus-within {
      opacity: 1;
      pointer-events: auto;

      transition: opacity 0.15s linear;

      .slide-down-when-popped , .slide-up-when-popped {
        transform: translateY(0px) scale(1, 1);
        transition: transform 0.15s cubic-bezier(0.760, -0.005, 0.515, 2.25);
      }

      .modal-background {
        pointer-events: auto;
      }
    }
  }

  .fast-show-when-popped {
    opacity: 0;
    pointer-events: none;

    transition: opacity 0.05s linear;

    &:focus-within {
      opacity: 1;
      pointer-events: auto;

      transition: opacity 0.05s linear;

      .modal-background {
        pointer-events: auto;
      }
    }
  }

  .svg-overlay-shadow {
    filter: drop-shadow(0px 0px 4px var(--menu-shadow-color));
  }

  @keyframes float_logo { from { top: -18px; } to { top: -5px; }  }
  @keyframes float_logo_shadow { from { transform: scaleX(1.2) } to { transform: scaleX(1.0); }  }

  .presence-list {
    .rc-virtual-list-scrollbar {
      background-color: transparent;
    }

    .rc-virtual-list-scrollbar-thumb {
      background-color: var(--scroll-thumb-color) !important;
      width: 4px !important;
    }
  }

  :host(body) {
    overflow: hidden;

    a-scene {
      height: 100%;
      top: 0;
      position: fixed;
      z-index: 3;
      visibility: hidden;

      &.visible {
        visibility: visible;
      }
    }
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
