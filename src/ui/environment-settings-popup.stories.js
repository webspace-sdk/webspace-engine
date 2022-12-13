import React, { useEffect } from "react";
import EnvironmentSettingsPopup from "./environment-settings-popup";
import sharedStyles from "../../assets/stylesheets/shared.scss";
import AtomMetadata, { ATOM_TYPES } from "../utils/atom-metadata";

const metadata = new AtomMetadata(ATOM_TYPES.HUB);
metadata._metadata.set("abc123", { roles: { space: "viewer" }, world: {} });

export const Settings = () => {
  useEffect(() => document.querySelector(`.${sharedStyles.showWhenPopped}`).focus());

  return (
    <div>
      <EnvironmentSettingsPopup
        styles={{}}
        attributes={{}}
        hub={{ hub_id: "abc123" }}
        hubMetadata={metadata}
        onColorsChanged={() => {}}
        onColorChangeComplete={() => {}}
      />
    </div>
  );
};

export default {
  title: "Environment Settings Popup"
};
