import React, { useState, useCallback } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import { waitForShadowDOMContentLoaded } from "../../hubs/utils/async-utils";
import PopupPanelMenu from "./popup-panel-menu";
import FolderAccessRequestPanel from "./folder-access-request-panel";
import OriginAccessConfigurationPanel from "./origin-access-configuration-panel";
import FileWriteback from "../writeback/file-writeback";
import GitHubWriteback from "../writeback/github-writeback";

let popupRoot = null;
waitForShadowDOMContentLoaded().then(() => (popupRoot = DOM_ROOT.getElementById("jel-popup-root")));

const WritebackSetupPopup = ({ setPopperElement, styles, attributes, children }) => {
  const { atomAccessManager } = window.APP;

  const [failedOriginState, setFailedOriginState] = useState(null);

  const onConfigureClicked = useCallback(
    async (options = {}) => {
      if (options.type && atomAccessManager.writebackOriginType !== options.type) {
        switch (options.type) {
          case "file":
            await atomAccessManager.setAndInitWriteback(new FileWriteback());
            break;
          case "github":
            await atomAccessManager.setAndInitWriteback(new GitHubWriteback());
            break;
        }
      }

      const result = await atomAccessManager.openWriteback(options);

      if (result) {
        setFailedOriginState(null);
        window.APP.store.update({ writeback: options });
      } else {
        setFailedOriginState(atomAccessManager.writebackOriginState());
      }

      if (result) {
        DOM_ROOT.activeElement.blur();
      }
    },
    [atomAccessManager]
  );

  let contents;

  if (document.location.protocol === "file:") {
    contents = <FolderAccessRequestPanel failedOriginState={failedOriginState} onAccessClicked={onConfigureClicked} />;
  } else {
    contents = (
      <OriginAccessConfigurationPanel failedOriginState={failedOriginState} onConnectClicked={onConfigureClicked} />
    );
  }

  const popupInput = (
    <div
      tabIndex={-1} // Ensures can be focused
      className="show-when-popped"
      ref={setPopperElement}
      style={styles.popper}
      {...attributes.popper}
    >
      <PopupPanelMenu style={{ padding: "32px 0px", borderRadius: "12px" }} className="slide-up-when-popped">
        {contents}
      </PopupPanelMenu>
      {children}
    </div>
  );

  if (popupRoot) {
    return ReactDOM.createPortal(popupInput, popupRoot);
  } else {
    return popupInput;
  }
};

WritebackSetupPopup.propTypes = {
  scene: PropTypes.object
};

export { WritebackSetupPopup as default };
