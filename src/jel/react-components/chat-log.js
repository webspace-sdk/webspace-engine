import React, { useEffect, useState, useRef } from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";
import styled from "styled-components";
import Linkify from "react-linkify";
import { toArray as convertToEmojis } from "react-emoji-render";
import { CSSTransition, TransitionGroup } from "react-transition-group";

const CHAT_HIDE_TIMEOUT = 15000;

const ChatLogElement = styled.div`
  height: 250px;
  pointer-events: none;
  position: absolute;
  left: 0;
  bottom: 0;

  .panels-collapsed & {
    bottom: 64px;
  }

  overflow: hidden;
  mask-image: linear-gradient(to top, rgba(0, 0, 0, 1), 80%, transparent);
  width: 50%;
  min-width: 200px;
  margin: 12px;
  transition: transform 0.15s linear, opacity 0.15s linear;

  .paused & {
    visibility: hidden;
  }

  &.hidden {
    opacity: 0;
    transform: translateY(-6px);
  }
`;

const ChatLogLine = styled.div`
  color: var(--canvas-overlay-text-color);
  font-size: var(--canvas-overlay-text-size);
  text-shadow: 0px 0px 4px var(--menu-shadow-color);
  padding: 8px 12px;
  white-space: pre-wrap;
  overflow-wrap: normal;
  border-radius: 4px;
  line-height: calc(var(--canvas-overlay-text-size) + 2px);
  pointer-events: auto;
  user-select: none;

  background-color: var(--canvas-overlay-neutral-item-background-color);
  max-width: 100%;

  position: absolute;
  left: 0;
  bottom: 0;
  transition: transform 0.2s cubic-bezier(0.76, -0.005, 0.515, 1.75), opacity 0.4s linear,
    bottom 0.2s cubic-bezier(0.76, -0.005, 0.515, 1.25);

  a {
    text-decoration: underline;
    color: var(--canvas-overlay-neutral-item-link-color);
  }

  &.appear-enter {
    opacity: 0;
    transform: scale(0.5, 0.5);
  }

  &.appear-exit {
    opacity: 1;
    transform: scale(1, 1);
  }

  & .selectable {
    user-select: text;
  }
`;

// Hacky copy+paste from jel-ui
const UnpausedInfoLabel = styled.div`
  position: absolute;
  bottom: 0px;
  left: 0px;
  display: block;
  color: var(--canvas-overlay-text-color);
  text-shadow: 0px 0px 4px var(--menu-shadow-color);
  line-height: calc(var(--canvas-overlay-tertiary-text-size) + 2px);
  font-weight: var(--canvas-overlay-item-tertiary-weight);
  font-size: var(--canvas-overlay-tertiary-text-size);
  margin: 11px 0 42px 8px;
  padding: 6px 10px;
  white-space: pre;

  .paused & {
    display: none;
  }
`;

const MESSAGE_MARGIN = 6;

const entryToEl = ({ body, type, posted_at, name, oldName, toName }) => {
  if (type === "chat") {
    return (
      <CSSTransition key={posted_at} classNames="appear" timeout={{ enter: 0, exit: 0 }}>
        <ChatLogLine className="chat-log-entry">
          <b>{name}</b>:&nbsp;<span className="selectable">
            <Linkify properties={{ target: "_blank", rel: "noopener referrer" }}>
              {convertToEmojis(body.trim())}
            </Linkify>
          </span>
        </ChatLogLine>
      </CSSTransition>
    );
  } else if (type === "join" || type === "leave") {
    return (
      <CSSTransition key={posted_at} classNames="appear" timeout={{ enter: 0, exit: 0 }}>
        <ChatLogLine className="chat-log-entry" key={posted_at}>
          <b>{name}</b>&nbsp;<FormattedMessage id={`chat-log.${type}`} />
        </ChatLogLine>
      </CSSTransition>
    );
  } else if (type === "display_name_changed") {
    return (
      <CSSTransition key={posted_at} classNames="appear" timeout={{ enter: 0, exit: 0 }}>
        <ChatLogLine className="chat-log-entry" key={posted_at}>
          <b>{oldName}</b>&nbsp;<FormattedMessage id={`chat-log.${type}`} />&nbsp;<b>{name}</b>
          <FormattedMessage id={`chat-log.${type}_end`} />
        </ChatLogLine>
      </CSSTransition>
    );
  } else if (type === "reactji") {
    return (
      <CSSTransition key={posted_at} classNames="appear" timeout={{ enter: 0, exit: 0 }}>
        <ChatLogLine className="chat-log-entry" key={posted_at}>
          <b>{name}</b>&nbsp;{body}
          <FormattedMessage id={`chat-log.reacted`} />&nbsp;<b>{toName}</b>
        </ChatLogLine>
      </CSSTransition>
    );
  }
};

let chatLogHideTimeout;

