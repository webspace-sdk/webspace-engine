import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";

const ChatLogElement = styled.div`
  background-color: red;
`;

const ChatLogMessage = styled.div`
  background-color: green;
`;

const messageToEl = ({ body }, idx) => {
  console.log(idx);
  return <ChatLogMessage key={idx}>{body}</ChatLogMessage>;
};

export default function ChatLog({ messages }) {
  return <ChatLogElement>{messages.map(messageToEl)}</ChatLogElement>;
}

ChatLog.propTypes = {
  messages: PropTypes.array
};
