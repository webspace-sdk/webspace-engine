import React, { useCallback, useRef, useState, useEffect, forwardRef } from "react";
import scrollIntoView from "scroll-into-view-if-needed";
import PropTypes from "prop-types";
import styled from "styled-components";
import Fuse from "fuse.js";
import { handleTextFieldFocus, handleTextFieldBlur } from "../../hubs/utils/focus-utils";
import { FloatingTextWrap, FloatingTextElement } from "./floating-text-input";
import { getMessages } from "../../hubs/utils/i18n";
import { useRefFocusResetter } from "../utils/shared-effects";
import { imageUrlForUnicodeEmoji } from "../../hubs/utils/media-url-utils";

import { EmojiList } from "../utils/emojis";

const emojiSort = (a, b) => a.emoji_order - b.emoji_order;

const CATEGORIES = [
  { type: "p", name: "people", className: "i-people" },
  { type: "n", name: "nature", className: "i-nature" },
  { type: "d", name: "food", className: "i-food" },
  { type: "s", name: "symbols", className: "i-symbols" },
  { type: "a", name: "activity", className: "i-activity" },
  { type: "t", name: "travel", className: "i-travel" },
  { type: "o", name: "objects", className: "i-objects" },
  { type: "f", name: "flags", className: "i-flags" }
];

const fuseName = new Fuse(EmojiList, {
  shouldSort: true,
  threshold: 0.1,
  location: 0,
  distance: 100,
  maxPatternLength: 32,
  minMatchCharLength: 1,
  keys: ["shortname"]
});

const fuseCategory = new Fuse(EmojiList, {
  shouldSort: true,
  matchAllTokens: true,
  threshold: 0.3,
  location: 0,
  distance: 100,
  maxPatternLength: 32,
  minMatchCharLength: 3,
  keys: ["category"]
});

const Panel = styled.div`
  width: 290px;
  height: 328px;
  display: flex;
  flex-direction: column;
  color: var(--panel-text-color);
  font-size: var(--panel-text-size);
  font-weight: var(--panel-text-weight);
  box-shadow: 0px 12px 28px var(--menu-shadow-color);
  background-color: transparent;
  border-radius: 6px;

  &:focus-within {
    pointer-events: auto;
  }
`;

const Toolbar = styled.div`
  width: 100%;
  height: 90px;
  flex-direction: column;
  justify-content: center;
  background-color: var(--panel-background-color);
  padding: 0px;
  border-radius: 6px 6px 0 0;
`;

