import React, { useState, useEffect } from "react";
import ChatLog from "./chat-log";

let c = 0;
const MAX_MESSAGES = 8;

const pushMessage = (messages, setMessages) => {
  c++;
  const newMessage =
    Math.random() < 0.3 ? `Next Message ${c}` : Math.random() < 0.3 ? `Next\nMessage ${c}` : `Next\n\nMessage ${c}`;

  let newMessages = [...messages, { body: newMessage, posted_at: performance.now() }];

  if (newMessages.length >= MAX_MESSAGES) {
    newMessages = newMessages.slice(newMessages.length - MAX_MESSAGES);
  }

  setMessages(newMessages);
};

export const ChatLogAdd = () => {
  const [messages, setMessages] = useState([{ body: "First Message", posted_at: performance.now() }]);

  useEffect(() => {
    const interval = setInterval(() => pushMessage(messages, setMessages), Math.floor(Math.random() * 1500));
    return () => clearInterval(interval);
  });

  return (
    <div
      style={{
        background: "linear-gradient(177deg, rgba(2,0,85,1) 0%, rgba(16,16,170,1) 10%, rgba(0,212,255,1) 100%)",
        display: "flex",
        width: "800px",
        height: "600px",
        marginTop: "32px",
        flexDirection: "column"
      }}
    >
      <ChatLog messages={messages} />
      <button
        style={{ position: "fixed", left: "48px", top: "400px", width: "150px" }}
        onClick={() => pushMessage(messages, setMessages)}
      >
        Add
      </button>
    </div>
  );
};

export default {
  title: "Chat Log"
};
