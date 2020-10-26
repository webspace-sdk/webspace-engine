import { useEffect } from "react";

export const useSceneMuteState = (scene, setMuted) => {
  useEffect(
    () => {
      const onAframeStateChanged = e => {
        if (e.detail === "muted") {
          setMuted(scene.is("muted"));
        }
      };

      scene.addEventListener("stateadded", onAframeStateChanged);
      scene.addEventListener("stateremoved", onAframeStateChanged);

      return () => {
        scene.removeEventListener("stateadded", onAframeStateChanged);
        scene.removeEventListener("stateremoved", onAframeStateChanged);
      };
    },
    [scene, setMuted]
  );
};
