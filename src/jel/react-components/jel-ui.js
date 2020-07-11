import React, { useEffect, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import styled, { ThemeProvider } from "styled-components";

const dark = {
  text: "white",
  panelBg: "black"
};

/*const light = {
  text: "black",
  panelBg: "white"
};*/

const JelWrap = styled.div`
  color: ${p => p.theme.text};
  background: ${p => p.theme.panelBg};
`;

const TestButton = styled.button``;

function useNavResize(navExpanded) {
  const scene = useMemo(() => document.querySelector("a-scene"));

  const resizeTimeout = useRef();
  const resizeInterval = useRef();

  useEffect(
    () => {
      if (resizeTimeout.current) {
        clearInterval(resizeInterval.current);
        clearTimeout(resizeTimeout.current);
      }

      resizeTimeout.current = setTimeout(() => {
        clearInterval(resizeInterval.current);
        resizeTimeout.current = null;
      }, 800);

      // Don't run during RAF to reduce chop.
      resizeInterval.current = setInterval(() => scene.resize(), 100);
      const { body } = document;

      if (navExpanded) {
        const wasHidden = body.classList.contains("nav-hidden");
        body.classList.remove("nav-hidden");
        body.offsetHeight; // relayout
        if (wasHidden) {
          body.classList.add("nav-expanded");
        }
      } else {
        body.classList.remove("nav-expanded");
        body.offsetHeight; // relayout
        body.classList.add("nav-hidden");
      }
    },
    [navExpanded]
  );
}

function JelUI({ navExpanded = true }) {
  useNavResize(navExpanded);

  return (
    <ThemeProvider theme={dark}>
      <JelWrap>
        <TestButton onClick={() => console.log("hi")}>Create Orb</TestButton>
      </JelWrap>
    </ThemeProvider>
  );
}

JelUI.propTypes = {
  navExpanded: PropTypes.bool
};

export default JelUI;
