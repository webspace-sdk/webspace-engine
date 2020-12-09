import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import ReactCSSTransitionGroup from "react-addons-css-transition-group";

const ChatLogElement = styled.div`
  background-color: red;
  height: 200px;
  position: relative;
  overflow: hidden;
`;

const ChatLogMessage = styled.div`
  background-color: green;
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

const MESSAGE_HEIGHT = 32;

const messageToEl = (message, idx) => {
  return (
    <ChatLogMessage
      className="chat-log-message"
      style={{ bottom: `${idx * MESSAGE_HEIGHT}px` }}
      key={message.posted_at}
    >
      {message.body}
    </ChatLogMessage>
  );
};

export default function ChatLog({ messages }) {
  const ref = React.createRef();

  const messageComponents = [];

  for (let i = messages.length - 1; i >= 0; i--) {
    messageComponents.push(messageToEl(messages[i], messages.length - i));
  }

  return (
    <ChatLogElement ref={ref}>
      <ReactCSSTransitionGroup transitionName="appear" transitionEnterTimeout={1} transitionLeaveTimeout={1}>
        {messageComponents}
      </ReactCSSTransitionGroup>
    </ChatLogElement>
  );
}

ChatLog.propTypes = {
  messages: PropTypes.array
};
