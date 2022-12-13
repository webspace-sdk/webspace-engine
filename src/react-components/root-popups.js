import React, {useCallback, useEffect, useRef, useState} from "react";
import {usePopupPopper} from "../utils/popup-utils";
import PropTypes from "prop-types";
import CreateEmbedPopup from "./create-embed-popup";
import CreateFileObjectPopup from "./create-file-object-popup";
import ChatInputPopup from "./chat-input-popup";
import {SOUND_MEDIA_LOADED} from "../systems/sound-effects-system";
import {endCursorLock} from "../utils/dom-utils";

function RootPopups({ scene, centerPopupRef }) {
  const chatInputFocusRef = useRef();
  const createEmbedFocusRef = useRef();
  const createVoxFocusRef = useRef();

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

  const {
    styles: createVoxStyles,
    attributes: createVoxAttributes,
    show: showCreateVoxPopup,
    setPopup: setCreateVoxPopupElement,
    popupElement: createVoxPopupElement
  } = usePopupPopper(createVoxFocusRef, "bottom", [0, 8]);

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

  useEffect(
    () => {
      const handleCreateVox = () => showCreateVoxPopup(centerPopupRef);
      scene && scene.addEventListener("add_media_vox", handleCreateVox);
      return () => scene && scene.removeEventListener("action_chat_entry", handleCreateVox);
    },
    [scene, centerPopupRef, showCreateVoxPopup]
  );

  return (
    <div>
      <ChatInputPopup
        setPopperElement={setChatInputPopupElement}
        styles={chatInputPopupStyles}
        attributes={chatInputPopupAttributes}
        ref={chatInputFocusRef}
        onMessageEntered={useCallback(message => window.APP.hubChannel.broadcastMessage(message), [])}
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
      <CreateFileObjectPopup
        ref={createVoxFocusRef}
        objectType="vox"
        popperElement={createVoxPopupElement}
        setPopperElement={setCreateVoxPopupElement}
        styles={createVoxStyles}
        fileExtension="svox"
        filePath="assets"
        attributes={createVoxAttributes}
        onCreate={async (name, filename, path) => {
          const { entity } = await SYSTEMS.voxSystem.createVoxInFrontOfPlayer(
            name,
            `${path ? `${path}/` : ``}${filename}`,
            null, // fromVoxId
            false // animate
          );

          await new Promise(res => entity.addEventListener("model-loaded", res, { once: true }));

          SYSTEMS.cameraSystem.inspect(entity.object3D, 3.0, false, true, true);

          // Play sound here, since animated is false
          SYSTEMS.soundEffectsSystem.playSoundOneShot(SOUND_MEDIA_LOADED);

          // Show panels
          endCursorLock();
        }}
      />
    </div>
  );
}

RootPopups.propTypes = {
  scene: PropTypes.object,
  centerPopupRef: PropTypes.object
};

export default RootPopups;
