import Store from "./hubs/storage/store";
import AccountChannel from "./jel/utils/account-channel";
import { connectToReticulum } from "./hubs/utils/phoenix-utils";

const store = new Store();
const { token } = store.state.credentials;
const qs = new URLSearchParams(location.search);
const accountChannel = new AccountChannel();

(async () => {
  const socket = await connectToReticulum();
  const accountPhxChannel = socket.channel(`account:${store.credentialsAccountId}`, {
    auth_token: token,
    account_id_needing_support: qs.get("account_id")
  });

  accountPhxChannel.join().receive("ok", () => {});
  accountChannel.bind(accountPhxChannel);
  document.body.innerHTML = "Waiting for reply";

  accountChannel.addEventListener("support_response", ({ detail }) => {
    if (detail.invite_url) {
      document.body.innerHTML = "OK!";
      document.location = detail.invite_url;
    } else {
      document.body.innerHTML = `
        <div style="width: 500px; height: 500px; color: white; background-color: #333; position: absolute;">
          ${detail.response}
        </div>
      `;
    }
  });
})();
