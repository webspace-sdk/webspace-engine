import {useEffect} from "react";

export const useSceneMuteState = (scene, setUnmuted, additionalHandler = null) => {
  useEffect(
    () => {
      const onAframeStateChanged = e => {
        const unmuted = scene.is("unmuted");
        if (e.detail === "unmuted") {
          setUnmuted(unmuted);

          if (additionalHandler) {
            additionalHandler(unmuted);
          }
        }
      };

      scene && scene.addEventListener("stateadded", onAframeStateChanged);
      scene && scene.addEventListener("stateremoved", onAframeStateChanged);

      return () => {
        scene && scene.removeEventListener("stateadded", onAframeStateChanged);
        scene && scene.removeEventListener("stateremoved", onAframeStateChanged);
      };
    },
    [scene, setUnmuted, additionalHandler]
  );
};

// Given a ref and a handler, run the handler if the ref is blurred
// for a short duration or when it becomes focused. This is used typically
// to clear a text input field for a popup after it is dismissed.
export const useRefFocusResetter = (ref, handler) => {
  useEffect(
    () => {
      let blurTimeout;
      // Hack - this will trigger the effect to reset to the default by changing the search.
      const resetOnBlur = () => {
        blurTimeout = setTimeout(() => handler, 500);
      };

      const resetOnFocus = () => {
        clearTimeout(blurTimeout);
        handler();
      };

      if (ref && ref.current) {
        const el = ref.current;
        el.addEventListener("blur", resetOnBlur);
        el.addEventListener("focus", resetOnFocus);

        return () => {
          el.removeEventListener("focus", resetOnFocus);
          el.removeEventListener("blur", resetOnBlur);
        };
      }
    },
    [ref, handler]
  );
};

export const useClientPresenceState = (clientId, scene, state, onStateChange) => {
  useEffect(
    () => {
      if (!scene) return () => {};

      const handler = ({ detail: newState }) => {
        if (state !== newState && newState.clientId === clientId) {
          onStateChange(newState);
        }
      };

      scene.addEventListener("client-presence-updated", handler);
      return () => scene.removeEventListener("client-presence-updated", handler);
    },
    [scene, clientId, state, onStateChange]
  );
};
