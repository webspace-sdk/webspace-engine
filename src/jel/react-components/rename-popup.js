import PropTypes from "prop-types";
import React, { forwardRef, useCallback } from "react";
import { ATOM_TYPES } from "../utils/atom-metadata";
import ReactDOM from "react-dom";
import NameInputPanel from "./name-input-panel";
import { waitForShadowDOMContentLoaded } from "../../hubs/utils/async-utils";

let popupRoot = null;
waitForShadowDOMContentLoaded().then(() => (popupRoot = DOM_ROOT.getElementById("jel-popup-root")));

const RenamePopup = forwardRef(({ styles, attributes, atomMetadata, setPopperElement, atomId }, ref) => {
  const { hubChannel, dynaChannel, spaceChannel } = window.APP;

  const popupInput = (
    <div
      tabIndex={-1} // Ensures can be focused
      className="show-when-popped"
      ref={setPopperElement}
      style={styles.popper}
      {...attributes.popper}
    >
      <NameInputPanel
        className="slide-down-when-popped"
        atomId={atomId}
        atomMetadata={atomMetadata}
        onNameChanged={useCallback(
          name => {
            const { atomType } = atomMetadata;

            if (atomType === ATOM_TYPES.HUB) {
              hubChannel.updateHubMeta(atomId, { name: name.trim() }, true /* localFirst */);
            } else if (atomType === ATOM_TYPES.VOX) {
              spaceChannel.updateVoxMeta(atomId, { name: name.trim() });
            } else if (atomType === ATOM_TYPES.SPACE) {
              dynaChannel.updateSpace(atomId, { name: name.trim() });
            }
          },
          [hubChannel, spaceChannel, dynaChannel, atomId, atomMetadata]
        )}
        ref={ref}
      />
    </div>
  );

  return ReactDOM.createPortal(popupInput, popupRoot);
});

RenamePopup.displayName = "RenamePopup";
RenamePopup.propTypes = {
  styles: PropTypes.object,
  attributes: PropTypes.object,
  atomMetadata: PropTypes.object,
  setPopperElement: PropTypes.func,
  atomId: PropTypes.string
};

export default RenamePopup;
