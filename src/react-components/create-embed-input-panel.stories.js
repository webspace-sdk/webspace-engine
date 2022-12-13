import React from "react";
import CreateEmbedInputPanel from "./create-embed-input-panel";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
import classNames from "classnames";

export const Normal = () => (
  <div className={classNames(sharedStyles.basePanel)} style={{ display: "flex", width: "800px", height: "400px" }}>
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
      <CreateEmbedInputPanel embedType="image" />
      <CreateEmbedInputPanel embedType="video" />
      <CreateEmbedInputPanel embedType="pdf" />
      <CreateEmbedInputPanel embedType="model" />
    </div>
  </div>
);

export default {
  title: "Create Embed Input Panel"
};
