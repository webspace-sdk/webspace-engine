import MatrixSdk from "matrix-js-sdk";
import { EventTarget } from "event-target-shim";

export default class Matrix extends EventTarget {
  constructor(store) {
    super();
    this.store = store;
  }

  async init(homeserver, loginToken, expectedUserId) {
    const { store } = this;

    let accessToken = store.state.credentials.matrix_access_token;
    let userId = null;

    // Check validity of current access token
    if (accessToken) {
      await new Promise(res => {
        fetch(`https://${homeserver}/_matrix/client/r0/account/whoami`, {
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${accessToken}`
          }
        }).then(response => {
          if (response.status !== 200) {
            accessToken = null;
            res();
          } else {
            response.json().then(whoami => {
              const currentUserId = whoami["user_id"];

              if (currentUserId !== expectedUserId) {
                accessToken = null;
              } else {
                userId = whoami["user_id"];
              }

              res();
            });
          }
        });
      });
    }

    // If missing access token, use JWT to re-log in
    if (!accessToken) {
      const loginRes = await fetch(`https://${homeserver}/_matrix/client/r0/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "org.matrix.login.jwt", token: loginToken })
      });

      const { user_id, access_token: matrix_access_token } = await loginRes.json();
      store.update({ credentials: { matrix_access_token } });

      accessToken = matrix_access_token;
      userId = user_id;
    }

    console.log("Logged into matrix as", userId);

    this.client = MatrixSdk.createClient({ baseUrl: `https://${homeserver}`, accessToken, userId });
  }
}
