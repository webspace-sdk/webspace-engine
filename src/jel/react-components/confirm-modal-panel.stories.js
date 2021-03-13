import React from "react";
import ConfirmModalPanel from "./confirm-modal-panel";

export const Normal = () => (
  <div style={{ display: "flex", width: "800px", height: "400px" }}>
    <div
      style={{
        position: "absolute",
        top: "30px",
        left: "30px",
        background: "linear-gradient(177deg, rgba(2,0,35,1) 0%, rgba(86,16,70,1) 10%, rgba(200,212,255,1) 100%)",
        display: "flex",
        width: "800px",
        height: "800px",
        marginTop: "32px",
        flexDirection: "column",
        justifyContent: "flex-start",
        alignItems: "flex-start"
      }}
    >
      <ConfirmModalPanel confirmType="channel-delete" name="My Channel" />
    </div>
  </div>
);

export default {
  title: "Confirm Modal Panel"
};
