import React from "react";
import InvitePanel from "./invite-panel";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
import classNames from "classnames";

export const Normal = () => (
  <div
    className={classNames(sharedStyles.basePanel)}
    style={{ display: "flex", width: "400px", height: "600px", marginTop: "32px", flexDirection: "column" }}
  >
    <InvitePanel
      fetchInviteUrl={async () => {
        console.log("Fetch");
        return "https://jel.app/invite";
      }}
    />
  </div>
);

export default {
  title: "Invite Panel"
};
