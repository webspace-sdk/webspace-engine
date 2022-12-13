import React from "react";
import LoadingPanel from "./loading-panel";

export const Loading = () => (
  <div
    style={{
      background: "rgba(0.2, 0.2, 0.2)",
      display: "flex",
      width: "800px",
      height: "800px"
    }}
  >
    <LoadingPanel />
  </div>
);

export default {
  title: "Loading Panel"
};
