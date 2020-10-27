import PropTypes from "prop-types";
import styled from "styled-components";
import React, { useState, forwardRef } from "react";
import Select, { Option, OptGroup } from "rc-select";
import "../assets/stylesheets/create-select.scss";
import { getMessages } from "../../hubs/utils/i18n";

const Input = forwardRef((props, ref) => <input ref={ref} {...props} />);
Input.displayName = "Input";

const items = [
  ["images", [["image_url", null, null], ["image_upload", null, null], ["image_search_bing", null, null]]]
];

const CreateSelectItemElement = styled.div``;
const CreateSelectItemThumb = styled.div``;
const CreateSelectItemBody = styled.div``;
const CreateSelectItemTitle = styled.div``;
const CreateSelectItemTitleIcon = styled.div``;
const CreateSelectItemTitleText = styled.div``;
const CreateSelectItemDescription = styled.div``;

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

    const ts = tokens.split(" ");
    const vs = search.toLowerCase().split(" ");
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
          prefixCls="create-select"
          style={{ width: 500 }}
          mode="combobox"
          value={value}
          placeholder="placeholder"
          defaultActiveFirstOption
          getInputElement={() => <Input ref={ref} />}
          showArrow={false}
          showAction={["focus", "click"]}
          notFoundContent=""
          onChange={fetchData}
          onSelect={onSelect}
          filterOption={filterByTokenMatch}
        >
          {options}
        </Select>
      </div>
    </div>
  );
});

CreateSelect.displayName = "CreateSelect";

export const Basic = () => {
  const ref = React.createRef();

  setTimeout(() => {
    console.log(ref.current);
    ref.current.focus();
  }, 500);

  return (
    <div
      style={{
        background: "linear-gradient(177deg, rgba(2,0,85,1) 0%, rgba(16,16,170,1) 10%, rgba(0,212,255,1) 100%)",
        display: "flex",
        width: "800px",
        height: "800px",
        marginTop: "32px",
        flexDirection: "column"
      }}
    >
      <div style={{ position: "absolute", top: "200px", left: "200px" }}>
        <CreateSelect ref={ref} />
      </div>
    </div>
  );
};

export default {
  title: "Create Select"
};
