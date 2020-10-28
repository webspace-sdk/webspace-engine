import PropTypes from "prop-types";
import styled from "styled-components";
import React, { useState, forwardRef, useCallback } from "react";
import Select, { Option, OptGroup } from "rc-select";
import "../assets/stylesheets/create-select.scss";
import { getMessages } from "../../hubs/utils/i18n";
import trashIconSrc from "../assets/images/icons/trash.svgi";

const items = [
  ["images", [["image_url", trashIconSrc, null], ["image_upload", null, null], ["image_search_bing", null, null]]]
];

const CreateSelectInputElement = styled.input``;

const CreateSelectItemElement = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
`;
const CreateSelectItemThumb = styled.div`
  width: 54px;
  height: 54px;
  min-width: 54px;
  margin-right: 12px;
  border: 2px solid var(--menu-border-color);
  border-radius: 4px;
`;
const CreateSelectItemBody = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  flex: 1 1;
  max-width: 260px;
`;
const CreateSelectItemTitle = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  min-width: 0;
  text-overflow: ellipsis;
  color: var(--panel-banner-text-color);
`;
const CreateSelectItemTitleIcon = styled.div`
  width: 20px;
  height: 20px;
  margin-top: 2px;
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
  margin-top: 3px;
`;

const CreateSelectItem = ({ title, description, iconSrc, thumbSrc }) => (
  <CreateSelectItemElement>
    <CreateSelectItemThumb src={thumbSrc} />
    <CreateSelectItemBody>
      <CreateSelectItemTitle>
        {iconSrc && <CreateSelectItemTitleIcon dangerouslySetInnerHTML={{ __html: iconSrc }} />}
        <CreateSelectItemTitleText>{title}</CreateSelectItemTitleText>
      </CreateSelectItemTitle>
      <CreateSelectItemDescription>{description}</CreateSelectItemDescription>
    </CreateSelectItemBody>
  </CreateSelectItemElement>
);

CreateSelectItem.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  iconSrc: PropTypes.string,
  thumbSrc: PropTypes.string
};

const CreateSelectInput = forwardRef((props, ref) => <input {...props} ref={ref} tabIndex={-1} />);
CreateSelectInput.displayName = "CreateSelectInput";

const CreateSelect = forwardRef((props, ref) => {
  const [value, setValue] = useState("");
  const messages = getMessages();

  const jump = v => {
    console.log("jump ", v);
    // location.href = 'https://s.taobao.com/search?q=' + encodeURIComponent(v);
  };

  const onSelect = value => {
    console.log("select ", value);
    jump(value);
  };

  const fetchData = value => {
    setValue(value);
  };

  const onKeyDown = e => {
    if (e.keyCode === 13) {
      console.log("onEnter", value);
      jump(value);
    }
  };

  const filterByTokenMatch = (value, { tokens }) => {
    const search = value.replace(/  */g, " ").replace(/ *$/, "");
    if (search === "") return true;
    console.log(search);

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

    return matchCount === vs.length;
  };

  const options = items.map(([groupName, groupItems]) => (
    <OptGroup key={groupName} label={messages[`create-select.${groupName}_group.title`]}>
      {groupItems.map(([id, iconSrc, thumbSrc]) => (
        <Option tokens={messages[`create-select.${id}.tokens`]} key={id}>
          <CreateSelectItem
            title={messages[`create-select.${id}.title`]}
            description={messages[`create-select.${id}.description`]}
            iconSrc={iconSrc}
            thumbSrc={thumbSrc}
          />
        </Option>
      ))}
    </OptGroup>
  ));

  return (
    <div>
      <div onKeyDown={onKeyDown}>
        <Select
          virtual={false}
          prefixCls="create-select"
          style={{ width: 375 }}
          mode="combobox"
          value={value}
          placeholder={messages["create-select.placeholder"]}
          defaultActiveFirstOption
          ref={ref}
          getInputElement={useCallback(() => {
            return <CreateSelectInput id="create-select-input" />;
          }, [])}
          showArrow={false}
          showAction={["focus", "click"]}
          notFoundContent=""
          onChange={fetchData}
          onSelect={onSelect}
          getPopupContainer={props.getPopupContainer}
          filterOption={filterByTokenMatch}
        >
          {options}
        </Select>
      </div>
    </div>
  );
});

CreateSelect.displayName = "CreateSelect";
CreateSelect.propTypes = {
  getPopupContainer: PropTypes.func
};

export { CreateSelect as default };
