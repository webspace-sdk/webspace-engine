import React, {useEffect, useState} from "react";
import styled from "styled-components";
import {BigIconButton} from "./icon-button";
import {imageUrlForEmoji} from "../utils/media-url-utils";

const EquippedEmojiImage = styled.img`
  width: 100%;
  height: 100%;
  opacity: 50%;
  width: 26px;
  height: 26px;
`;

export default function EquippedEmojiIcon() {
  const { store } = window.APP;
  const [equippedEmoji, setEquippedEmoji] = useState(store.state.equips.launcher);
  const equippedEmojiImageUrl = imageUrlForEmoji(equippedEmoji);

  // Equipped emoji
  useEffect(
    () => {
      const handler = () => setEquippedEmoji(store.state.equips.launcher);
      store.addEventListener("statechanged-equips", handler);
      return () => store.removeEventListener("statechanged-equips", handler);
    },
    [store, setEquippedEmoji]
  );

  return (
    <BigIconButton tabIndex={-1}>
      <EquippedEmojiImage src={equippedEmojiImageUrl} />
    </BigIconButton>
  );
}
