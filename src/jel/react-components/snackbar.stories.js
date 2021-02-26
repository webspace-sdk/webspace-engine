import React, { useEffect } from "react";

import Snackbar from "./snackbar";

export const Support = () => {
  useEffect(() => {
    setTimeout(() => {
      window.APP.accountChannel.dispatchEvent(new CustomEvent("support_available", {}));
    }, 2000);
    setTimeout(() => {
      window.APP.accountChannel.dispatchEvent(new CustomEvent("support_unavailable", {}));
    }, 8000);
    return () => {};
  });

  return (
    <div
      style={{
        background: "linear-gradient(177deg, rgba(2,0,85,1) 0%, rgba(16,16,170,1) 10%, rgba(0,212,255,1) 100%)",
        width: "1200px",
        height: "600px",
        marginTop: "32px"
      }}
    >
      <Snackbar>Test Button</Snackbar>
    </div>
  );
};

export default {
  title: "Snackbar"
};
