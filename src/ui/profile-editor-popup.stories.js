import React, { useEffect } from "react";
import ProfileEditorPopup, { PROFILE_EDITOR_MODES } from "./profile-editor-popup";
import sharedStyles from "../../assets/stylesheets/shared.scss";

export const Unverified = () => {
  useEffect(() => document.querySelector(`.${sharedStyles.showWhenPopped}`).focus());

  return (
    <div>
      <ProfileEditorPopup mode={PROFILE_EDITOR_MODES.UNVERIFIED} styles={{}} attributes={{}} />
    </div>
  );
};

export const Verifying = () => {
  useEffect(() => document.querySelector(`.${sharedStyles.showWhenPopped}`).focus());

  return (
    <div>
      <ProfileEditorPopup mode={PROFILE_EDITOR_MODES.VERIFYING} styles={{}} attributes={{}} />
    </div>
  );
};

export const Verified = () => {
  useEffect(() => document.querySelector(`.${sharedStyles.showWhenPopped}`).focus());

  return (
    <div>
      <ProfileEditorPopup mode={PROFILE_EDITOR_MODES.VERIFIED} styles={{}} attributes={{}} />
    </div>
  );
};

export default {
  title: "Profile Editor Popup"
};
