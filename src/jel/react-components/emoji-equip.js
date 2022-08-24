import React, { useCallback, useRef, useState, useEffect, forwardRef } from "react";
import PropTypes from "prop-types";
import Tooltip from "./tooltip";
import { useSingleton } from "@tippyjs/react";
import styled from "styled-components";
import { imageUrlForEmoji } from "../../hubs/utils/media-url-utils";
import EmojiPopup from "./emoji-popup";
import { usePopupPopper } from "../utils/popup-utils";
import { getMessages } from "../../hubs/utils/i18n";

const EmojiEquipElement = styled.div`
  padding: 0;
  margin: 0;
  position: relative;
  display: flex;
  width: 100%;
  height: 200px;
  margin-bottom: 12px;
`;

const EmojiEquipOuter = styled.div`
  padding: 0;
  margin: 0;
  position: absolute;
  top: -80px;
  left: calc((100% - 220px) / 2);
  width: 100%;
  height: 100%;
  display: flex;
`;

const EmojiEquipInner = styled.div`
  position: relative;
  padding: 0;
  margin: 0;
  width: 100%;
  width: 220px;
  height: 300px;
  display: flex;
  z-index: 10;

  & svg {
    color: var(--secondary-panel-item-background-color);
  }

  &.slot-0-hover svg.slot-0 {
    color: var(--panel-item-hover-background-color);
  }

  &.slot-1-hover svg.slot-1 {
    color: var(--panel-item-hover-background-color);
  }

  &.slot-2-hover svg.slot-2 {
    color: var(--panel-item-hover-background-color);
  }

  &.slot-3-hover svg.slot-3 {
    color: var(--panel-item-hover-background-color);
  }

  &.slot-4-hover svg.slot-4 {
    color: var(--panel-item-hover-background-color);
  }

  &.slot-5-hover svg.slot-5 {
    color: var(--panel-item-hover-background-color);
  }

  &.slot-6-hover svg.slot-6 {
    color: var(--panel-item-hover-background-color);
  }

  &.slot-7-hover svg.slot-7 {
    color: var(--panel-item-hover-background-color);
  }

  &.slot-8-hover svg.slot-8 {
    color: var(--panel-item-hover-background-color);
  }

  &.slot-9-hover svg.slot-9 {
    color: var(--panel-item-hover-background-color);
  }

  &.slot-0-active svg.slot-0 {
    color: var(--panel-item-active-background-color);
  }

  &.slot-1-active svg.slot-1 {
    color: var(--panel-item-active-background-color);
  }

  &.slot-2-active svg.slot-2 {
    color: var(--panel-item-active-background-color);
  }

  &.slot-3-active svg.slot-3 {
    color: var(--panel-item-active-background-color);
  }

  &.slot-4-active svg.slot-4 {
    color: var(--panel-item-active-background-color);
  }

  &.slot-5-active svg.slot-5 {
    color: var(--panel-item-active-background-color);
  }

  &.slot-6-active svg.slot-6 {
    color: var(--panel-item-active-background-color);
  }

  &.slot-7-active svg.slot-7 {
    color: var(--panel-item-active-background-color);
  }

  &.slot-8-active svg.slot-8 {
    color: var(--panel-item-active-background-color);
  }

  &.slot-9-active svg.slot-9 {
    color: var(--panel-item-active-background-color);
  }
`;

const SlotButton = styled.button`
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  outline-style: none;
  position: absolute;
  background-color: transparent;
  border: none;
  width: 48px;
  height: 48px;
  z-index: 100;
  background-color: transparent;
  display: flex;
  justify-content: center;
  align-items: center;

  img {
    width: 24px;
    height: 24px;
  }

  &:hover {
    transform: translateY(-1px);
  }
`;

const SelectedButton = styled.button`
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  outline-style: none;
  background-color: transparent;
  position: absolute;
  width: 40px;
  height: 40px;
  box-sizing: content-box;
  z-index: 100;
  top: 152px;
  left: calc(50% - 28px);

  @keyframes select-animation {
    0%,
    100% {
      transform: scale(1, 1);
    }
    50% {
      transform: scale(1.15, 1.15);
    }
  }
  transition: transform 0.15s linear;
  border: 8px solid transparent;
  border-radius: 32px;

  &:hover {
    transform: translateY(-2px);
    background-color: var(--panel-item-hover-background-color);
    border-color: var(--panel-item-hover-background-color);
  }

  &:active {
    transition-duration: 0s;
    transform: translateY(-1px);
  }

  &[data-selected-slot] {
    -webkit-animation: select-animation 0.3s 1 ease-in-out;
    animation: select-animation 0.3s 1 ease-in-out;
  }
`;

