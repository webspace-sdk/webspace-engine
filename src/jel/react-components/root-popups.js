import React, { useState, useCallback, useEffect, useRef } from "react";
import { usePopupPopper } from "../utils/popup-utils";
import PropTypes from "prop-types";
import CreateEmbedPopup from "./create-embed-popup";
import ChatInputPopup from "./chat-input-popup";

function RootPopups({ scene, centerPopupRef }) {
  const { hubChannel } = window.APP;

  const chatInputFocusRef = useRef();
  const createEmbedFocusRef = useRef();
  const [createEmbedType, setCreateEmbedType] = useState("image");

  const {
    styles: chatInputPopupStyles,
    attributes: chatInputPopupAttributes,
    show: showChatInputPopup,
    setPopup: setChatInputPopupElement
  } = usePopupPopper(chatInputFocusRef, "top", [0, 8]);

  const {
    styles: createEmbedPopupStyles,
    attributes: createEmbedPopupAttributes,
    show: showCreateEmbedPopup,
    setPopup: setCreateEmbedPopupElement
  } = usePopupPopper(createEmbedFocusRef, "bottom", [0, 8]);

  // Handle embed popup trigger
  useEffect(
    () => {
      const handleCreateEmbed = e => {
        setCreateEmbedType(e.detail);
        showCreateEmbedPopup(centerPopupRef);
      };

      scene && scene.addEventListener("action_show_create_embed", handleCreateEmbed);
      return () => scene && scene.removeEventListener("action_show_create_embed", handleCreateEmbed);
    },
    [scene, centerPopupRef, showCreateEmbedPopup]
  );

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
      <CreateEmbedPopup
        setPopperElement={setCreateEmbedPopupElement}
        styles={createEmbedPopupStyles}
        attributes={createEmbedPopupAttributes}
        embedType={createEmbedType}
        ref={createEmbedFocusRef}
        onURLEntered={useCallback(url => scene.emit("add_media", url), [scene])}
      />
    </div>
  );
}

RootPopups.propTypes = {
  scene: PropTypes.object,
  centerPopupRef: PropTypes.object
};

export default RootPopups;
