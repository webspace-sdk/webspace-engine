import uuid from "uuid/v4";

export default class AuthChannel {
  constructor(store) {
    this.store = store;
    this.socket = null;
    this._signedIn = !!this.store.state.credentials.token;
  }

  setSocket = socket => {
    this.socket = socket;
  };

  get email() {
    return this.store.state.credentials.email;
  }

  get signedIn() {
    return this._signedIn;
  }

  signOut = async spaceChannel => {
    if (spaceChannel) {
      await spaceChannel.signOut();
    }
    this.store.clearCredentials();
    await this.store.resetToRandomDefaultAvatar();
    this._signedIn = false;
  };

  verifyAuthentication(authTopic, authToken, authPayload) {
    const channel = this.socket.channel(authTopic);
    return new Promise((resolve, reject) => {
      channel.onError(() => {
        channel.leave();
        reject();
      });

      channel
        .join()
        .receive("ok", () => {
          channel.on("auth_credentials", async ({ credentials: token, payload: payload }) => {
            await this.handleAuthCredentials(payload.email, token);
            resolve(payload);
          });

          channel.push("auth_verified", { token: authToken, payload: authPayload });
        })
        .receive("error", reject);
    });
  }

  async startVerification(email, spaceChannel, extraPayload = {}) {
    const { authComplete } = await this.startAuthentication(email, spaceChannel, extraPayload, true);
    await authComplete;
  }

  async startAuthentication(email, spaceChannel, extraPayload = {}, useExistingCredentials = false) {
    // Use existing auth token if this is binding the login to an unverified account.
    const auth_token = useExistingCredentials
      ? this.store.state.credentials && this.store.state.credentials.token
      : null;
    const params = auth_token ? { auth_token } : {};
    const channel = this.socket.channel(`auth:${uuid()}`, params);

    await new Promise((resolve, reject) =>
      channel
        .join()
        .receive("ok", resolve)
        .receive("error", reject)
    );

    const authComplete = new Promise(resolve =>
      channel.on("auth_credentials", async ({ credentials: token }) => {
        await this.handleAuthCredentials(email, token, spaceChannel);
        resolve();
      })
    );

    channel.push("auth_request", { ...extraPayload, ...{ email, origin: "jel" } });

    // Returning an object with the authComplete promise since we want the caller to wait for the above await but not for authComplete.
    return { authComplete };
  }

  async handleAuthCredentials(email, token, spaceChannel) {
    this.store.update({ credentials: { email, token } });

    if (spaceChannel) {
      await spaceChannel.signIn(token);
    }

    this._signedIn = true;
  }
}
