import React, { useState, forwardRef, useRef } from "react";
import { PanelWrap, Info, Tip, TextInputWrap, Input } from "./form-components";
import PanelSectionHeader from "./panel-section-header";
import { FormattedMessage } from "react-intl";
import { handleTextFieldFocus, handleTextFieldBlur } from "../utils/focus-utils";
//import SegmentControl from "./segment-control";
import SmallActionButton from "./small-action-button";
import PropTypes from "prop-types";
import { getMessages } from "../utils/i18n";
//import githubOnIcon from "../../assets/images/icons/github-on.svgi";
//import githubOffIcon from "../../assets/images/icons/github-off.svgi";
//import webdavOnIcon from "../../assets/images/icons/webdav-on.svgi";
//import webdavOffIcon from "../../assets/images/icons/webdav-off.svgi";
import LoadingSpinner from "./loading-spinner";

const OriginAccessConfigurationPanel = forwardRef(({ onConnectClicked, failedOriginState }, ref) => {
  const messages = getMessages();
  const [originType /*, setOriginType*/] = useState("github");
  const [user, setUser] = useState("");
  const [org, setOrg] = useState("");
  const [repo, setRepo] = useState("");
  const [secret, setSecret] = useState("");
  const [branch, setBranch] = useState("");
  const [confirming, setConfirming] = useState(false);

  const rootRef = useRef();

  //const typeToggleOnChange = useCallback(
  //  () => {
  //    if (originType === "github") {
  //      setOriginType("webdav");
  //    } else {
  //      setOriginType("github");
  //    }
  //  },
  //  [setOriginType, originType]
  //);

  return (
    <PanelWrap ref={rootRef}>
      <PanelSectionHeader style={{ whiteSpace: "nowrap", justifyContent: "space-between", width: "100%" }}>
        <div style={{ whiteSpace: "nowrap", marginRight: "24px" }}>
          <FormattedMessage id="origin-access-config.title" />
        </div>
        {/*<SegmentControl
          rows={1}
          cols={2}
          items={[
            {
              id: "origin-access-config.github",
              text: messages["origin-access-config.github"],
              iconSrc: githubOnIcon,
              offIconSrc: githubOffIcon
            },
            {
              id: "origin-access-config.webdav",
              text: messages["origin-access-config.webdav"],
              iconSrc: webdavOnIcon,
              offIconSrc: webdavOffIcon
            }
          ]}
          selectedIndices={originType === "github" ? [0] : [1]}
          onChange={typeToggleOnChange}
        />*/}
      </PanelSectionHeader>
      {originType === "github" && (
        <>
          <Info>
            <FormattedMessage id="origin-access-config.info" />
          </Info>
          <Tip style={{ lineHeight: "24px" }}>
            {!confirming && !failedOriginState && <FormattedMessage id="origin-access-config.tip" />}
            {confirming && (
              <>
                <LoadingSpinner style={{ marginRight: "8px" }} />
                <FormattedMessage id="origin-access-config.confirming" />
              </>
            )}
            {!confirming &&
              failedOriginState && (
                <FormattedMessage id={`origin-access-config.error-${originType}-${failedOriginState}`} />
              )}
          </Tip>
          <form
            autoComplete="off"
            onSubmit={async e => {
              e.preventDefault();
              e.stopPropagation();
              setConfirming(true);
              rootRef.current.parentNode.parentNode.focus();
              await onConnectClicked({ type: originType, user, org, repo, secret, branch });
              setConfirming(false);
            }}
          >
            <TextInputWrap>
              <Input
                ref={ref}
                type="text"
                name="user"
                value={user}
                required
                placeholder={messages[`origin-access-config.${originType}-user-placeholder`]}
                min="3"
                max="64"
                onFocus={e => handleTextFieldFocus(e.target)}
                onBlur={e => handleTextFieldBlur(e.target)}
                onChange={e => {
                  if (confirming) {
                    e.preventDefault();
                    return;
                  }

                  setUser(e.target.value);
                }}
              />
            </TextInputWrap>
            {originType === "github" && (
              <TextInputWrap>
                <Input
                  ref={ref}
                  autocomplete="off"
                  type="password"
                  name="secret"
                  value={secret}
                  required
                  placeholder={messages[`origin-access-config.${originType}-secret-placeholder`]}
                  min="3"
                  max="64"
                  onFocus={e => handleTextFieldFocus(e.target)}
                  onBlur={e => handleTextFieldBlur(e.target)}
                  onChange={e => {
                    if (confirming) {
                      e.preventDefault();
                      return;
                    }

                    setSecret(e.target.value);
                  }}
                />
              </TextInputWrap>
            )}
            {originType === "github" && (
              <TextInputWrap>
                <Input
                  ref={ref}
                  type="text"
                  name="repo"
                  value={repo}
                  required
                  placeholder={messages[`origin-access-config.${originType}-repo-placeholder`]}
                  min="3"
                  max="64"
                  onFocus={e => handleTextFieldFocus(e.target)}
                  onBlur={e => handleTextFieldBlur(e.target)}
                  onChange={e => {
                    if (confirming) {
                      e.preventDefault();
                      return;
                    }

                    setRepo(e.target.value);
                  }}
                />
              </TextInputWrap>
            )}
            {originType === "github" && (
              <TextInputWrap>
                <Input
                  ref={ref}
                  type="text"
                  name="branch"
                  value={branch}
                  placeholder={messages[`origin-access-config.${originType}-branch-placeholder`]}
                  min="3"
                  max="64"
                  onFocus={e => handleTextFieldFocus(e.target)}
                  onBlur={e => handleTextFieldBlur(e.target)}
                  onChange={e => {
                    if (confirming) {
                      e.preventDefault();
                      return;
                    }

                    setBranch(e.target.value);
                  }}
                />
              </TextInputWrap>
            )}
            {originType === "github" && (
              <TextInputWrap>
                <Input
                  ref={ref}
                  type="text"
                  name="org"
                  value={org}
                  placeholder={messages[`origin-access-config.${originType}-org-placeholder`]}
                  min="3"
                  max="64"
                  onFocus={e => handleTextFieldFocus(e.target)}
                  onBlur={e => handleTextFieldBlur(e.target)}
                  onChange={e => {
                    if (confirming) {
                      e.preventDefault();
                      return;
                    }

                    setOrg(e.target.value);
                  }}
                />
              </TextInputWrap>
            )}
            <SmallActionButton
              disabled={confirming || (originType === "github" && (!user || !repo || !secret))}
              type="submit"
            >
              <FormattedMessage id={`origin-access-config.save-${originType}`} />
            </SmallActionButton>
          </form>
        </>
      )}
      {originType === "webdav" && (
        <Info>
          <FormattedMessage id="origin-access-config.webdav-soon" />
        </Info>
      )}
    </PanelWrap>
  );
});

OriginAccessConfigurationPanel.displayName = "OriginAccessConfigurationPanel";
OriginAccessConfigurationPanel.propTypes = {
  onConnectClicked: PropTypes.func,
  failedOriginState: PropTypes.number
};

export { OriginAccessConfigurationPanel as default };
