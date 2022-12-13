import PropTypes from "prop-types";
import styled from "styled-components";
import React, { useCallback, useMemo, useRef, useState, forwardRef } from "react";
import Select, { Option, OptGroup } from "rc-select";
import { getMessages } from "../utils/i18n";
import { handleTextFieldFocus, handleTextFieldBlur } from "../utils/focus-utils";
import uploadIconSrc from "../assets/images/icons/upload.svgi";
import linkIconSrc from "../assets/images/icons/link.svgi";
import heartIconSrc from "../assets/images/icons/heart.svgi";
import newPageIconSrc from "../assets/images/icons/page.svgi";
import cubeIconSrc from "../assets/images/icons/cube.svgi";
import screenIconSrc from "../assets/images/icons/screen.svgi";
import videoThumbSrc from "!!url-loader!../assets/images/icons/thumb-video.svg";
import imageThumbSrc from "!!url-loader!../assets/images/icons/thumb-image.svg";
import pageThumbSrc from "!!url-loader!../assets/images/icons/thumb-page.svg";
import duckThumbSrc from "!!url-loader!../assets/images/icons/thumb-duck.svg";
import pdfThumbSrc from "!!url-loader!../assets/images/icons/thumb-pdf.svg";
import modelThumbSrc from "!!url-loader!../assets/images/icons/thumb-model.svg";
import labelThumbSrc from "!!url-loader!../assets/images/icons/thumb-label.svg";
import bannerThumbSrc from "!!url-loader!../assets/images/icons/thumb-banner.svg";
import voxmojiThumbSrc from "!!url-loader!../assets/images/icons/thumb-voxmoji.svg";
import screenThumbSrc from "!!url-loader!../assets/images/icons/thumb-screen.svg";
import { useRefFocusResetter } from "../utils/shared-effects";

export const CREATE_SELECT_WIDTH = 325;
export const CREATE_SELECT_LIST_HEIGHT = 350;

const items = [
  [
    "text",
    [
      ["label", newPageIconSrc, labelThumbSrc],
      ["page", newPageIconSrc, pageThumbSrc],
      ["banner", newPageIconSrc, bannerThumbSrc]
    ]
  ],
  [
    "objects",
    [
      ["screen", screenIconSrc, screenThumbSrc],
      ["vox", cubeIconSrc, modelThumbSrc],
      ["voxmoji", cubeIconSrc, voxmojiThumbSrc]
    ]
  ],
  ["images", [["image_embed", linkIconSrc, imageThumbSrc], ["image_upload", uploadIconSrc, imageThumbSrc]]],
  ["videos", [["video_embed", linkIconSrc, videoThumbSrc], ["video_upload", uploadIconSrc, videoThumbSrc]]],
  ["models", [["model_embed", linkIconSrc, modelThumbSrc], ["model_upload", uploadIconSrc, modelThumbSrc]]],
  ["docs", [["pdf_embed", linkIconSrc, pdfThumbSrc], ["pdf_upload", uploadIconSrc, pdfThumbSrc]]],
  ["tools", [["duck", heartIconSrc, duckThumbSrc]]]
];

const CreateSelectInputElement = styled.input``;

const CreateSelectItemElement = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
`;
const CreateSelectItemThumb = styled.img`
  width: 54px;
  height: 54px;
  min-width: 54px;
  margin-right: 12px;
  border: 2px solid var(--dropdown-thumb-border-color);
  border-radius: 8px;
  background-color: var(--dropdown-thumb-background-color);
  padding: 6px;
`;
const CreateSelectItemBody = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  flex: 1 1;
  max-width: 260px;
  margin-left: 2px;
`;
const CreateSelectItemTitle = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  min-width: 0;
  height: 20px;
  text-overflow: ellipsis;
  color: var(--panel-banner-text-color);
  width: 100%;
`;
const CreateSelectItemTitleIcon = styled.div`
  width: 22px;
  height: 22px;
  margin-top: 7px;
  margin-right: 6px;
  color: var(--panel-text-color);
`;

const CreateSelectItemTitleText = styled.div`
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 20px;
`;
const CreateSelectItemDescription = styled.div`
  width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--panel-text-color);
  font-size: var(--panel-subheader-text-size);
  margin-top: 4px;
`;
const CreateSelectItemTag = styled.div`
  color: var(--panel-subheader-text-color);
  font-size: var(--panel-subheader-text-size);
  font-weight: var(--panel-subheader-text-weight);
  text-align: right;
  margin-left: 4px;