export default function ChatLog({ scene, hub, store, leftOffset }) {
  const ref = useRef();

  const { hubChannel } = window.APP;
  const [entries, setEntries] = useState([]);
  const [hasChatted, setHasChatted] = useState(store.state.activity.chat);
  const [hasOtherOccupants, setHasOtherOccupants] = useState(NAF.connection?.presence?.states?.size > 1);

  useEffect(
    () => {
      if (!scene) return () => {};

      const handler = () => {
        const newHasOtherOccupants =
          NAF.connection.presence && NAF.connection.presence.states && NAF.connection.presence.states.size > 1;

        if (newHasOtherOccupants !== hasOtherOccupants) {
          setHasOtherOccupants(newHasOtherOccupants);
        }
      };

      scene.addEventListener("presence-synced", handler);
      return () => scene.removeEventListener("presence-synced", handler);
    },
    [scene, hubChannel, hasOtherOccupants]
  );

  useEffect(
    () => {
      const handler = () => {
        setHasChatted(store.state.activity.chat);
      };
      store.addEventListener("statechanged-activity", handler);
      return () => store.removeEventListener("statechanged-activity", handler);
    },
    [store]
  );

  // Chat log entries
  useEffect(
    () => {
      if (!scene) return;

      const handler = ({ detail: newEntry }) => {
        let newEntries = [...entries, newEntry];

        if (newEntries.length >= 10) {
          newEntries = newEntries.slice(newEntries.length - 10);
        }

        setEntries(newEntries);
      };

      scene.addEventListener("chat_log_entry", handler);
      return () => scene.removeEventListener("chat_log_entry", handler);
    },
    [scene, entries, setEntries]
  );

  useEffect(() => setEntries([]), [hub]);

  const entryComponents = [];

  for (let i = entries.length - 1; i >= 0; i--) {
    entryComponents.push(entryToEl(entries[i]));
  }

  let entryHash = 0;

  for (let i = 0; i < entries.length; i++) {
    entryHash += entries[i].posted_at;
  }

  // Deal with mouse events to hide
  useEffect(
    () => {
      if (!scene) return;

      const el = ref && ref.current;
      if (!el) return;

      const resetHide = () => {
        if (chatLogHideTimeout) {
          clearTimeout(chatLogHideTimeout);
        }

        chatLogHideTimeout = null;
        el.classList.remove("hidden");

        chatLogHideTimeout = setTimeout(() => {
          el.classList.add("hidden");
        }, CHAT_HIDE_TIMEOUT);
      };

      resetHide();

      const disableHide = () => {
        clearTimeout(chatLogHideTimeout);
        el.classList.remove("hidden");
      };

      el.addEventListener("mouseenter", disableHide);
      el.addEventListener("mouseleave", resetHide);

      scene.addEventListener("action_chat_entry", disableHide);
      scene.addEventListener("chat_entry_complete", resetHide);

      return () => {
        el.removeEventListener("mouseenter", disableHide);
        el.removeEventListener("mouseleave", resetHide);

        scene.removeEventListener("action_chat_entry", disableHide);
        scene.addEventListener("chat_entry_complete", resetHide);
      };
    },
    [scene, ref, entryHash]
  );

  // Update positions for chat log entries
  useEffect(
    () => {
      const relayout = () => {
        if (!ref.current) return;
        const entryEls = ref.current.querySelectorAll(".chat-log-entry");
        const measureEntry = ref.current.querySelector("#chat-message-measure");

        let offset = 0;

        for (let i = 0; i < entryEls.length; i++) {
          const el = entryEls[i];
          measureEntry.innerHTML = el.innerHTML;
          const height = measureEntry.offsetHeight + MESSAGE_MARGIN;
          const currentOffset = el.getAttribute("data-offset");

          if (currentOffset !== offset) {
            el.setAttribute("data-offset", offset);
            el.setAttribute("style", `bottom: ${offset}px;`);
          }

          offset += height;
        }
      };

      relayout();

      window.addEventListener("resize", relayout);
      window.addEventListener("side_panel_resize_complete", relayout);

      return () => {
        window.removeEventListener("resize", relayout);
        window.removeEventListener("side_panel_resize_complete", relayout);
      };
    },
    [ref, entryHash]
  );

  if (hasOtherOccupants && !hasChatted && entries.filter(({ type }) => type === "chat").length === 0) {
    return (
      <UnpausedInfoLabel>
        <FormattedMessage id="chat.info" />
      </UnpausedInfoLabel>
    );
  }

  return (
    <ChatLogElement ref={ref} style={leftOffset !== undefined ? { left: `${leftOffset}px` } : null}>
      <TransitionGroup>{entryComponents}</TransitionGroup>

      <ChatLogLine id="chat-message-measure" style={{ visibility: "hidden" }} />
    </ChatLogElement>
  );
}

ChatLog.propTypes = {
  scene: PropTypes.object,
  hub: PropTypes.object,
  store: PropTypes.object,
  leftOffset: PropTypes.number
};
