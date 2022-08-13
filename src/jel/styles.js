import NORMALIZE_CSS from "../assets/jel/stylesheets/normalize.scss";
import GLOBAL_CSS from "../assets/jel/stylesheets/global.scss";
import ATOM_TREE from "../assets/jel/stylesheets/atom-tree.scss";
import SPACE_TREE from "../assets/jel/stylesheets/space-tree.scss";
import CREATE_SELECT from "../assets/jel/stylesheets/create-select.scss";
import EMOJIS from "../assets/jel/stylesheets/emojis.scss";
import JEL_THEME from "../assets/jel/stylesheets/jel-theme.scss";
import ROOT_STYLES from "../assets/jel/stylesheets/root.scss";
import AFRAME_CSS from "aframe/src/style/aframe.css";
import TIPPY_CSS from "tippy.js/dist/tippy.css";
import QUILL_CORE from "quill/dist/quill.core.css";
import QUILL_BUBBLE from "quill/dist/quill.bubble.css";
import QUILL_EMOJI from "quill-emoji/dist/quill-emoji.css";
import QUILL_HIGHLIGHT from "highlight.js/scss/github.scss";

export const ROOT_DOM_STYLES = ROOT_STYLES;

export const SHADOW_DOM_STYLES = `
  ${JEL_THEME}

  ${NORMALIZE_CSS}
  ${GLOBAL_CSS}
  ${AFRAME_CSS}
  ${TIPPY_CSS}

  ${EMOJIS}
  ${QUILL_CORE}
  ${QUILL_BUBBLE}
  ${QUILL_EMOJI}
  ${QUILL_HIGHLIGHT}
  ${ATOM_TREE}
  ${SPACE_TREE}
  ${CREATE_SELECT}

`;
