/*import React from "react";
import ReactDOM from "react-dom";
import { HashRouter, Route } from "react-router-dom";*/

import "../assets/stylesheets/index.scss";
import Store from "../../storage/store";
import { fetchReticulumAuthenticated } from "../../utils/phoenix-utils";

const store = new Store();
window.APP = { store };

async function checkForLoginRedirect() {
  const accountId = store.credentialsAccountId;
  if (!accountId) return;

  let orgId = store.state && store.state.context && store.state.context.orgId;

  const res = await fetchReticulumAuthenticated(`/api/v1/accounts/${accountId}`);

  if (res.memberships.length === 0) return;

  if (!orgId) {
    orgId = [...res.memberships].sort(m => m.joined_at).pop().org_id;
    store.update({ context: { org_id: orgId } });
  }

  const homeHub = res.memberships.filter(m => m.org_id === orgId)[0].home_hub;

  if (homeHub) {
    document.location = homeHub.url;
  }
}

checkForLoginRedirect();