const Tabs = styled.div`
  width: 100%;
  height: 32px;
  padding: 7px 7px 2px 8px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const Filter = styled.button`
  width: 30px;
  height: 30px;
  background-color: transparent;
  appearance: none;
  -webkit-appearance: none;
  online-style: none;
  border: 0;
  border-radius: 2px;

  &:hover {
    background-color: var(--panel-item-hover-background-color);
  }

  &:active {
    background-color: var(--panel-item-active-background-color);
  }

  &.active {
    background-color: var(--panel-item-active-background-color);
  }

  &.active:hover {
    background-color: var(--panel-item-active-background-color);
  }

  &.i-activity {
    content: "";
    height: 25px;
    width: 25px;
    margin: auto;
    background-color: var(--dialog-info-text-color);
    -webkit-mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="25px" height="25px" viewBox="0 0 40 40"><g fill="none" fill-rule="evenodd"><g fill="currentColor"><g transform="translate(7.500000, 7.500000)"><path stroke="%236F6D70" d="M18.02 1.36c5.92 3.02 8.28 10.26 5.26 16.18-2.12 4.17-6.35 6.57-10.73 6.57-1.83 0-3.7-.4-5.45-1.3-5.9-3-8.27-10.22-5.25-16.2C3.97 2.5 8.2.1 12.57.1c1.84 0 3.7.42 5.45 1.3zm4.7 11.44c.1-1.3-.06-2.6-.47-3.87-.13-.38-.27-.75-.43-1.1l-3.42-1.6-1.57-3.4c-.62-.3-1.27-.5-1.92-.68-.7-.18-1.5-.27-2.3-.27-.4 0-.8.02-1.2.06L8.9 4.74l-3.74.43c-.63.68-1.16 1.45-1.6 2.28-.42.84-.72 1.72-.9 2.63l1.84 3.3-.74 3.68c.3.56.66 1.08 1.1 1.58.76.94 1.7 1.7 2.8 2.32l3.7-.74 3.26 1.84c1.13-.23 2.23-.65 3.24-1.26.6-.35 1.2-.77 1.7-1.24l.44-3.74 2.78-2.55.05-.47z" stroke-linecap="round" stroke-linejoin="round"/><polygon points="10.6158689 8.50666885 8.42649168 12.8046921 11.836847 16.2129328 16.1342124 14.0235556 15.3793892 9.26144504"/></g></g></g></svg>');
    mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="25px" height="25px" viewBox="0 0 40 40"><g fill="none" fill-rule="evenodd"><g fill="currentColor"><g transform="translate(7.500000, 7.500000)"><path stroke="%236F6D70" d="M18.02 1.36c5.92 3.02 8.28 10.26 5.26 16.18-2.12 4.17-6.35 6.57-10.73 6.57-1.83 0-3.7-.4-5.45-1.3-5.9-3-8.27-10.22-5.25-16.2C3.97 2.5 8.2.1 12.57.1c1.84 0 3.7.42 5.45 1.3zm4.7 11.44c.1-1.3-.06-2.6-.47-3.87-.13-.38-.27-.75-.43-1.1l-3.42-1.6-1.57-3.4c-.62-.3-1.27-.5-1.92-.68-.7-.18-1.5-.27-2.3-.27-.4 0-.8.02-1.2.06L8.9 4.74l-3.74.43c-.63.68-1.16 1.45-1.6 2.28-.42.84-.72 1.72-.9 2.63l1.84 3.3-.74 3.68c.3.56.66 1.08 1.1 1.58.76.94 1.7 1.7 2.8 2.32l3.7-.74 3.26 1.84c1.13-.23 2.23-.65 3.24-1.26.6-.35 1.2-.77 1.7-1.24l.44-3.74 2.78-2.55.05-.47z" stroke-linecap="round" stroke-linejoin="round"/><polygon points="10.6158689 8.50666885 8.42649168 12.8046921 11.836847 16.2129328 16.1342124 14.0235556 15.3793892 9.26144504"/></g></g></g></svg>');
  }
  &.i-flags {
    content: "";
    height: 25px;
    width: 25px;
    margin: auto;
    background-color: var(--dialog-info-text-color);
    -webkit-mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="25px" height="25px" viewBox="0 0 40 40"><g fill="none" fill-rule="evenodd"><g fill="currentColor" fill-rule="nonzero"><g transform="translate(9.500000, 8.000000)"><path d="M.5 3.13V23.5c0 .83.68 1.5 1.5 1.5.84 0 1.5-.67 1.5-1.5V3.14c0-.83-.66-1.5-1.5-1.5-.82 0-1.5.67-1.5 1.5z"/><path d="M3.5 11.54c.7-.16 1.44-.22 2.25-.17 1.38.07 2.48.3 5.23 1.04l.55.2c3.02.8 4.77 1 5.96.67v-7.9c-1.7.33-3.8-.07-7.1-1-3.9-1.1-5.7-1.3-6.9-.5v7.7zm7.68-10.1c4.1 1.15 5.7 1.3 6.98.44 1-.66 2.33.05 2.33 1.25v11c0 .5-.3 1-.7 1.26-2.2 1.4-4.6 1.2-9.1 0l-.56-.16c-4.54-1.2-6.15-1.3-7.05-.2-.9 1.06-2.65.42-2.65-.98v-11c0-.4.2-.8.5-1.1C3.4-.24 5.75-.1 11.2 1.4z"/></g></g></g></svg>');
    mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="25px" height="25px" viewBox="0 0 40 40"><g fill="none" fill-rule="evenodd"><g fill="currentColor" fill-rule="nonzero"><g transform="translate(9.500000, 8.000000)"><path d="M.5 3.13V23.5c0 .83.68 1.5 1.5 1.5.84 0 1.5-.67 1.5-1.5V3.14c0-.83-.66-1.5-1.5-1.5-.82 0-1.5.67-1.5 1.5z"/><path d="M3.5 11.54c.7-.16 1.44-.22 2.25-.17 1.38.07 2.48.3 5.23 1.04l.55.2c3.02.8 4.77 1 5.96.67v-7.9c-1.7.33-3.8-.07-7.1-1-3.9-1.1-5.7-1.3-6.9-.5v7.7zm7.68-10.1c4.1 1.15 5.7 1.3 6.98.44 1-.66 2.33.05 2.33 1.25v11c0 .5-.3 1-.7 1.26-2.2 1.4-4.6 1.2-9.1 0l-.56-.16c-4.54-1.2-6.15-1.3-7.05-.2-.9 1.06-2.65.42-2.65-.98v-11c0-.4.2-.8.5-1.1C3.4-.24 5.75-.1 11.2 1.4z"/></g></g></g></svg>');
  }
  &.i-food {
    content: "";
    height: 25px;
    width: 25px;
    margin: auto;
    background-color: var(--dialog-info-text-color);
    -webkit-mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="25px" height="25px" viewBox="0 0 40 40"><g fill="none" fill-rule="evenodd"><g fill="currentColor"><path fill-rule="nonzero" d="M9.57 28.2c0 .28.22.5.5.5h19.2c.27 0 .5-.22.5-.5v-4.4H9.57v4.4zm23.2-3.06v3.07c0 1.95-1.57 3.5-3.5 3.5h-19.2c-1.93 0-3.5-1.55-3.5-3.5V25c.46.15.96.24 1.47.24h23.78c.33 0 .64-.04.94-.1z"/><path fill-rule="nonzero" d="M6.57 18.2v-3.45c0-3.56 2.9-6.45 6.45-6.45h13.3c3.55 0 6.44 2.9 6.44 6.45v3.45H6.56zm3-1.83h3.6l.4.86c.23.5.73.83 1.3.83.56 0 1.06-.33 1.3-.83l.4-.86h13.2v-1.62c0-1.9-1.56-3.45-3.45-3.45h-13.3c-1.9 0-3.45 1.55-3.45 3.45v1.62z"/><path fill-rule="nonzero" d="M13.23 16.37l.4.86c.24.5.74.83 1.3.83.57 0 1.07-.33 1.3-.83l.4-.86H31.9c2.44 0 4.43 1.98 4.43 4.43 0 2.45-1.98 4.44-4.44 4.44H8.1c-2.44 0-4.43-2-4.43-4.44 0-2.45 1.98-4.43 4.44-4.43h5.14zm-5.12 3c-.8 0-1.42.64-1.42 1.43 0 .8.64 1.44 1.44 1.44h23.8c.8 0 1.43-.64 1.43-1.44 0-.8-.64-1.43-1.44-1.43H18.4c-.83 1.04-2.1 1.7-3.5 1.7-1.37 0-2.65-.66-3.47-1.7H8.1z"/><circle cx="14.6682646" cy="13.75" r="1"/><circle cx="24.6682646" cy="13.75" r="1"/><circle cx="19.6682646" cy="13.75" r="1"/></g></g></svg>');
    mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="25px" height="25px" viewBox="0 0 40 40"><g fill="none" fill-rule="evenodd"><g fill="currentColor"><path fill-rule="nonzero" d="M9.57 28.2c0 .28.22.5.5.5h19.2c.27 0 .5-.22.5-.5v-4.4H9.57v4.4zm23.2-3.06v3.07c0 1.95-1.57 3.5-3.5 3.5h-19.2c-1.93 0-3.5-1.55-3.5-3.5V25c.46.15.96.24 1.47.24h23.78c.33 0 .64-.04.94-.1z"/><path fill-rule="nonzero" d="M6.57 18.2v-3.45c0-3.56 2.9-6.45 6.45-6.45h13.3c3.55 0 6.44 2.9 6.44 6.45v3.45H6.56zm3-1.83h3.6l.4.86c.23.5.73.83 1.3.83.56 0 1.06-.33 1.3-.83l.4-.86h13.2v-1.62c0-1.9-1.56-3.45-3.45-3.45h-13.3c-1.9 0-3.45 1.55-3.45 3.45v1.62z"/><path fill-rule="nonzero" d="M13.23 16.37l.4.86c.24.5.74.83 1.3.83.57 0 1.07-.33 1.3-.83l.4-.86H31.9c2.44 0 4.43 1.98 4.43 4.43 0 2.45-1.98 4.44-4.44 4.44H8.1c-2.44 0-4.43-2-4.43-4.44 0-2.45 1.98-4.43 4.44-4.43h5.14zm-5.12 3c-.8 0-1.42.64-1.42 1.43 0 .8.64 1.44 1.44 1.44h23.8c.8 0 1.43-.64 1.43-1.44 0-.8-.64-1.43-1.44-1.43H18.4c-.83 1.04-2.1 1.7-3.5 1.7-1.37 0-2.65-.66-3.47-1.7H8.1z"/><circle cx="14.6682646" cy="13.75" r="1"/><circle cx="24.6682646" cy="13.75" r="1"/><circle cx="19.6682646" cy="13.75" r="1"/></g></g></svg>');
  }
  &.i-nature {
    content: "";
    height: 25px;
    width: 25px;
    margin: auto;
    background-color: var(--dialog-info-text-color);
    -webkit-mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="25px" height="25px" viewBox="0 0 40 40"><g fill="none" fill-rule="evenodd"><g fill="currentColor" fill-rule="nonzero"><path d="M15.96 18.26L30.86 32c.5.46 1.3.43 1.77-.08.46-.5.43-1.3-.08-1.76l-14.9-13.74c-.5-.46-1.3-.43-1.76.08-.5.5-.5 1.3 0 1.76z"/><path d="M18.17 21.28c-.7-.06-1.3.45-1.35 1.14-.06.7.45 1.3 1.13 1.35l4.96.43c.9.07 1.5-.66 1.4-1.47l-1-5.6c-.1-.7-.74-1.14-1.42-1.02-.67.2-1.12.8-1 1.5l.7 4-3.32-.3z"/><path d="M28.48 28.95c-.38.17-1 .4-1.85.64-2.92.7-6 .9-8.95-.2-5.98-2.17-9.8-8.5-10.54-19.9l-.1-1.4 1.38-.2c14.45-2.08 23.4 7.4 21.33 19.85l-1.9-.3.63 1.43zM10.24 10.77C11.12 20.14 14.2 25 18.7 26.6c2.27.83 4.76.74 7.14.1.4-.12.76-.23 1.07-.35 1.2-9.6-5.4-16.57-16.6-15.58z"/></g></g></svg>');
    mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="25px" height="25px" viewBox="0 0 40 40"><g fill="none" fill-rule="evenodd"><g fill="currentColor" fill-rule="nonzero"><path d="M15.96 18.26L30.86 32c.5.46 1.3.43 1.77-.08.46-.5.43-1.3-.08-1.76l-14.9-13.74c-.5-.46-1.3-.43-1.76.08-.5.5-.5 1.3 0 1.76z"/><path d="M18.17 21.28c-.7-.06-1.3.45-1.35 1.14-.06.7.45 1.3 1.13 1.35l4.96.43c.9.07 1.5-.66 1.4-1.47l-1-5.6c-.1-.7-.74-1.14-1.42-1.02-.67.2-1.12.8-1 1.5l.7 4-3.32-.3z"/><path d="M28.48 28.95c-.38.17-1 .4-1.85.64-2.92.7-6 .9-8.95-.2-5.98-2.17-9.8-8.5-10.54-19.9l-.1-1.4 1.38-.2c14.45-2.08 23.4 7.4 21.33 19.85l-1.9-.3.63 1.43zM10.24 10.77C11.12 20.14 14.2 25 18.7 26.6c2.27.83 4.76.74 7.14.1.4-.12.76-.23 1.07-.35 1.2-9.6-5.4-16.57-16.6-15.58z"/></g></g></svg>');
  }
  &.i-objects {
    content: "";
    height: 25px;
    width: 25px;
    margin: auto;
    background-color: var(--dialog-info-text-color);
    -webkit-mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="25px" height="25px" viewBox="0 0 40 40"><g fill="none" fill-rule="evenodd"><g fill="currentColor" fill-rule="nonzero"><path d="M11.04 16.7c0-4.85 4.02-8.76 8.96-8.76 4.94 0 8.96 3.9 8.96 8.76 0 2.54-1.12 4.9-3 6.54v1.87c0 1.28-1.02 2.27-2.26 2.27h-7.37c-1.23 0-2.25-1-2.25-2.22V23.3c-1.9-1.65-3.04-4-3.04-6.58zm11.9 5.82c0-.48.24-.93.63-1.22 1.5-1.08 2.4-2.77 2.4-4.6 0-3.17-2.67-5.76-5.97-5.76s-5.96 2.6-5.96 5.76c0 1.84.9 3.54 2.42 4.62.4.28.62.74.62 1.22v1.8h5.87V22.5z"/><path d="M21.76 28.78c-.22.05-.42.1-.62.13-.5.1-.9.2-1.1.2-.24 0-.62-.04-1.08-.12l-.74-.15-.08-.02v-2.93c0-.83-.68-1.5-1.5-1.5-.83 0-1.5.67-1.5 1.5v4.1c0 .68.44 1.27 1.1 1.45l.38.1.94.23c.3.1.6.15.87.2.62.1 1.16.17 1.6.17.47 0 1.03-.1 1.7-.2l.7-.17.95-.22c.18-.03.32-.1.4-.1.64-.2 1.08-.76 1.08-1.43v-4.1c0-.83-.67-1.5-1.5-1.5-.82 0-1.5.67-1.5 1.5v2.9c-.03 0-.07 0-.1.02z"/></g></g></svg>');
    mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="25px" height="25px" viewBox="0 0 40 40"><g fill="none" fill-rule="evenodd"><g fill="currentColor" fill-rule="nonzero"><path d="M11.04 16.7c0-4.85 4.02-8.76 8.96-8.76 4.94 0 8.96 3.9 8.96 8.76 0 2.54-1.12 4.9-3 6.54v1.87c0 1.28-1.02 2.27-2.26 2.27h-7.37c-1.23 0-2.25-1-2.25-2.22V23.3c-1.9-1.65-3.04-4-3.04-6.58zm11.9 5.82c0-.48.24-.93.63-1.22 1.5-1.08 2.4-2.77 2.4-4.6 0-3.17-2.67-5.76-5.97-5.76s-5.96 2.6-5.96 5.76c0 1.84.9 3.54 2.42 4.62.4.28.62.74.62 1.22v1.8h5.87V22.5z"/><path d="M21.76 28.78c-.22.05-.42.1-.62.13-.5.1-.9.2-1.1.2-.24 0-.62-.04-1.08-.12l-.74-.15-.08-.02v-2.93c0-.83-.68-1.5-1.5-1.5-.83 0-1.5.67-1.5 1.5v4.1c0 .68.44 1.27 1.1 1.45l.38.1.94.23c.3.1.6.15.87.2.62.1 1.16.17 1.6.17.47 0 1.03-.1 1.7-.2l.7-.17.95-.22c.18-.03.32-.1.4-.1.64-.2 1.08-.76 1.08-1.43v-4.1c0-.83-.67-1.5-1.5-1.5-.82 0-1.5.67-1.5 1.5v2.9c-.03 0-.07 0-.1.02z"/></g></g></svg>');
  }
  &.i-people {
    content: "";
    height: 25px;
    width: 25px;
    margin: auto;
    background-color: var(--dialog-info-text-color);
    -webkit-mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="25px" height="25px" viewBox="0 0 40 40"><g fill="none" fill-rule="evenodd"><g fill="currentColor"><path fill-rule="nonzero" d="M20 34c-7.73 0-14-6.27-14-14S12.27 6 20 6s14 6.27 14 14-6.27 14-14 14zm0-3c6.08 0 11-4.92 11-11S26.08 9 20 9 9 13.92 9 20s4.92 11 11 11z"/><circle cx="15.3474348" cy="16.7705459" r="2.34743481"/><circle cx="24.4703784" cy="16.7705459" r="2.34743481"/><path d="M20 27.9c2.7 0 4.88-2.18 4.88-4.88 0-2.7-9.76-2.7-9.76 0S17.3 27.9 20 27.9z"/></g></g></svg>');
    mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="25px" height="25px" viewBox="0 0 40 40"><g fill="none" fill-rule="evenodd"><g fill="currentColor"><path fill-rule="nonzero" d="M20 34c-7.73 0-14-6.27-14-14S12.27 6 20 6s14 6.27 14 14-6.27 14-14 14zm0-3c6.08 0 11-4.92 11-11S26.08 9 20 9 9 13.92 9 20s4.92 11 11 11z"/><circle cx="15.3474348" cy="16.7705459" r="2.34743481"/><circle cx="24.4703784" cy="16.7705459" r="2.34743481"/><path d="M20 27.9c2.7 0 4.88-2.18 4.88-4.88 0-2.7-9.76-2.7-9.76 0S17.3 27.9 20 27.9z"/></g></g></svg>');
  }
  &.i-symbols {
    content: "";
    height: 25px;
    width: 25px;
    margin: auto;
    background-color: var(--dialog-info-text-color);
    -webkit-mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="25px" height="25px" viewBox="0 0 40 40"><g fill="none" fill-rule="evenodd"><g fill="currentColor" fill-rule="nonzero"><path d="M15.37 7.95c-4.48 0-8.06 3.9-8.06 8.64 0 3.5 2.2 6.9 5.8 10.3 1.2 1.1 2.5 2.2 3.9 3.1.84.6 1.5 1 1.98 1.3l.27.15.8.5 1.1-.6c.5-.27 1.18-.7 2-1.25 1.34-.9 2.66-1.9 3.9-3 3.57-3.28 5.75-6.8 5.75-10.6 0-4.74-3.6-8.65-8.1-8.65v3.3c2.6 0 4.76 2.4 4.76 5.35 0 2.65-1.72 5.43-4.7 8.13-1.1 1-2.27 1.9-3.5 2.7-.43.3-.83.54-1.17.74-.35-.2-.76-.5-1.2-.83-1.24-.87-2.4-1.83-3.54-2.87-2.95-2.76-4.7-5.5-4.7-7.9 0-2.98 2.2-5.35 4.78-5.35 1.3 0 2.5.6 3.4 1.6L20 14.3l1.25-1.43c.9-1.03 2.1-1.6 3.38-1.6v-3.3c-1.68 0-3.3.56-4.63 1.57-1.34-1-2.95-1.57-4.63-1.57z"/></g></g></svg>');
    mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="25px" height="25px" viewBox="0 0 40 40"><g fill="none" fill-rule="evenodd"><g fill="currentColor" fill-rule="nonzero"><path d="M15.37 7.95c-4.48 0-8.06 3.9-8.06 8.64 0 3.5 2.2 6.9 5.8 10.3 1.2 1.1 2.5 2.2 3.9 3.1.84.6 1.5 1 1.98 1.3l.27.15.8.5 1.1-.6c.5-.27 1.18-.7 2-1.25 1.34-.9 2.66-1.9 3.9-3 3.57-3.28 5.75-6.8 5.75-10.6 0-4.74-3.6-8.65-8.1-8.65v3.3c2.6 0 4.76 2.4 4.76 5.35 0 2.65-1.72 5.43-4.7 8.13-1.1 1-2.27 1.9-3.5 2.7-.43.3-.83.54-1.17.74-.35-.2-.76-.5-1.2-.83-1.24-.87-2.4-1.83-3.54-2.87-2.95-2.76-4.7-5.5-4.7-7.9 0-2.98 2.2-5.35 4.78-5.35 1.3 0 2.5.6 3.4 1.6L20 14.3l1.25-1.43c.9-1.03 2.1-1.6 3.38-1.6v-3.3c-1.68 0-3.3.56-4.63 1.57-1.34-1-2.95-1.57-4.63-1.57z"/></g></g></svg>');
  }
  &.i-travel {
    content: "";
    height: 25px;
    width: 25px;
    margin: auto;
    background-color: var(--dialog-info-text-color);
    -webkit-mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="25px" height="25px" viewBox="0 0 40 40"><g fill="none" fill-rule="evenodd"><g fill="currentColor" fill-rule="nonzero"><path d="M25.46 11.2s-2.67 2.58-3.94 3.95l-10.6-2.13c-.12-.02-.25.04-.3.15l-.8 1.6c-.07.13 0 .3.12.37l7.75 3.88L13.4 24c-.5-.16-1.1-.33-1.66-.3-.3 0-.6.06-.85.25-.3.2-.4.5-.4.9s.1.74.3.98l3.2 3.23c.3.23.7.34 1 .34.4 0 .7-.13.9-.37.2-.23.24-.53.25-.84 0-.6-.15-1.2-.3-1.7l4.97-4.3 3.9 7.76c.06.13.23.2.36.12l1.6-.8c.13-.07.2-.2.17-.3l-2.12-10.6c1.4-1.28 3.95-3.95 3.96-3.96.86-.88 1.4-1.93 1.4-2.87 0-.5-.17-1-.5-1.33-.37-.36-.87-.5-1.38-.5-.95 0-2 .52-2.88 1.4zm2.87-4.4c1.28 0 2.54.44 3.5 1.4.93.93 1.38 2.2 1.38 3.47 0 1.8-.8 3.54-2.2 4.94-.4.5-1.7 1.8-2.8 2.9l1.8 9c.3 1.5-.4 2.9-1.7 3.6l-1.62.8c-1.62.8-3.6.1-4.36-1.4L20 27.1l-.7.6v.62c-.03.92-.28 1.8-.92 2.6-.8 1-1.98 1.5-3.22 1.5-1.03 0-2.12-.37-2.96-1.1l-.16-.14-3.22-3.22-.1-.12c-.75-.83-1.12-1.9-1.12-3 0-1.24.5-2.43 1.48-3.22.8-.6 1.68-.9 2.62-.9h.62l.6-.7-4.27-2.1c-1.65-.8-2.33-2.8-1.52-4.4l.8-1.64c.67-1.3 2.14-2.02 3.57-1.73l9 1.8 1.36-1.33 1.5-1.48c1.42-1.4 3.17-2.27 4.97-2.27z"/></g></g></svg>');
    mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="25px" height="25px" viewBox="0 0 40 40"><g fill="none" fill-rule="evenodd"><g fill="currentColor" fill-rule="nonzero"><path d="M25.46 11.2s-2.67 2.58-3.94 3.95l-10.6-2.13c-.12-.02-.25.04-.3.15l-.8 1.6c-.07.13 0 .3.12.37l7.75 3.88L13.4 24c-.5-.16-1.1-.33-1.66-.3-.3 0-.6.06-.85.25-.3.2-.4.5-.4.9s.1.74.3.98l3.2 3.23c.3.23.7.34 1 .34.4 0 .7-.13.9-.37.2-.23.24-.53.25-.84 0-.6-.15-1.2-.3-1.7l4.97-4.3 3.9 7.76c.06.13.23.2.36.12l1.6-.8c.13-.07.2-.2.17-.3l-2.12-10.6c1.4-1.28 3.95-3.95 3.96-3.96.86-.88 1.4-1.93 1.4-2.87 0-.5-.17-1-.5-1.33-.37-.36-.87-.5-1.38-.5-.95 0-2 .52-2.88 1.4zm2.87-4.4c1.28 0 2.54.44 3.5 1.4.93.93 1.38 2.2 1.38 3.47 0 1.8-.8 3.54-2.2 4.94-.4.5-1.7 1.8-2.8 2.9l1.8 9c.3 1.5-.4 2.9-1.7 3.6l-1.62.8c-1.62.8-3.6.1-4.36-1.4L20 27.1l-.7.6v.62c-.03.92-.28 1.8-.92 2.6-.8 1-1.98 1.5-3.22 1.5-1.03 0-2.12-.37-2.96-1.1l-.16-.14-3.22-3.22-.1-.12c-.75-.83-1.12-1.9-1.12-3 0-1.24.5-2.43 1.48-3.22.8-.6 1.68-.9 2.62-.9h.62l.6-.7-4.27-2.1c-1.65-.8-2.33-2.8-1.52-4.4l.8-1.64c.67-1.3 2.14-2.02 3.57-1.73l9 1.8 1.36-1.33 1.5-1.48c1.42-1.4 3.17-2.27 4.97-2.27z"/></g></g></svg>');
  }
