import React from "react";
import AtomTrail from "./atom-trail";
import AtomMetadata, {ATOM_TYPES} from "../utils/atom-metadata";

const metadata = new AtomMetadata(ATOM_TYPES.HUB);
metadata._metadata.set("QxRKdNF", { displayName: "Test Name" });
metadata._metadata.set("JRrZerh", { displayName: "Test Very Long Name That Keeps Going and Going" });
metadata._metadata.set("QcAVkAR", { displayName: "This is is the one you are on" });
metadata._metadata.set("ARbzxCd", { displayName: "You should not see me" });

export const TrailMulti = () => (
  <div
    style={{
      background: "linear-gradient(177deg, rgba(2,0,85,1) 0%, rgba(16,16,170,1) 10%, rgba(0,212,255,1) 100%)",
      display: "flex",
      width: "800px",
      height: "600px",
      marginTop: "32px",
      flexDirection: "column"
    }}
  >
    <AtomTrail
      hubIds={["ARbzxCd", "QxRKdNF", "JRrZerh", "QcAVkAR"]}
      hubMetadata={metadata}
      onItemClick={hubId => console.log(hubId)}
      hubCan={() => true}
    />
  </div>
);

export default {
  title: "AtomTrail"
};
