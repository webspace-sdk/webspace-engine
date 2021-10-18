import React, { useCallback, useEffect, useRef } from "react";
import { usePopupPopper } from "../utils/popup-utils";
import PropTypes from "prop-types";
import ChatInputPopup from "./chat-input-popup";

function RootPopups({ scene, centerPopupRef }) {
  const { hubChannel } = window.APP;

  const chatInputFocusRef = useRef();

  const {
    styles: chatInputPopupStyles,
    attributes: chatInputPopupAttributes,
    show: showChatInputPopup,
    setPopup: setChatInputPopupElement
  } = usePopupPopper(chatInputFocusRef, "top", [0, 8]);

  // Handle chat message hotkey (typically space)
  // Show chat message entry and chat log.
  useEffect(
    () => {
      const handleChatHotkey = () => showChatInputPopup(centerPopupRef);
      scene && scene.addEventListener("action_chat_entry", handleChatHotkey);
      return () => scene && scene.removeEventListener("action_chat_entry", handleChatHotkey);
    },
    [scene, centerPopupRef, showChatInputPopup]
  );

  return (
    <div>
      <ChatInputPopup
        setPopperElement={setChatInputPopupElement}
        styles={chatInputPopupStyles}
        attributes={chatInputPopupAttributes}
        ref={chatInputFocusRef}
        onMessageEntered={useCallback(message => hubChannel.sendMessage(message), [hubChannel])}
        onEntryComplete={useCallback(() => scene.emit("chat_entry_complete"), [scene])}
      />
    </div>
  );
}

RootPopups.propTypes = {
  scene: PropTypes.object,
  centerPopupRef: PropTypes.object
};

export default RootPopups;
