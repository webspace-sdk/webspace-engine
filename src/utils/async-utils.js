export const waitForEvent = function(eventName, eventObj) {
  return new Promise(resolve => {
    eventObj.addEventListener(eventName, resolve, { once: true });
  });
};

export const waitForShadowDOMContentLoaded = function() {
  if (window.DOM_ROOT?._ready) {
    return Promise.resolve(null);
  } else {
    return waitForEvent("shadow-root-ready", document);
  }
};

export const waitForDOMContentLoaded = function(doc = document, win = window) {
  if (doc.readyState === "complete" || doc.readyState === "loaded" || doc.readyState === "interactive") {
    return Promise.resolve(null);
  } else {
    return waitForEvent("DOMContentLoaded", win);
  }
};
