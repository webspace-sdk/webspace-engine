import PropTypes from "prop-types";
import React, { forwardRef } from "react";
import ReactDOM from "react-dom";
import CreateSelect from "./create-select";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";

let popupRoot = null;
waitForDOMContentLoaded().then(() => (popupRoot = document.body.shadowRoot.getElementById("jel-popup-root")));

// Note that we can't use slide-down-when-popped transition
// since it causes positioning artifacts in rc-select
const CreateSelectPopup = forwardRef(
  ({ styles, attributes, popperElement, setPopperElement, onActionSelected }, ref) => {
    const popup = (
      <div
        tabIndex={-1} // Ensures can be focused
        className="fast-show-when-popped"
        ref={setPopperElement}
        style={styles.popper}
        {...attributes.popper}
      >
        <CreateSelect ref={ref} getPopupContainer={() => popperElement} onActionSelected={onActionSelected} />
      </div>
    );

    return ReactDOM.createPortal(popup, popupRoot);
  }
);

CreateSelectPopup.displayName = "CreateSelectPopup";
CreateSelectPopup.propTypes = {
  styles: PropTypes.object,
  attributes: PropTypes.object,
  setPopperElement: PropTypes.func,
  popperElement: PropTypes.object,
  onActionSelected: PropTypes.func
};

export default CreateSelectPopup;
