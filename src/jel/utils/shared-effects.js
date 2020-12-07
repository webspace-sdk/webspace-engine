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
