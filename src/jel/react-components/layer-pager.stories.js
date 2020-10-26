import React from "react";
import LayerPager from "./layer-pager";

export const MidPage = () => (
  <div
    style={{
      background: "linear-gradient(177deg, rgba(2,0,85,1) 0%, rgba(16,16,170,1) 10%, rgba(0,212,255,1) 100%)",
      display: "flex",
      width: "800px",
      height: "400px",
      marginTop: "32px",
      flexDirection: "column"
    }}
  >
    <LayerPager page={3} maxPage={7} onPageChanged={p => console.log(p)} />
  </div>
);

export default {
  title: "Layer Pager"
};
