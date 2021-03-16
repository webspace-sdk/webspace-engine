import React, { useEffect } from "react";
import EnvironmentSettingsPopup from "./environment-settings-popup";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
import AtomMetadata, { ATOM_TYPES } from "../utils/atom-metadata";

const metadata = new AtomMetadata(ATOM_TYPES.HUB);
metadata._metadata.set("abc123", { roles: { space: "viewer" } });

export const Hub = () => {
  useEffect(() => document.querySelector(`.${sharedStyles.showWhenPopped}`).focus());

  return (
    <div>
      <EnvironmentSettingsPopup styles={{}} attributes={{}} />
    </div>
  );
};

export default {
  title: "Environment Settings Popup"
};