`;

const Search = styled.div`
  width: 100%;
  height: 42px;
  padding: 8px;
`;

const Emojis = styled.div`
  width: 100%;
  height: 220px;
  max-height: 220px;
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  grid-auto-rows: 30px;
  box-shadow: inset 0 0 2px var(--menu-background-color);
  background: var(--text-input-background-color);
  padding: 4px;
  box-sizing: border-box;
  overflow-y: scroll;

  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
    visibility: hidden;
  }

  &::-webkit-scrollbar-corner {
    background-color: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-clip: padding-box;
    border: 2px solid transparent;
    border-radius: 4px;
    background-color: transparent;
    transition: background-color 0.25s;
    min-height: 40px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: #aaa;
    transition: background-color 0.25s;
  }

  &::-webkit-scrollbar-track {
    border-color: transparent;
    background-color: transparent;
    border: 2px solid transparent;
    visibility: hidden;
  }
`;

const EmojiContainer = styled.button`
  width: 30px;
  height: 30px;
  margin: 2px;
  display: inline;
  vertical-align: baseline;
  line-height: 28px;
  font-size: 20px;
  font-family: Helvetica, Arial, sans-serif;
  text-align: center;
  overflow: hidden;
  appearance: none;
  -webkit-appearance: none;
  online-style: none;
  background-color: transparent;
  margin: 2px;
  border-radius: 4px;
  border: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: var(--canvas-overlay-item-hover-background-color);
  }

  &:active {
    background-color: var(--canvas-overlay-item-active-background-color);
  }

  &.active {
    background-color: var(--canvas-overlay-item-active-background-color);
  }
