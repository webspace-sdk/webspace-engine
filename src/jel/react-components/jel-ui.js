import React, { useEffect, useMemo, useRef, useCallback } from "react";
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

function JelUI({ navExpanded = false }) {
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
        body.classList.remove("nav-hidden");
        body.offsetHeight;
        body.classList.add("nav-expanded");
        scene.setAttribute("embedded", true);
      } else {
        const shouldHide = body.classList.contains("nav-expanded");
        body.classList.remove("nav-expanded");
        body.offsetHeight;
        scene.removeAttribute("embedded", true);
        if (shouldHide) {
          body.classList.add("nav-hidden");
        }
      }
    },
    [navExpanded]
  );

  return (
    <ThemeProvider theme={dark}>
      <JelWrap>hi</JelWrap>
    </ThemeProvider>
  );
}

JelUI.propTypes = {
  navExpanded: PropTypes.bool
};

export default JelUI;
