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
