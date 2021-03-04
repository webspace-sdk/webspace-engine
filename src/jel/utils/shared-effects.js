import { useEffect } from "react";

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

export const useSpacePresenceMeta = (sessionId, scene, meta, onMetaChange) => {
  useEffect(
    () => {
      if (!scene) return () => {};

      const handler = () => {
        const spacePresences =
          window.APP.spaceChannel && window.APP.spaceChannel.presence && window.APP.spaceChannel.presence.state;
        const spacePresence = spacePresences && spacePresences[sessionId];
        const newMeta = spacePresence && spacePresence.metas[spacePresence.metas.length - 1];

        if (meta !== newMeta) {
          onMetaChange(newMeta);
        }
      };

      scene.addEventListener("space-presence-synced", handler);
      return () => scene.removeEventListener("space-presence-synced", handler);
    },
    [scene, sessionId, onMetaChange, meta]
  );
};