const SLOT_BUTTON_OFFSETS = [
  ["calc(50% + 9px - 12px)", "calc(50% - 46px - 12px)"],
  ["calc(50% + 42px - 12px)", "calc(50% - 20px - 12px)"],
  ["calc(50% + 56px - 12px)", "calc(50% + 17px - 12px)"],
  ["calc(50% + 42px - 12px)", "calc(50% + 56px - 12px)"],
  ["calc(50% + 9px - 12px)", "calc(50% + 82px - 12px)"],
  ["calc(50% - 31px - 12px)", "calc(50% + 82px - 12px)"],
  ["calc(50% - 66px - 12px)", "calc(50% + 56px - 12px)"],
  ["calc(50% - 80px - 12px)", "calc(50% + 17px - 12px)"],
  ["calc(50% - 66px - 12px)", "calc(50% - 20px - 12px)"],
  ["calc(50% - 31px - 12px)", "calc(50% - 46px - 12px)"]
];

const SLOT_SLICE_TRANSFORMS = [
  "rotate(-90) translate(-20)",
  "rotate(-54) translate(-12.22, 3.97)",
  "rotate(-18) translate(-3.59, 2.6)",
  "rotate(18) translate(2.60, -3.58)",
  "rotate(54) translate(3.97, -12.22)",
  "rotate(90) translate(0, -20)",
  "rotate(126) translate(-7.79, -23.98)",
  "rotate(162) translate(-16.41, -22.61)",
  "rotate(198) translate(-22.61, -16.43)",
  "rotate(234) translate(-23.96, -7.79)"
];

const buildEmojisFromStore = store => {
  const storeState = store.state.equips;
  return [
    storeState.launcherSlot1,
    storeState.launcherSlot2,
    storeState.launcherSlot3,
    storeState.launcherSlot4,
    storeState.launcherSlot5,
    storeState.launcherSlot6,
    storeState.launcherSlot7,
    storeState.launcherSlot8,
    storeState.launcherSlot9,
    storeState.launcherSlot10
  ];
};

