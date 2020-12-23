import React from "react";
import EmojiPicker from "./emoji-picker";

export const Basic = () => (
  <div
    style={{
      display: "flex",
      width: "800px",
      height: "600px",
      marginTop: "32px",
      flexDirection: "column"
    }}
  >
    <EmojiPicker onEmojiSelected={name => console.log(name)} />
  </div>
);

export default {
  title: "Emoji Picker"
};
