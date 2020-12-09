import React, { useState, useEffect } from "react";
import ChatLog from "./chat-log";

let c = 0;

const pushMessage = (messages, setMessages) => {
  c++;
  const newMessages = [...messages, { body: `Next Message ${c}`, posted_at: performance.now() }];
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
