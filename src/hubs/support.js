/*
NOTE: support.js needs to be as self-contained as possible, since it needs to work in legacy browers
that we do not support. Avoid adding imports to libraries or other modules from our own codebase
that might break the support UI in legacy browsers.
*/

import React from "react";
import ReactDOM from "react-dom";
import { detectOS } from "detect-browser";
import LoadingPanel from "../jel/react-components/loading-panel";
import { WrappedIntlProvider } from "./react-components/wrapped-intl-provider";

const SHORTHAND_INITIALIZER = "var foo = 'bar'; var baz = { foo };";
const SPREAD_SYNTAX = "var foo = {}; var baz = { ...foo };";
const CATCH_SYNTAX = "try { foo(); } catch {}";

function syntaxSupported(syntax) {
  try {
    eval(syntax);
    return true;
  } catch (e) {
    return false;
  }
}

function getPlatformSupport() {
  return [
    { name: "Web Assembly", supported: !!window.WebAssembly },
    { name: "Media Devices", supported: !!navigator.mediaDevices },
    { name: "Shorthand initializer syntax", supported: syntaxSupported(SHORTHAND_INITIALIZER) },
    { name: "Spread syntax", supported: syntaxSupported(SPREAD_SYNTAX) },
    { name: "Optional catch syntax", supported: syntaxSupported(CATCH_SYNTAX) },
    { name: "WebGL2", supported: !!window.WebGL2RenderingContext },
    { name: "Mobile App", supported: () => !AFRAME.utils.device.isMobile() }
  ];
}

function isInAppBrowser() {
  // Some apps like Twitter, Discord and Facebook on Android and iOS open links in
  // their own embedded preview browsers.
  //
  // On iOS this WebView does not have a mediaDevices API at all, but in Android apps
  // like Facebook, the browser pretends to have a mediaDevices, but never actually
  // prompts the user for device access. So, we show a dialog that tells users to open
  // the room in an actual browser like Safari, Chrome or Firefox.
  //
  // Facebook Mobile Browser on Android has a userAgent like this:
  // Mozilla/5.0 (Linux; Android 9; SM-G950U1 Build/PPR1.180610.011; wv) AppleWebKit/537.36 (KHTML, like Gecko)
  // Version/4.0 Chrome/80.0.3987.149 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/262.0.0.34.117;]
  const detectedOS = detectOS(navigator.userAgent);
  return (detectedOS === "iOS" && !navigator.mediaDevices) || /\bfb_iab\b/i.test(navigator.userAgent);
}

export function platformUnsupported() {
  return (
    getPlatformSupport().some(({ supported }) => (typeof supported === "function" ? !supported() : !supported)) ||
    isInAppBrowser()
  );
}

document.addEventListener("DOMContentLoaded", () => {
  if (platformUnsupported()) {
    const isMobile = AFRAME.utils.device.isMobile();

    ReactDOM.render(
      <WrappedIntlProvider>
        <LoadingPanel isLoading={true} unsupportedMessage={isMobile ? "mobile" : "non-mobile"} />
      </WrappedIntlProvider>,
      document.getElementById("support-root")
    );
  }
});