const EmojiEquip = forwardRef(({ scene, centerPopupRef }, ref) => {
  const store = window.APP.store;
  const messages = getMessages();

  const emojiEquipRef = useRef();
  const emojiPopupFocusRef = useRef();

  const [hoverSlot, setHoverSlot] = useState(null);
  const [isClicking, setIsClicking] = useState(false);
  const [emojis, setEmojis] = useState(buildEmojisFromStore(store));
  const [emojiImages, setEmojiImages] = useState({});
  const [selectedEmojiImageUrl, setSelectedEmojiImageUrl] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(
    emojis.indexOf(emojis.find(({ emoji }) => emoji === store.state.equips.launcher))
  );
  const [tipSource, tipTarget] = useSingleton();

  const selectedEmoji = store.state.equips.launcher;

  useEffect(
    () => {
      console.log("run");
      const newImages = { ...emojiImages };

      console.log("new", newImages);
      const ps = [];
      let shouldSet = false;

      for (const emoji of emojis) {
        const p = imageUrlForEmoji(emoji, 64);
        p.then(url => {
          console.log("check");
          if (newImages[emoji]) return;
          console.log("set", emoji, url);
          shouldSet = true;
          newImages[emoji] = url;
        });

        ps.push(p);
      }

      if (ps.length > 0) {
        console.log("await)");
        Promise.all(ps).then(() => {
          if (shouldSet) {
            setEmojiImages({ ...newImages, ...emojiImages });
          }
        });
      }
    },
    [emojis, setEmojiImages, emojiImages]
  );

  useEffect(
    () => {
      const oldSelectedEmoji = selectedEmoji;
      imageUrlForEmoji(selectedEmoji, 128).then(url => {
        if (selectedEmoji === oldSelectedEmoji) {
          setSelectedEmojiImageUrl(url);
        }
      });
    },
    [selectedEmoji]
  );

  const {
    styles: emojiPopupStyles,
    attributes: emojiPopupAttributes,
    show: showEmojiPopup,
    setPopup: setEmojiPopupElement,
    popupOpenOptions: emojiPopupOpenOptions
  } = usePopupPopper(emojiPopupFocusRef, "bottom", [0, 8]);

  // Animate center emoji when slot changes.
  useEffect(
    () => {
      if (!ref || !ref.current) return;
      const el = ref.current;
      if (el.getAttribute("data-selected-slot") !== `${selectedSlot}`) {
        el.removeAttribute("data-selected-slot");
        el.offsetWidth; // Restart animation hack.
        el.setAttribute("data-selected-slot", `${selectedSlot}`);
      }
    },
    [ref, selectedSlot]
  );

  // When state store changes, update ring.
  useEffect(
    () => {
      const handler = () => {
        const emojis = buildEmojisFromStore(store);
        setEmojis(emojis);
        const selectedSlot = emojis.indexOf(emojis.find(({ emoji }) => emoji === store.state.equips.launcher));
        setSelectedSlot(selectedSlot);
      };
      store.addEventListener("statechanged-equips", handler);
      return () => store.removeEventListener("statechanged-equips", handler);
    },
    [store, setEmojis, setSelectedSlot]
  );

  // Handle emoji popup trigger
  useEffect(
    () => {
      const handleCreateVoxmoji = () => showEmojiPopup(centerPopupRef, "bottom", [0, 8], { equip: false });

      scene && scene.addEventListener("action_show_emoji_picker", handleCreateVoxmoji);
      return () => scene && scene.removeEventListener("action_show_emoji_picker", handleCreateVoxmoji);
    },
    [scene, centerPopupRef, showEmojiPopup]
  );

  return (
    <EmojiEquipElement ref={emojiEquipRef}>
      <Tooltip delay={750} singleton={tipSource} />

      <EmojiEquipOuter>
        <EmojiEquipInner className={hoverSlot !== null ? `slot-${hoverSlot}-${isClicking ? "active" : "hover"}` : ""}>
          {emojis.length > 0 &&
            SLOT_BUTTON_OFFSETS.map(([left, top], idx) => (
              <Tooltip
                content={messages[`emoji-equip.slot-${idx}-tip`].replaceAll("EMOJI", emojis[idx])}
                placement="left"
                key={`slot-${idx}-tip`}
                singleton={tipTarget}
              >
                <SlotButton
                  style={{ left, top }}
                  key={`slot-${idx}`}
                  onMouseOver={() => setHoverSlot(idx)}
                  onMouseOut={() => setHoverSlot(null)}
                  onMouseDown={() => setIsClicking(true)}
                  onMouseUp={() => setIsClicking(false)}
                  onClick={() => {
                    store.update({ equips: { launcher: emojis[idx] } });
                    DOM_ROOT.activeElement?.blur(); // Focuses canvas
                  }}
                >
                  <img src={emojiImages[emojis[idx]]} />
                </SlotButton>
              </Tooltip>
            ))}
          <Tooltip content={messages[`emoji-equip.select-slot`]} placement="left" key={`slot-choose-tip`} delay={0}>
            <SelectedButton
              ref={ref}
              onClick={() => {
                showEmojiPopup(emojiEquipRef, "top-end", [0, 12], { equip: true });
              }}
            >
              <img src={selectedEmojiImageUrl} />
            </SelectedButton>
          </Tooltip>

          {emojis.length > 0 &&
            SLOT_SLICE_TRANSFORMS.map((transform, idx) => (
              <svg
                key={idx}
                className={`slot-${idx}`}
                style={{ position: "absolute", left: "calc(-10%)", zIndex: "6" }}
                height="120%"
                width="120%"
                viewBox="0 0 20 20"
              >
                <circle
                  r="5"
                  cx="10"
                  cy="10"
                  fill="transparent"
                  stroke={selectedSlot === idx ? "var(--panel-item-active-background-color)" : "currentColor"}
                  strokeWidth="4"
                  strokeDasharray="3.14 31.42"
                  transform={transform}
                />
              </svg>
            ))}
        </EmojiEquipInner>
      </EmojiEquipOuter>
      <EmojiPopup
        setPopperElement={setEmojiPopupElement}
        styles={emojiPopupStyles}
        attributes={emojiPopupAttributes}
        ref={emojiPopupFocusRef}
        onEmojiSelected={useCallback(
          ({ unicode }) => {
            const parsed = unicode.split("-").map(str => parseInt(str, 16));
            const emoji = String.fromCodePoint(...parsed);

            if (emojiPopupOpenOptions.equip) {
              let currentSlot = -1;

              for (let i = 0; i < 10; i++) {
                if (store.state.equips.launcher === store.state.equips[`launcherSlot${i + 1}`]) {
                  currentSlot = i;
                  break;
                }
              }

              if (currentSlot !== -1) {
                store.update({ equips: { [`launcherSlot${currentSlot + 1}`]: emoji } });
              }

              store.update({ equips: { launcher: emoji } });
            } else {
              scene.emit("add_media_emoji", emoji);
            }
          },
          [scene, store, emojiPopupOpenOptions.equip]
        )}
      />
    </EmojiEquipElement>
  );
});

EmojiEquip.displayName = "EmojiEquip";

EmojiEquip.propTypes = {
  scene: PropTypes.object,
  centerPopupRef: PropTypes.object
};

export { EmojiEquip as default };
