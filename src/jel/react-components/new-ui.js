import React, { useState, useEffect } from "react";
import { FormattedMessage } from "react-intl";
import { WrappedIntlProvider } from "../../hubs/react-components/wrapped-intl-provider";
import PropTypes from "prop-types";
import styled, { ThemeProvider } from "styled-components";
import { createSpace } from "../../hubs/utils/phoenix-utils";

const base = {
  text: "white",
  panelBg: "black"
};

const NewWrap = styled.div``;

function NewUI({ onSpaceCreated }) {
  const [name, setName] = useState("");

  useEffect(() => {
    document.title = "Create Space";
  }, []);

  const onSubmit = async e => {
    e.preventDefault();
    const { space_id } = await createSpace(name);
    window.APP.store.update({ context: { spaceId: space_id } });
    onSpaceCreated();
  };

  return (
    <ThemeProvider theme={base}>
      <WrappedIntlProvider>
        <NewWrap>
          <form onSubmit={onSubmit}>
            <input required name="name" type="text" value={name} onChange={e => setName(e.target.value)} />
            <button type="submit">
              <FormattedMessage id="new-space.create" />
            </button>
          </form>
        </NewWrap>
      </WrappedIntlProvider>
    </ThemeProvider>
  );
}

NewUI.propTypes = {
  onSpaceCreated: PropTypes.func
};

export default NewUI;
