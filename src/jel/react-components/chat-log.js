import React, { useEffect } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import ReactCSSTransitionGroup from "react-addons-css-transition-group";

const ChatLogElement = styled.div`
  position: relative;
  overflow: hidden;
  mask-image: linear-gradient(to top, rgba(0, 0, 0, 1), 80%, transparent);
  margin-top: 40px;
`;

const ChatLogMessage = styled.div`
  color: var(--canvas-overlay-text-color);
  font-size: var(--canvas-overlay-text-size);
  text-shadow: 0px 0px 4px var(--menu-shadow-color);
  padding: 6px 10px;
  white-space: pre;

  background-color: var(--canvas-overlay-item-hover-background-color);

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

const MESSAGE_MARGIN = 8;

const messageToEl = message => {
  return (
    <ChatLogMessage className="chat-log-message" key={message.posted_at}>
      {message.body}
    </ChatLogMessage>
  );
};

export default function ChatLog({ messages }) {
  const ref = React.createRef();

  const messageComponents = [];

  for (let i = messages.length - 1; i >= 0; i--) {
    messageComponents.push(messageToEl(messages[i]));
  }

  useEffect(
    () => {
      if (!ref.current) return;
      const messageEls = ref.current.querySelectorAll(".chat-log-message");
      const measureMessage = ref.current.querySelector("#chat-message-measure");

      let offset = 0;

      for (let i = 0; i < messageEls.length; i++) {
        const el = messageEls[i];
        measureMessage.innerHTML = el.innerHTML;
        const height = measureMessage.offsetHeight + MESSAGE_MARGIN;
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
        {messageComponents}
      </ReactCSSTransitionGroup>

      <ChatLogMessage id="chat-message-measure" style={{ visibility: "hidden" }} />
    </ChatLogElement>
  );
}

ChatLog.propTypes = {
  messages: PropTypes.array
};
