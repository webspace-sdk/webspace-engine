import React, { useEffect } from "react";
import HubPermissionsPopup from "./hub-permissions-popup";
import sharedStyles from "../../assets/stylesheets/shared.scss";
import AtomMetadata, { ATOM_TYPES } from "../utils/atom-metadata";

const metadata = new AtomMetadata(ATOM_TYPES.HUB);
metadata._metadata.set("abc123", { roles: { space: "viewer" } });

export const Hub = () => {
  useEffect(() => document.querySelector(`.${sharedStyles.showWhenPopped}`).focus());

  return (
    <div>
      <HubPermissionsPopup
        styles={{}}
        attributes={{}}
        hub={{ hub_id: "abc123", name: "My Hub" }}
        hubMetadata={metadata}
      />
    </div>
  );
};

export default {
  title: "Permissions Popup"
};
