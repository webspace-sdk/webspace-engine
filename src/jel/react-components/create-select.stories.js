import React, { useState, forwardRef } from "react";
import Select, { Option } from "rc-select";
import "../assets/stylesheets/create-select.scss";
import { getMessages } from "../../hubs/utils/i18n";

const Input = forwardRef((props, ref) => <input ref={ref} {...props} />);
Input.displayName = "Input";

const sortedItems = ["image_url", "image_upload", "image_search_bing"];

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

  const options = sortedItems.map(id => (
    <Option tokens={messages[`create-select.${id}.tokens`]} key={id}>
      {messages[`create-select.${id}.title`]}
    </Option>
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
