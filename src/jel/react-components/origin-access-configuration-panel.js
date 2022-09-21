import React, { useState, useCallback, forwardRef } from "react";
import { PanelWrap, Info, Tip, TextInputWrap, Input } from "./form-components";
import PanelSectionHeader from "./panel-section-header";
import { FormattedMessage } from "react-intl";
import { handleTextFieldFocus, handleTextFieldBlur } from "../../hubs/utils/focus-utils";
import SegmentControl from "./segment-control";
import SmallActionButton from "./small-action-button";
import PropTypes from "prop-types";
import { getMessages } from "../../hubs/utils/i18n";
import githubOnIcon from "../../assets/jel/images/icons/github-on.svgi";
import githubOffIcon from "../../assets/jel/images/icons/github-off.svgi";
import webdavOnIcon from "../../assets/jel/images/icons/webdav-on.svgi";
import webdavOffIcon from "../../assets/jel/images/icons/webdav-off.svgi";

//  <Tip>
//    <FormattedMessage id="create-hub-popup.tip" />&nbsp;
//  </Tip>
//  <form
//    autoComplete="off"
//    onSubmit={async e => {
//      e.preventDefault();
//      e.stopPropagation();
//      const { atomAccessManager } = window.APP;
//      if (!filename) return;

//      setCreating(true);
//      const exists = await atomAccessManager.fileExists(filename);
//      setExists(exists);

//      if (exists) {
//        setCreating(false);
//        ref.current.focus();
//        return;
//      }

//      await onCreate(name, filename);
//    }}
//  >
//    <TextInputWrap>
//      <Input
//        ref={ref}
//        type="text"
//        name="name"
//        value={name}
//        required
//        placeholder={messages["create-hub-popup.name-placeholder"]}
//        min="3"
//        max="64"
//        title={messages["create-hub-popup.name-validation-warning"]}
//        onFocus={e => handleTextFieldFocus(e.target)}
//        onBlur={e => handleTextFieldBlur(e.target)}
//        onChange={e => {
//          if (creating) {
//            e.preventDefault();
//            return;
//          }

//          const name = e.target.value;
//          setExists(false);
//          setName(name);
//          setFilename(
//            name
//              .replace(/ +/g, "-")
//              .replace(/[^a-z0-9-]/gi, "")
//              .toLowerCase() + ".html"
//          );
//        }}
//      />
//    </TextInputWrap>
//    {exists &&
//      !creating && (
//        <Tip style={{ lineHeight: "24px" }}>
//          <FormattedMessage id="create-hub-popup.exists" />&nbsp;
//        </Tip>
//      )}
//    {!exists &&
//      !creating && (
//        <Tip style={{ lineHeight: "24px" }}>
//          {name && filename ? (
//            <span>
//              <FormattedMessage id="create-hub-popup.dest-prefix" />&nbsp;{filename}
//            </span>
//          ) : (
//            <span>
//              <FormattedMessage id="create-hub-popup.dest-empty" />
//            </span>
//          )}
//        </Tip>
//      )}
//    {creating && (
//      <Tip style={{ lineHeight: "24px" }}>
//        <LoadingSpinner style={{ marginRight: "8px" }} />
//        <span>
//          <FormattedMessage id="create-hub-popup.waiting-for-deploy" />
//        </span>
//      </Tip>
//    )}
//    <SmallActionButton disabled={!filename || !!exists || creating} type="submit">
//      <FormattedMessage id="create-hub-popup.create-world" />
//    </SmallActionButton>
//  </form>

const OriginAccessConfigurationPanel = forwardRef(({}, ref) => {
  const messages = getMessages();
  const [originType, setOriginType] = useState("github");
  const [user, setUser] = useState("");
  const [repo, setRepo] = useState("");
  const [secret, setSecret] = useState("");
  const [branch, setBranch] = useState("");
  const [confirming, setConfirming] = useState(false);

  const typeToggleOnChange = useCallback(
    () => {
      if (originType === "github") {
        setOriginType("webdav");
      } else {
        setOriginType("github");
      }
    },
    [setOriginType, originType]
  );

  return (
    <PanelWrap>
      <PanelSectionHeader style={{ whiteSpace: "nowrap", justifyContent: "space-between", width: "100%" }}>
        <div style={{ whiteSpace: "nowrap", marginRight: "24px" }}>
          <FormattedMessage id="origin-access-config.title" />
        </div>
        <SegmentControl
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
        />
      </PanelSectionHeader>
      {originType === "github" && (
        <>
          <Info>
            <FormattedMessage id="origin-access-config.info" />
          </Info>
          <Tip>
            <FormattedMessage id="origin-access-config.tip" />
          </Tip>
          <form
            autoComplete="off"
            onSubmit={async e => {
              e.preventDefault();
              e.stopPropagation();
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
                  value={branch}
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
                  value={user}
                  required
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
            <SmallActionButton
              disabled={!confirming || (originType === "github" && (!user || !repo || !secret))}
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
OriginAccessConfigurationPanel.propTypes = {};

export { OriginAccessConfigurationPanel as default };
