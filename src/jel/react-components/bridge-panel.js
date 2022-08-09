import React, { useState, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";
import styled from "styled-components";
import { PopupPanelMenuArrow } from "./popup-panel-menu";
import callOutIcon from "../../assets/jel/images/icons/call-out.svgi";
import callEndIcon from "../../assets/jel/images/icons/call-end.svgi";
import BridgeStartPopup from "./bridge-start-popup";
import { BigIconButton } from "./icon-button";
import Tooltip from "./tooltip";
import { cancelEventIfFocusedWithin, toggleFocus } from "../utils/dom-utils";
import { usePopper } from "react-popper";
import { useSingleton } from "@tippyjs/react";
import { getMessages } from "../../hubs/utils/i18n";
import SmallActionButton from "./small-action-button";

const isFirefox = navigator.userAgent.toLowerCase().indexOf("firefox") > -1;

const BridgePanelElement = styled.div`
  flex: 1 1 auto;
  width: 100%;
  min-height: 60px;
  height: 60px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-direction: row;
  background-color: var(--secondary-panel-background-color);
  color: var(--secondary-panel-text-color);
  align-self: flex-end;
  z-index: 10;
`;

const ConnectedPanel = styled.div`
  display: flex;
  flex: 1 1;
  justify-content: space-around;
  flex-direction: column;
  align-items: flex-start;
  margin: 12px 8px 12px 16px;
  min-width: 0;
`;

const Connect = styled.div`
  display: flex;
  flex: 1 1;
  justify-content: space-around;
  flex-direction: column;
  align-items: center;
  margin: 12px 8px;
  min-width: 0;
  cursor: pointer;
`;

const ConnectedTitle = styled.div`
  width: 100%;
  color: var(--panel-small-banner-text-secondary-color);
  font-weight: var(--panel-small-banner-text-secondary-weight);
  font-size: var(--panel-small-banner-text-secondary-size);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
`;

const ConnectedInfo = styled.div`
  width: 100%;
  flex: 0 0 100%;
  color: var(--panel-small-banner-text-color);
  font-weight: var(--panel-small-banner-text-weight);
  font-size: var(--panel-small-banner-text-size);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
`;

const BridgeControls = styled.div`
  display: flex;
  margin-right: 18px;
  flex: 0 0 fit-content;
`;

const BridgePanel = ({ scene, spaceCan }) => {
  const [tipSource, tipTarget] = useSingleton();
  const [bridgeStartReferenceElement, setBridgeStartReferenceElement] = useState(null);
  const [bridgeStartElement, setBridgeStartElement] = useState(null);
  const [bridgeStartArrowElement, setBridgeStartArrowElement] = useState(null);
  const [meetingId, setMeetingId] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [failed, setFailed] = useState(false);
  const bridgePopupRef = useRef();

  const { styles: bridgeStartStyles, attributes: bridgeStartAttributes, update: updateBridgeStartPopper } = usePopper(
    bridgeStartReferenceElement,
    bridgeStartElement,
    {
      placement: "top-end",
      modifiers: [
        {
          name: "offset",
          options: {
            offset: [0, 28]
          }
        },
        {
          name: "arrow",
          options: { element: bridgeStartArrowElement }
        }
      ]
    }
  );

  const messages = getMessages();

  const onConnect = useCallback(
    async (meetingId, meetingPassword, useHD, shareInvite) => {
      bridgeStartElement.focus(); // Keep panel open
      setConnecting(true);
      setConnected(false);
      setFailed(false);

      const formattedMeetingId = `${meetingId.substring(0, 3)} ${meetingId.substring(4, 8)} ${meetingId.substring(7)}`;

      try {
        await SYSTEMS.videoBridgeSystem.startBridge("zoom", meetingId, meetingPassword, useHD, shareInvite);
        setConnected(true);
        setConnecting(false);
        setMeetingId(formattedMeetingId);
      } catch (e) {
        bridgeStartElement.focus(); // Keep panel open
        setConnected(false);
        setConnecting(false);
        setFailed(true);
      }
    },
    [bridgeStartElement, setConnected, setFailed, setConnecting, setMeetingId]
  );

  const onCancel = useCallback(
    async () => {
      bridgeStartElement.focus(); // Keep panel open
      setConnecting(false);
      setConnected(false);
      setFailed(false);

      SYSTEMS.videoBridgeSystem.exitBridge();
    },
    [bridgeStartElement, setConnected, setFailed, setConnecting]
  );

  return (
    <BridgePanelElement>
      <Tooltip singleton={tipSource} />
      {!connected && (
        <Connect>
          {!isFirefox && (
            <SmallActionButton
              iconSrc={callOutIcon}
              onMouseDown={e => cancelEventIfFocusedWithin(e, bridgeStartElement)}
              ref={setBridgeStartReferenceElement}
              onClick={() => {
                updateBridgeStartPopper();

                if (connecting) {
                  toggleFocus(bridgeStartElement);
                } else {
                  toggleFocus(bridgePopupRef.current);
                }
              }}
            >
              <FormattedMessage id="bridge.connect-zoom" />
            </SmallActionButton>
          )}
          {isFirefox && (
            <Tooltip content={messages["bridge.firefox-unsupported"]} delay={0} placement="top" key="ff-zoom">
              <SmallActionButton iconSrc={callOutIcon} style={{ opacity: 0.5 }}>
                <FormattedMessage id="bridge.connect-zoom" />
              </SmallActionButton>
            </Tooltip>
          )}
        </Connect>
      )}
      {connected && (
        <ConnectedPanel>
          <ConnectedTitle>
            <FormattedMessage id="bridge.connected-to-zoom" />
          </ConnectedTitle>
          <ConnectedInfo>{meetingId}</ConnectedInfo>
        </ConnectedPanel>
      )}
      {connected && (
        <BridgeControls>
          <Tooltip content={messages["bridge.end-call"]} placement="top" key="mute" singleton={tipTarget}>
            <BigIconButton
              style={{ margin: 0 }}
              smallIcon={true}
              iconSrc={callEndIcon}
              onClick={() => {
                SYSTEMS.videoBridgeSystem.exitBridge();
                setConnected(false);
                setFailed(false);
                setConnecting(false);
              }}
            />
          </Tooltip>
        </BridgeControls>
      )}
      <BridgeStartPopup
        scene={scene}
        ref={bridgePopupRef}
        setPopperElement={setBridgeStartElement}
        styles={bridgeStartStyles}
        attributes={bridgeStartAttributes}
        onConnect={onConnect}
        onCancel={onCancel}
        connecting={connecting}
        failed={failed}
        allowInvite={spaceCan("create_invite")}
      >
        <PopupPanelMenuArrow
          ref={setBridgeStartArrowElement}
          style={bridgeStartStyles.arrow}
          className="popper-arrow"
        />
      </BridgeStartPopup>
    </BridgePanelElement>
  );
};

BridgePanel.propTypes = {
  scene: PropTypes.object,
  spaceCan: PropTypes.func
};

export { BridgePanel as default };