`;

const CreateSelectItem = ({ title, description, tag, iconSrc, thumbSrc }) => (
  <CreateSelectItemElement>
    <CreateSelectItemThumb src={thumbSrc} />
    <CreateSelectItemBody>
      <CreateSelectItemTitle>
        {iconSrc && <CreateSelectItemTitleIcon dangerouslySetInnerHTML={{ __html: iconSrc }} />}
        <CreateSelectItemTitleText>{title}</CreateSelectItemTitleText>
        {tag && <CreateSelectItemTag>&lt;{tag}&gt;</CreateSelectItemTag>}
      </CreateSelectItemTitle>
      <CreateSelectItemDescription>{description}</CreateSelectItemDescription>
    </CreateSelectItemBody>
  </CreateSelectItemElement>
);

CreateSelectItem.propTypes = {
  title: PropTypes.string,
  tag: PropTypes.string,
  description: PropTypes.string,
  iconSrc: PropTypes.string,
  thumbSrc: PropTypes.string
};

const CreateSelectInput = forwardRef((props, ref) => <CreateSelectInputElement {...props} ref={ref} tabIndex={-1} />);
CreateSelectInput.displayName = "CreateSelectInput";

const filterByTokenMatch = (value, { tokens }) => {
  const search = value.replace(/  */g, " ").replace(/ *$/, "");
  if (search === "") return true;

  const ts = (tokens || "").split(" ");
  const vs = (search || "").toLowerCase().split(" ");
  let matchCount = 0;

  for (let i = 0; i < ts.length; i++) {
    for (let j = 0; j < vs.length; j++) {
      if (ts[i].startsWith(vs[j])) {
        matchCount++;
        break;
      }
    }
  }

  return matchCount >= vs.length;
};

const CreateSelect = forwardRef((props, ref) => {
  const { onActionSelected } = props;
  const [value, setValue] = useState("");
  const messages = getMessages();
  const inputRef = useRef();

  useRefFocusResetter(
    inputRef,
    useCallback(
      () => {
        setValue(" ");
        setValue("");
      },
      [setValue]
    )
  );

  const onSelect = useCallback(
    v => {
      onActionSelected(v);
      setValue("");
      inputRef.current.blur();
    },
    [onActionSelected]
  );

  const onChange = useCallback(v => setValue(v), []);

  const getInputElement = useCallback(() => {
    return (
      <CreateSelectInput
        ref={inputRef}
        id="create-select-input"
        onFocus={e => handleTextFieldFocus(e.target, true)}
        onBlur={e => {
          handleTextFieldBlur(e.target);
        }}
      />
    );
  }, []);
  const showAction = useMemo(() => ["focus", "click"], []);

  const options = useMemo(
    () =>
      items.map(([groupName, groupItems]) => (
        <OptGroup key={groupName} label={messages[`create-select.${groupName}_group.title`]}>
          {groupItems.map(([id, iconSrc, thumbSrc]) => (
            <Option tokens={messages[`create-select.${id}.tokens`]} key={id}>
              <CreateSelectItem
                title={messages[`create-select.${id}.title`]}
                description={messages[`create-select.${id}.description`]}
                tag={messages[`create-select.${id}.tag`]}
                iconSrc={iconSrc}
                thumbSrc={thumbSrc}
              />
            </Option>
          ))}
        </OptGroup>
      )),
    [messages]
  );

  return (
    <div>
      <Select
        virtual={false}
        listHeight={CREATE_SELECT_LIST_HEIGHT}
        prefixCls="create-select"
        style={{ width: CREATE_SELECT_WIDTH }}
        mode="combobox"
        value={value}
        placeholder={messages["create-select.placeholder"]}
        defaultActiveFirstOption
        ref={ref}
        getInputElement={getInputElement}
        showArrow={false}
        showAction={showAction}
        notFoundContent=""
        onChange={onChange}
        onSelect={onSelect}
        getPopupContainer={props.getPopupContainer}
        filterOption={filterByTokenMatch}
      >
        {options}
      </Select>
    </div>
  );
});

CreateSelect.displayName = "CreateSelect";
CreateSelect.propTypes = {
  getPopupContainer: PropTypes.func,
  onActionSelected: PropTypes.func
};

export { CreateSelect as default };
