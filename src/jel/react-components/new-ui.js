import React, { useState /*, useEffect, useMemo, useRef*/ } from "react";
import { IntlProvider, FormattedMessage } from "react-intl";
//import PropTypes from "prop-types";
import { lang, messages } from "../../utils/i18n";
import styled, { ThemeProvider } from "styled-components";
import { createOrg } from "../../utils/phoenix-utils";

const base = {
  text: "white",
  panelBg: "black"
};

const NewWrap = styled.div``;

function NewUI() {
  const [name, setName] = useState("");

  const onSubmit = async e => {
    e.preventDefault();
    const { org_id } = await createOrg(name);
    window.APP.store.update({ context: { orgId: org_id } });
    document.location = "/";
  };

  return (
    <ThemeProvider theme={base}>
      <IntlProvider locale={lang} messages={messages}>
        <form onSubmit={onSubmit}>
          <input required name="name" type="text" value={name} onChange={e => setName(e.target.value)} />
          <button type="submit">
            <FormattedMessage id="new-org.create" />
          </button>
        </form>
        <NewWrap>Hello</NewWrap>
      </IntlProvider>
    </ThemeProvider>
  );
}

NewUI.propTypes = {};

export default NewUI;
