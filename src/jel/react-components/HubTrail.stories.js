import React from "react";
import HubTrail from "./hub-trail";

export const TrailMulti = () => (
  <div
    style={{
      background: "linear-gradient(177deg, rgba(2,0,85,1) 0%, rgba(16,16,170,1) 10%, rgba(0,212,255,1) 100%)",
      display: "flex",
      width: "400px",
      height: "600px",
      marginTop: "32px",
      flexDirection: "column"
    }}
  >
    <HubTrail />
  </div>
);

export default {
  title: "HubTrail"
};
