import React, { useState, useEffect } from "react";
import { IntlProvider, FormattedMessage } from "react-intl";
import PropTypes from "prop-types";
import { lang, messages } from "../../utils/i18n";
import styled, { ThemeProvider } from "styled-components";
import { createSpace } from "../../utils/phoenix-utils";

const base = {
  text: "white",
  panelBg: "black"
};

const NewWrap = styled.div``;

function NewUI({ onSpaceCreated }) {
  const [name, setName] = useState("");

  useEffect(() => (document.title = "Setup"), []);

  const onSubmit = async e => {
    e.preventDefault();
    const { space_id } = await createSpace(name);
    window.APP.store.update({ context: { spaceId: space_id } });
    onSpaceCreated();
  };

  return (
    <ThemeProvider theme={base}>
      <IntlProvider locale={lang} messages={messages}>
        <NewWrap>
          <form onSubmit={onSubmit}>
            <input required name="name" type="text" value={name} onChange={e => setName(e.target.value)} />
            <button type="submit">
              <FormattedMessage id="new-space.create" />
            </button>
          </form>
        </NewWrap>
      </IntlProvider>
    </ThemeProvider>
  );
}

NewUI.propTypes = {
  onSpaceCreated: PropTypes.func
};

export default NewUI;
