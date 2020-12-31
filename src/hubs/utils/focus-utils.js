import screenfull from "screenfull";
import { showFullScreenIfWasFullScreen } from "./fullscreen";
const { detect } = require("detect-browser");
import { temporarilyReleaseCanvasCursorLock } from "../../jel/utils/dom-utils";

const browser = detect();
let isExitingFullscreenDueToFocus = false;

// Utility function that handles a bunch of incidental stuff related to text fields:
//
// - On non-mobile platforms, selects the value on focus
// - If full screen, exits/enters full screen because of firefox full screen issues
export function handleTextFieldFocus(target, doNotSelect) {
  if (!window.AFRAME) return;
  const isMobile = AFRAME.utils.device.isMobile();

  if (screenfull.isFullscreen && !AFRAME.utils.device.isMobileVR() && browser.name === "firefox") {
    // This will prevent focus, but its the only way to avoid getting into a
    // weird "firefox reports full screen but actually not". You end up having to tap
    // twice to ultimately get the focus.
    //
    // We need to keep track of a bit here so that we don't re-full screen when
    // the text box is blurred by the browser.

    isExitingFullscreenDueToFocus = true;
    screenfull.exit().then(() => {
      target.focus();
    });
  }

  // Need to add a delay since this happens before the focus actually occurs.
  if (!isMobile && !doNotSelect) setTimeout(() => target.select(), 0);

  temporarilyReleaseCanvasCursorLock();
}

export function handleTextFieldBlur() {
  // This is the incidental blur event when exiting fullscreen mode on mobile
  if (isExitingFullscreenDueToFocus) {
    isExitingFullscreenDueToFocus = false;
    return;
  }

  showFullScreenIfWasFullScreen();
}
