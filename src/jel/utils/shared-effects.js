import { useEffect } from "react";

export const useSceneMuteState = (scene, setMuted) => {
  useEffect(
    () => {
      const onAframeStateChanged = e => {
        if (e.detail === "muted") {
          setMuted(scene.is("muted"));
        }
      };

      scene && scene.addEventListener("stateadded", onAframeStateChanged);
      scene && scene.addEventListener("stateremoved", onAframeStateChanged);

      return () => {
        scene && scene.removeEventListener("stateadded", onAframeStateChanged);
        scene && scene.removeEventListener("stateremoved", onAframeStateChanged);
      };
    },
    [scene, setMuted]
  );
};
