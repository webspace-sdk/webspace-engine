import React from "react";
import ChatInputPanel from "./chat-input-panel";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
import classNames from "classnames";

export const Normal = () => (
  <div className={classNames(sharedStyles.basePanel)} style={{ display: "flex", width: "800px", height: "400px" }}>
    <div style={{ position: "absolute", top: "30px", left: "30px" }}>
      <ChatInputPanel />
    </div>
  </div>
);

export default {
  title: "Chat Input Panel"
};
