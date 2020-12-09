import React, { useState } from "react";
import ChatLog from "./chat-log";

export const ChatLogAdd = () => {
  const [messages, setMessages] = useState([{ body: "First Message" }]);

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
        onClick={() => {
          const newMessages = [...messages, { body: "Next Message" }];
          setMessages(newMessages);
        }}
      >
        Add
      </button>
    </div>
  );
};

export default {
  title: "Chat Log"
};
