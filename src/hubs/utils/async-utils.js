export const waitForEvent = function(eventName, eventObj) {
  return new Promise(resolve => {
    eventObj.addEventListener(eventName, resolve, { once: true });
  });
};

export const waitForDOMContentLoaded = function() {
  if (window.UI_ROOT?._ready) {
    return Promise.resolve(null);
  } else {
    return waitForEvent("shadow-root-ready", document);
  }
};
