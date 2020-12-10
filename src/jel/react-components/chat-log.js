import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";
import styled from "styled-components";
import ReactCSSTransitionGroup from "react-addons-css-transition-group";

const ChatLogElement = styled.div`
  height: 250px;
  position: relative;
  overflow: hidden;
  mask-image: linear-gradient(to top, rgba(0, 0, 0, 1), 80%, transparent);
  width: 33%;
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

  background-color: var(--canvas-overlay-item-hover-background-color);
  max-width: 100%;

  position: absolute;
  left: 0;
  bottom: 0;
  transition: transform 0.2s cubic-bezier(0.76, -0.005, 0.515, 1.75), opacity 0.4s linear,
    bottom 0.2s cubic-bezier(0.76, -0.005, 0.515, 1.25);

  &.appear-enter {
    opacity: 0;
    transform: translateY(0px) scale(0.5, 0.5);
  }

  &.appear-leave {
    opacity: 1;
    transform: translateY(0px) scale(1, 1);
  }
`;

const MESSAGE_MARGIN = 4;

const entryToEl = ({ body, type, posted_at, name }) => {
  if (type === "message") {
    return (
      <ChatLogLine className="chat-log-entry" key={posted_at}>
        <b>{name}</b>:&nbsp;{body}
      </ChatLogLine>
    );
  } else if (type === "join" || type === "leave") {
    return (
      <ChatLogLine className="chat-log-entry" key={posted_at}>
        <b>{name}</b>&nbsp;<FormattedMessage id={`chat-log.${type}`} />
      </ChatLogLine>
    );
  }
};

export default function ChatLog({ entries }) {
  const ref = React.createRef();

  const entryComponents = [];

  for (let i = entries.length - 1; i >= 0; i--) {
    entryComponents.push(entryToEl(entries[i]));
  }

  useEffect(
    () => {
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

      return () => {};
    },
    [ref]
  );

  return (
    <ChatLogElement ref={ref}>
      <ReactCSSTransitionGroup transitionName="appear" transitionEnterTimeout={1} transitionLeaveTimeout={1}>
        {entryComponents}
      </ReactCSSTransitionGroup>

      <ChatLogLine id="chat-message-measure" style={{ visibility: "hidden" }} />
    </ChatLogElement>
  );
}

ChatLog.propTypes = {
  entries: PropTypes.array
};
