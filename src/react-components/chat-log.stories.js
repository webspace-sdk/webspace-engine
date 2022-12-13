import React, {useEffect, useState} from "react";
import ChatLog from "./chat-log";

let c = 0;
const MAX_ENTRIES = 10;
const STOP_AFTER_ENTRIES = 100;

const pushMessage = (entries, setEntries) => {
  if (c >= STOP_AFTER_ENTRIES) return;
  c++;
  let entry;

  if (Math.random() < 0.1) {
    entry = { name: "Another Person With Long Name", type: "join", posted_at: performance.now() };
  } else if (Math.random() < 0.1) {
    entry = { name: "Some Person", type: "leave", posted_at: performance.now() };
  } else {
    const newMessage =
      Math.random() < 0.3
        ? `Next Message ${c}`
        : Math.random() < 0.3
          ? `Next Message this is very long very very on the second part. Testing wrap and overflow ${c}`
          : `Multi\nLine\nMessage Hello! ${c}`;

    entry = { name: "New Member", body: newMessage, type: "chat", posted_at: performance.now() };
  }

  let newEntries = [...entries, entry];

  if (newEntries.length >= MAX_ENTRIES) {
    newEntries = newEntries.slice(newEntries.length - MAX_ENTRIES);
  }

  setEntries(newEntries);
};

export const ChatLogAdd = () => {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => pushMessage(entries, setEntries), Math.floor(Math.random() * 1500));
    return () => clearInterval(interval);
  });

  return (
    <div
      style={{
        background: "linear-gradient(177deg, rgba(2,59,85,1) 0%, rgba(16,160,170,1) 10%, rgba(0,212,255,1) 100%)",
        display: "flex",
        width: "800px",
        height: "600px",
        marginTop: "32px",
        flexDirection: "column"
      }}
    >
      <ChatLog entries={entries} store={window.APP.store} />
      <button
        style={{ position: "fixed", left: "48px", top: "400px", width: "150px" }}
        onClick={() => pushMessage(entries, setEntries)}
      >
        Add
      </button>
    </div>
  );
};

export default {
  title: "Chat Log"
};