`;

const Emoji = styled.img`
  width: 26px;
  height: 26px;
  overflow: hidden;
  background-color: transparent;
`;

const Footer = styled.div`
  width: 100%;
  height: 50px;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  background-color: var(--panel-background-color);
  padding: 0px 6px;
  border-radius: 0 0 6px 6px;
`;

const FooterEmoji = styled.img`
  width: 26px;
  height: 26px;
  margin: 2px;
  box-sizing: border-box;
  display: inline;
  vertical-align: baseline;
  line-height: 28px;
  font-size: 20px;
  font-family: Helvetica, Arial, sans-serif;
  text-align: center;
  background: transparent;
`;

const FooterLabel = styled.div`
  color: var(--panel-text-color);
  line-height: calc(var(--panel-header-text-size) + 4px);
  font-size: var(--panel-header-text-size);
  font-weight: var(--panel-header-text-weight);
  margin-left: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const FooterAttribution = styled.div`
  font-size: calc(var(--panel-header-text-size) - 4px);

  a {
    text-decoration: underline;
    font-weight: bold;
  }
`;

const EmojiPicker = forwardRef(({ onEmojiSelected, loadEmojiGrid }, ref) => {
  const defaultPlaceholder = getMessages()["emoji.placeholder"];

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("p");
  const [placeholder, setPlaceholder] = useState(defaultPlaceholder);
  const [currentEmoji, setCurrentEmoji] = useState(null);
  const [emojis, setEmojis] = useState([]);
  const emojisRef = useRef();

  useEffect(
    () => {
      // Run query and update selection
      const q = query.trim();
      const fuse = q.length > 0 ? fuseName : fuseCategory;
      const emojis = fuse.search(fuse === fuseName ? q : category);
      emojis.sort(emojiSort);
      setEmojis(emojis);

      if (emojis.length > 0) {
        const { item } = emojis[0];
        setCurrentEmoji({ ...item, index: 0, scroll: true });
        setPlaceholder(item.shortname);
      }
    },
    [query, category]
  );

  useEffect(
    () => {
      if (emojisRef && emojisRef.current) {
        // Scroll to visible emoji
        const el = emojisRef.current.querySelector(".active");

        if (el && currentEmoji && currentEmoji.scroll) {
          scrollIntoView(el, { scrollMode: "if-needed" });
        }
      }
    },
    [emojisRef, currentEmoji]
  );

  useRefFocusResetter(
    ref,
    useCallback(
      () => {
        setQuery("");
        setCurrentEmoji(null);
        setCategory("p");
        setPlaceholder(defaultPlaceholder);
      },
      [setQuery, setCurrentEmoji, setCategory, setPlaceholder, defaultPlaceholder]
    )
  );

  return (
    <Panel>
      <Toolbar>
        <Search>
          <FloatingTextWrap>
            <form
              onSubmit={e => {
                e.preventDefault();
                e.stopPropagation();
                DOM_ROOT.activeElement?.blur(); // This causes this element to hide via CSS

                if (currentEmoji) {
                  onEmojiSelected(currentEmoji);
                }
              }}
            >
              <FloatingTextElement
                type="text"
                tabIndex={-1}
                value={query}
                onKeyDown={e => {
                  let delta = 0;

                  switch (e.key) {
                    case "ArrowLeft":
                      delta = -1;
                      break;
                    case "ArrowRight":
                      delta = 1;
                      break;
                    case "ArrowDown":
                      delta = 8;
                      break;
                    case "ArrowUp":
                      delta = -8;
                      break;
                  }

                  if (delta === 0) return;

                  if (currentEmoji) {
                    const index = currentEmoji.index + delta;

                    if (index >= 0 && index <= emojis.length - 1) {
                      setCurrentEmoji({ ...emojis[index].item, index, scroll: true });
                    }
                  }
                }}
                placeholder={placeholder}
                ref={ref}
                onFocus={e => handleTextFieldFocus(e.target)}
                onBlur={e => {
                  handleTextFieldBlur(e.target);
                }}
                onChange={e => {
                  const query = e.target.value;
                  setQuery(query);
                }}
              />
            </form>
          </FloatingTextWrap>
        </Search>
        <Tabs>
          {CATEGORIES.map(({ type, className }) => (
            <Filter key={type} className={category === type ? "active" : ""} onClick={() => setCategory(type)}>
              <div className={className} />
            </Filter>
          ))}
        </Tabs>
      </Toolbar>
      {loadEmojiGrid && (
        <Emojis ref={emojisRef}>
          {emojis.map(({ item }, index) => (
            <EmojiContainer
              key={item.shortname}
              className={currentEmoji && currentEmoji.name === item.name ? "active" : ""}
            >
              <Emoji
                src={imageUrlForUnicodeEmoji(item.unicode)}
                onClick={() => {
                  onEmojiSelected(item);
                  DOM_ROOT.activeElement?.blur();
                }}
                onMouseEnter={() => {
                  setPlaceholder(item.shortname);
                  setCurrentEmoji({ ...item, index });
                }}
                onMouseLeave={() => {
                  setPlaceholder(defaultPlaceholder);
                  setCurrentEmoji(null);
                }}
              />
            </EmojiContainer>
          ))}
        </Emojis>
      )}
      <Footer>
        {currentEmoji && <FooterEmoji src={imageUrlForUnicodeEmoji(currentEmoji.unicode)} />}
        <FooterLabel className={currentEmoji && `.emoji-${currentEmoji.name}`}>
          {currentEmoji && currentEmoji.shortname}
          {!currentEmoji && (
            <FooterAttribution>
              Emojis by{" "}
              <a href="https://mutant.tech/" rel="noreferrer" target="_blank">
                Dzuk
              </a>{" "}
              &amp;{" "}
              <a href="https://twemoji.twitter.com/" rel="noreferrer" target="_blank">
                Twitter
              </a>
            </FooterAttribution>
          )}
        </FooterLabel>
      </Footer>
    </Panel>
  );
});

EmojiPicker.displayName = "EmojiPicker";

EmojiPicker.propTypes = {
  onEmojiSelected: PropTypes.func,
  loadEmojiGrid: PropTypes.bool
};

export default EmojiPicker;
