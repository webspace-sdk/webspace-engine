import React, { useState } from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";
import styled from "styled-components";
import { PopupPanelMenuArrow } from "./popup-panel-menu";
import callOutIcon from "../../assets/jel/images/icons/call-out.svgi";
import callEndIcon from "../../assets/jel/images/icons/call-end.svgi";
import DeviceSelectorPopup from "./device-selector-popup";
import { BigIconButton } from "./icon-button";
import Tooltip from "./tooltip";
import { cancelEventIfFocusedWithin, toggleFocus } from "../utils/dom-utils";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
import { usePopper } from "react-popper";
import { useSingleton } from "@tippyjs/react";
import { getMessages } from "../../hubs/utils/i18n";
import SmallActionButton from "./small-action-button";

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

const SelfName = styled.div`
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

const IdentityName = styled.div`
  width: 100%;
  color: var(--panel-small-banner-text-secondary-color);
  font-weight: var(--panel-small-banner-text-secondary-weight);
  font-size: var(--panel-small-banner-text-secondary-size);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
`;

const DisplayName = styled.div`
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

const DeviceControls = styled.div`
  display: flex;
  margin-right: 18px;
  flex: 0 0 fit-content;
`;

const BridgePanel = ({ scene }) => {
  const [tipSource, tipTarget] = useSingleton();
  const [deviceSelectorReferenceElement, setDeviceSelectorReferenceElement] = useState(null);
  const [deviceSelectorElement, setDeviceSelectorElement] = useState(null);
  const [deviceSelectorArrowElement, setDeviceSelectorArrowElement] = useState(null);

  const {
    styles: deviceSelectorStyles,
    attributes: deviceSelectorAttributes,
    update: updateDeviceSelectorPopper
  } = usePopper(deviceSelectorReferenceElement, deviceSelectorElement, {
    placement: "top",
    modifiers: [
      {
        name: "offset",
        options: {
          offset: [0, 28]
        }
      },
      {
        name: "arrow",
        options: { element: deviceSelectorArrowElement }
      }
    ]
  });

  const messages = getMessages();
  const connected = true;

  return (
    <BridgePanelElement>
      <Tooltip singleton={tipSource} />
      {!connected && (
        <Connect>
          <SmallActionButton
            iconSrc={callOutIcon}
            ref={setDeviceSelectorReferenceElement}
            onClick={() => {
              //updateDeviceSelectorPopper();
              //toggleFocus(deviceSelectorElement);
              console.log("hi");
            }}
          >
            <FormattedMessage id="nav.connect-zoom" />
          </SmallActionButton>
        </Connect>
      )}
      {connected && (
        <SelfName>
          <IdentityName>Connected to Zoom</IdentityName>
          <DisplayName>3823-2039-2930</DisplayName>
        </SelfName>
      )}
      {connected && (
        <DeviceControls>
          <Tooltip content={messages["bridge.end-call"]} placement="top" key="mute" singleton={tipTarget}>
            <BigIconButton
              style={{ margin: 0 }}
              smallIcon={true}
              iconSrc={callEndIcon}
              onClick={() => {
                console.log("end call");
              }}
            />
          </Tooltip>
        </DeviceControls>
      )}
      <DeviceSelectorPopup
        scene={scene}
        setPopperElement={setDeviceSelectorElement}
        styles={deviceSelectorStyles}
        attributes={deviceSelectorAttributes}
      >
        <PopupPanelMenuArrow
          ref={setDeviceSelectorArrowElement}
          style={deviceSelectorStyles.arrow}
          className={sharedStyles.popperArrow}
        />
      </DeviceSelectorPopup>
    </BridgePanelElement>
  );
};

BridgePanel.propTypes = {
  scene: PropTypes.object
};

export { BridgePanel as default };
