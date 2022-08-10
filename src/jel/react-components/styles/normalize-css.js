import { SMALL_TEXT_SIZE, SMALL_TEXT_WEIGHT, XSMALL_TEXT_SIZE, XSMALL_TEXT_WEIGHT } from "./jel-theme";

export const NORMALIZE_CSS = `
  main {
    display: block;
  }
  
  h1 {
    font-size: 2em;
    margin: 0.67em 0;
  }
  
  hr {
    box-sizing: content-box; /* 1 */
    height: 0; /* 1 */
    overflow: visible; /* 2 */
  }
  
  pre {
    font-family: monospace, monospace; /* 1 */
    font-size: 1em; /* 2 */
  }
  
  a {
    background-color: transparent;
  }
  
  abbr[title] {
    border-bottom: none; /* 1 */
    text-decoration: underline; /* 2 */
    text-decoration: underline dotted; /* 2 */
  }
  
  b,
  strong {
    font-weight: bolder;
  }
  
  code,
  kbd,
  samp {
    font-family: monospace, monospace; /* 1 */
    font-size: 1em; /* 2 */
  }
  
  small {
    font-size: 80%;
  }
  
  sub,
  sup {
    font-size: 75%;
    line-height: 0;
    position: relative;
    vertical-align: baseline;
  }
  
  sub {
    bottom: -0.25em;
  }
  
  sup {
    top: -0.5em;
  }
  
  img {
    border-style: none;
  }
  
  button,
  input,
  optgroup,
  select,
  textarea {
    font-family: inherit; /* 1 */
    font-size: 100%; /* 1 */
    line-height: 1.15; /* 1 */
    margin: 0; /* 2 */
  }
  
  button,
  input { /* 1 */
    overflow: visible;
  }
  
  button,
  select { /* 1 */
    text-transform: none;
  }
  
  button,
  [type="button"],
  [type="reset"],
  [type="submit"] {
    -webkit-appearance: button;
  }
  
  button::-moz-focus-inner,
  [type="button"]::-moz-focus-inner,
  [type="reset"]::-moz-focus-inner,
  [type="submit"]::-moz-focus-inner {
    border-style: none;
    padding: 0;
  }
  
  button:-moz-focusring,
  [type="button"]:-moz-focusring,
  [type="reset"]:-moz-focusring,
  [type="submit"]:-moz-focusring {
    outline: 1px dotted ButtonText;
  }
  
  fieldset {
    padding: 0.35em 0.75em 0.625em;
  }
  
  legend {
    box-sizing: border-box; /* 1 */
    color: inherit; /* 2 */
    display: table; /* 1 */
    max-width: 100%; /* 1 */
    padding: 0; /* 3 */
    white-space: normal; /* 1 */
  }
  
  progress {
    vertical-align: baseline;
  }
  
  textarea {
    overflow: auto;
  }
  
  [type="checkbox"],
  [type="radio"] {
    box-sizing: border-box; /* 1 */
    padding: 0; /* 2 */
  }
  
  [type="number"]::-webkit-inner-spin-button,
  [type="number"]::-webkit-outer-spin-button {
    height: auto;
  }
  
  [type="search"] {
    -webkit-appearance: textfield; /* 1 */
    outline-offset: -2px; /* 2 */
  }
  
  [type="search"]::-webkit-search-decoration {
    -webkit-appearance: none;
  }
  
  ::-webkit-file-upload-button {
    -webkit-appearance: button; /* 1 */
    font: inherit; /* 2 */
  }
  
  details {
    display: block;
  }
  
  summary {
    display: list-item;
  }
  
  template {
    display: none;
  }
  
  [hidden] {
    display: none;
  }
`;

export const JEL_NORMALIZE_CSS = `
  *:before, *:after {
    box-sizing: inherit;
  }

  * {
    box-sizing: border-box;
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
  
    color: inherit;
    text-decoration: inherit;
  }
  
  a:hover {
    color: var(--action-hover-color);
  }

  a:active {
    color: var(--action-pressed-color);
  }
`;
