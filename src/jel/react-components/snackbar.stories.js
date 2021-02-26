import React from "react";

import Snackbar, { SNACKBAR_MODES } from "./snackbar";

export const Support = () => (
  <div
    style={{
      background: "linear-gradient(177deg, rgba(2,0,85,1) 0%, rgba(16,16,170,1) 10%, rgba(0,212,255,1) 100%)",
      width: "1200px",
      height: "600px",
      marginTop: "32px"
    }}
  >
    <Snackbar mode={SNACKBAR_MODES.SUPPORT}>Test Button</Snackbar>
  </div>
);

export default {
  title: "Snackbar"
};
