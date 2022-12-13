import React, {useRef} from "react";
import "../assets/jel/stylesheets/create-select.scss";
import CreateSelect from "./create-select";

export const Basic = () => {
  const ref = useRef();

  setTimeout(() => {
    console.log(ref.current);
    ref.current.focus();
  }, 500);

  return (
    <div
      style={{
        background: "linear-gradient(177deg, rgba(2,0,35,1) 0%, rgba(86,16,70,1) 10%, rgba(200,212,255,1) 100%)",
        display: "flex",
        width: "800px",
        height: "800px",
        marginTop: "32px",
        flexDirection: "column"
      }}
    >
      <div style={{ position: "absolute", top: "200px", left: "200px" }}>
        <CreateSelect ref={ref} onActionSelected={a => console.log("exec", a)} />
      </div>
    </div>
  );
};

export default {
  title: "Create Select"
};
