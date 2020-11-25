import * as mediasoupClient from "mediasoup-client";
import protooClient from "protoo-client";
import { debug as newDebug } from "debug";

// If the browser supports insertable streams, we insert a 5 byte payload at the end of the voice
// frame encoding 4 magic bytes and 1 viseme byte. This is a hack because on older browsers
// this data will be injested into the codec, but since the values are near zero it seems to have
// minimal effect. (Eventually all browsers will support insertable streams.)
const supportsInsertableStreams = !!(window.RTCRtpSender && !!RTCRtpSender.prototype.createEncodedStreams);
const visemeMagicBytes = [0x00, 0x00, 0x00, 0x01]; // Bytes to add to end of frame to indicate a viseme will follow

// NOTE this adapter does not properly fire the onOccupantsReceived events since those are only needed for
// data channels, which are not yet supported. To fire that event, this class would need to keep a list of
// occupants around and manage it.
//
// Used for VP9 webcam video.
//const VIDEO_KSVC_ENCODINGS = [{ scalabilityMode: "S3T3_KEY" }];

// Used for VP9 desktop sharing.
//const VIDEO_SVC_ENCODINGS = [{ scalabilityMode: "S3T3", dtx: true }];

// TODO
// - look into requestConsumerKeyframe
// - look into applyNetworkThrottle
// SFU todo
// - remove active speaker stuff
// - remove score stuff

// Based upon mediasoup-demo RoomClient

const debug = newDebug("naf-dialog-adapter:debug");
//const warn = newDebug("naf-dialog-adapter:warn");
const error = newDebug("naf-dialog-adapter:error");
const info = newDebug("naf-dialog-adapter:info");

const PC_PROPRIETARY_CONSTRAINTS = {
  optional: [{ googDscp: true }]
};

const CLOSE_MIC_PRODUCER_WITH_NO_PEERS_DURATION_MS = 5000;
const CLOSE_MIC_PRODUCER_WITH_PEERS_DURATION_MS = 60000;

export default class DialogAdapter {
  constructor() {
    this._forceTcp = false;
    this._timeOffsets = [];
    this._occupants = {};
    this._micProducer = null;
    this._videoProducer = null;
    this._mediaStreams = {};
    this._localMediaStream = null;
    this._consumers = new Map();
    this._frozenUpdates = new Map();
    this._pendingMediaRequests = new Map();
    this._micEnabled = true;
    this._audioConsumerResolvers = new Map();
    this._serverTimeRequests = 0;
    this._avgTimeOffset = 0;
    this._blockedClients = new Map();
    this._outgoingVisemeBuffer = null;
    this._visemeMap = new Map();
    this._reconnecting = false;
    this._transportCleanupTimeout = null;
    this._closed = true;
    this._creatingSendTransportPromise = null;
    this._creatingRecvTransportPromise = null;
    this._createMissingProducersPromise = null;
    this._sendTransport = null;
    this._recvTransport = null;
    this.type = "dialog";
    this.occupants = {}; // This is a public field
  }

  setOutgoingVisemeBuffer(buffer) {
    this._outgoingVisemeBuffer = buffer;
  }

  getCurrentViseme(peerId) {
    if (!this._visemeMap.has(peerId)) return 0;
    return this._visemeMap.get(peerId);
  }

  setForceTcp(forceTcp) {
    this._forceTcp = forceTcp;
  }

  getServerUrl() {
    return this._serverUrl;
  }

  setServerUrl(url) {
    if (this._protoo) {
      const urlWithParams = new URL(url);
      urlWithParams.searchParams.append("roomId", this._roomId);
      urlWithParams.searchParams.append("peerId", this._clientId);
      this._protoo._transport._url = urlWithParams.toString();
    }

    this._serverUrl = url;
  }

  setSpaceJoinToken(joinToken) {
    this._spaceJoinToken = joinToken;
  }

  setHubJoinToken(joinToken) {
    this._hubJoinToken = joinToken;
  }

  setPeerConnectionConfig(peerConnectionConfig) {
    if (peerConnectionConfig.iceServers) {
      this._iceServers = peerConnectionConfig.iceServers;
    }

    if (peerConnectionConfig.iceTransportPolicy) {
      this._iceTransportPolicy = peerConnectionConfig.iceTransportPolicy;
    }
  }

  setApp() {}

  setRoom(roomId) {
    this._roomId = roomId;
  }

  setClientId(clientId) {
    this._clientId = clientId;
  }

  setServerConnectListeners(successListener, failureListener) {
    this._connectSuccess = successListener;
    this._connectFailure = failureListener;
  }

  setAudioStreamChangedListener(audioStreamChangedListener) {
    this._audioStreamChangedListener = audioStreamChangedListener;
  }

  setRoomOccupantListener(occupantListener) {
    this._onOccupantsChanged = occupantListener;
  }

  setDataChannelListeners(openListener, closedListener, messageListener) {
    this._onOccupantConnected = openListener;
    this._onOccupantDisconnected = closedListener;
    this._onOccupantMessage = messageListener;
  }

  async connect() {
    const urlWithParams = new URL(this._serverUrl);
    urlWithParams.searchParams.append("roomId", this._roomId);
    urlWithParams.searchParams.append("peerId", this._clientId);

    const protooTransport = new protooClient.WebSocketTransport(urlWithParams.toString(), {
      retry: {
        factor: 2,
        minTimeout: 1 * 1000,
        maxTimeout: 8 * 1000,
        retries: 100000
      }
    });
    this._protoo = new protooClient.Peer(protooTransport);

    await new Promise(res => {
      this._protoo.on("open", async () => {
        if (this._reconnecting) {
          this._reconnecting = false;

          if (this._reconnectedListener) {
            this._reconnectedListener();
          }
        }

        this._closed = false;
        await this._joinRoom();

        if (this.lastJoinedHubId) {
          this.joinHub(this.lastJoinedHubId);
        }

        res();
      });
    });

    this._protoo.on("close", () => {
      if (this._reconnecting) {
        this._reconnecting = false;

        if (this._reconnectionErrorListener) {
          this._reconnectionErrorListener(
            new Error("Connection could not be reestablished, exceeded maximum number of reconnection attempts.")
          );
        }
      }

      this.disconnect();
    });

    this._protoo.on("disconnected", () => {
      this._reconnecting = true;

      if (this._reconnectingListener) {
        this._reconnectingListener(this.reconnectionDelay);
      }

      if (this._sendTransport) {
        this._sendTransport.close();
        this._sendTransport = null;
      }

      if (this._recvTransport) {
        this._recvTransport.close();
        this._recvTransport = null;
      }
    });

    // eslint-disable-next-line no-unused-vars
    this._protoo.on("request", async (request, accept, reject) => {
      debug('proto "request" event [method:%s, data:%o]', request.method, request.data);

      switch (request.method) {
        case "sendTransportClosed": {
          if (this._micProducer) {
            this._micProducer.close();
            this._micProducer = null;
          }

          if (this._videoProducer) {
            this._videoProducer.close();
            this._videoProducer = null;
          }

          this._sendTransport.close();
          this._sendTransport = null;
          accept();
          break;
        }
        case "recvTransportClosed": {
          this._recvTransport.close();
          this._recvTransport = null;
          accept();
          break;
        }
        case "recvTransportNeeded": {
          await this.ensureRecvTransport();
          accept();
          break;
        }
        case "newConsumer": {
          const {
            peerId,
            producerId,
            id,
            kind,
            rtpParameters,
            /*type, */ appData /*, producerPaused */
          } = request.data;

          try {
            await this.ensureRecvTransport();

            const consumer = await this._recvTransport.consume({
              id,
              producerId,
              kind,
              rtpParameters,
              appData: { ...appData, peerId } // Trick.
            });

            // Store in the map.
            this._consumers.set(consumer.id, consumer);

            consumer.on("close", () => this.removeConsumer(consumer.id));

            // We are ready. Answer the protoo request so the server will
            // resume this Consumer (which was paused for now if video).
            accept();

            this.resolvePendingMediaRequestForTrack(peerId, consumer.track);

            if (kind === "audio") {
              const audioResolver = this._audioConsumerResolvers.get(peerId);

              if (audioResolver) {
                audioResolver();
                this._audioConsumerResolvers.delete(peerId);
              }

              if (this._audioStreamChangedListener) {
                this._audioStreamChangedListener();
              }

              if (supportsInsertableStreams) {
                // Add viseme decoder
                const self = this;

                const receiverTransform = new TransformStream({
                  start() {},
                  flush() {},

                  async transform(encodedFrame, controller) {
                    if (encodedFrame.data.byteLength < visemeMagicBytes.length + 1) {
                      controller.enqueue(encodedFrame);
                    } else {
                      const view = new DataView(encodedFrame.data);
                      let hasViseme = true;

                      for (let i = 0, l = visemeMagicBytes.length; i < l; i++) {
                        if (
                          view.getUint8(encodedFrame.data.byteLength - 1 - visemeMagicBytes.length + i) !==
                          visemeMagicBytes[i]
                        ) {
                          hasViseme = false;
                        }
                      }

                      if (hasViseme) {
                        const viseme = view.getInt8(encodedFrame.data.byteLength - 1);
                        self._visemeMap.set(peerId, viseme);

                        encodedFrame.data = encodedFrame.data.slice(
                          0,
                          encodedFrame.data.byteLength - 1 - visemeMagicBytes.length
                        );
                      }

                      controller.enqueue(encodedFrame);
                    }
                  }
                });

                const receiver = consumer.rtpReceiver;
                const receiverStreams = receiver.createEncodedStreams();
                receiverStreams.readable.pipeThrough(receiverTransform).pipeTo(receiverStreams.writable);
              }
            }
          } catch (err) {
            error('"newConsumer" request failed:%o', err);

            throw err;
          }

          break;
        }
      }
    });

    this._protoo.on("notification", notification => {
      debug('proto "notification" event [method:%s, data:%o]', notification.method, notification.data);

      switch (notification.method) {
        case "peerEntered": {
          const peer = notification.data;
          this._onOccupantConnected(peer.id);
          this.occupants[peer.id] = true;

          if (this._onOccupantsChanged) {
            this._onOccupantsChanged(this.occupants);
          }

          break;
        }

        case "peerExited":
        case "peerClosed": {
          const { peerId } = notification.data;
          this._onOccupantDisconnected(peerId);

          const pendingMediaRequests = this._pendingMediaRequests.get(peerId);

          if (pendingMediaRequests) {
            const msg = "The user disconnected before the media stream was resolved.";
            info(msg);

            if (pendingMediaRequests.audio) {
              pendingMediaRequests.audio.resolve(null);
            }

            if (pendingMediaRequests.video) {
              pendingMediaRequests.video.resolve(null);
            }

            this._pendingMediaRequests.delete(peerId);
          }

          // Resolve initial audio resolver since this person left.
          const initialAudioResolver = this._initialAudioConsumerResolvers.get(peerId);

          if (initialAudioResolver) {
            initialAudioResolver();

            this._initialAudioConsumerResolvers.delete(peerId);
          }

          delete this.occupants[peerId];

          if (this._onOccupantsChanged) {
            this._onOccupantsChanged(this.occupants);
          }

          break;
        }

        case "consumerClosed": {
          const { consumerId } = notification.data;
          const consumer = this._consumers.get(consumerId);

          if (!consumer) break;

          consumer.close();
          this.removeConsumer(consumer.id);
          this.closeUnneededTransportsAfterDelay();

          break;
        }
      }
    });

    await this.updateTimeOffset();
  }

  shouldStartConnectionTo() {
    return true;
  }
  startStreamConnection() {}

  closeStreamConnection() {}

  resolvePendingMediaRequestForTrack(clientId, track) {
    const requests = this._pendingMediaRequests.get(clientId);

    if (requests && requests[track.kind]) {
      const resolve = requests[track.kind].resolve;
      delete requests[track.kind];
      resolve(new MediaStream([track]));
    }

    if (requests && Object.keys(requests).length === 0) {
      this._pendingMediaRequests.delete(clientId);
    }
  }

  removeConsumer(consumerId) {
    this._consumers.delete(consumerId);
  }

  getConnectStatus(/*clientId*/) {
    return this._protoo.connected ? NAF.adapters.IS_CONNECTED : NAF.adapters.NOT_CONNECTED;
  }

  getMediaStream(clientId, kind = "audio") {
    let track;

    if (this._clientId === clientId) {
      if (kind === "audio" && this._micProducer) {
        track = this._micProducer.track;
      } else if (kind === "video" && this._videoProducer) {
        track = this._videoProducer.track;
      }
    } else {
      this._consumers.forEach(consumer => {
        if (consumer.appData.peerId === clientId && kind == consumer.track.kind) {
          track = consumer.track;
        }
      });
    }

    if (track) {
      debug(`Already had ${kind} for ${clientId}`);
      return Promise.resolve(new MediaStream([track]));
    } else {
      debug(`Waiting on ${kind} for ${clientId}`);
      if (!this._pendingMediaRequests.has(clientId)) {
        this._pendingMediaRequests.set(clientId, {});
      }

      const requests = this._pendingMediaRequests.get(clientId);
      const promise = new Promise((resolve, reject) => (requests[kind] = { resolve, reject }));
      requests[kind].promise = promise;
      promise.catch(e => console.warn(`${clientId} getMediaStream Error`, e));
      return promise;
    }
  }

  getServerTime() {
    return Date.now() + this._avgTimeOffset;
  }

  sendData(clientId, dataType, data) {
    this.unreliableTransport(clientId, dataType, data);
  }
  sendDataGuaranteed(clientId, dataType, data) {
    this.reliableTransport(clientId, dataType, data);
  }
  broadcastData(dataType, data) {
    this.unreliableTransport(undefined, dataType, data);
  }
  broadcastDataGuaranteed(dataType, data) {
    this.reliableTransport(undefined, dataType, data);
  }

  setReconnectionListeners(reconnectingListener, reconnectedListener, reconnectionErrorListener) {
    this._reconnectingListener = reconnectingListener;
    this._reconnectedListener = reconnectedListener;
    this._reconnectionErrorListener = reconnectionErrorListener;
  }

  async joinHub(hubId) {
    this.lastJoinedHubId = hubId;

    const peerIds = Object.keys(this.occupants);
    for (let i = 0; i < peerIds.length; i++) {
      const peerId = peerIds[i];
      if (peerId === this._clientId) continue;
      this._onOccupantDisconnected(peerId);
    }

    this.occupants = {};

    const audioConsumerPromises = [];

    const { peers } = await this._protoo.request("enter", { hubId, token: this._hubJoinToken });

    // Create a promise that will be resolved once we attach to all the initial consumers.
    // This will gate the connection flow until all voices will be heard.
    for (let i = 0; i < peers.length; i++) {
      const peerId = peers[i].id;
      this._onOccupantConnected(peerId);
      this.occupants[peerId] = true;
      if (!peers[i].hasProducers) continue;
      audioConsumerPromises.push(new Promise(res => this._audioConsumerResolvers.set(peerId, res)));
    }

    await Promise.all([audioConsumerPromises]);
  }

  async _joinRoom() {
    debug("_joinRoom()");

    try {
      this._mediasoupDevice = new mediasoupClient.Device({});

      const routerRtpCapabilities = await this._protoo.request("getRouterRtpCapabilities");

      await this._mediasoupDevice.load({ routerRtpCapabilities });

      await this._protoo.request("join", {
        displayName: this._clientId,
        device: this._device,
        rtpCapabilities: this._mediasoupDevice.rtpCapabilities,
        sctpCapabilities: this._useDataChannel ? this._mediasoupDevice.sctpCapabilities : undefined,
        token: this._spaceJoinToken
      });

      this.occupants = {};

      this._connectSuccess(this._clientId);

      if (this._onOccupantsChanged) {
        this._onOccupantsChanged(this.occupants);
      }
    } catch (err) {
      error("_joinRoom() failed:%o", err);

      this.disconnect();
    }
  }

  setLocalMediaStream(stream) {
    return this.createMissingProducers(stream);
  }

  ensureSendTransport() {
    if (this._closed || this._sendTransport) return;

    if (!this._creatingSendTransportPromise) {
      this._creatingSendTransportPromise = new Promise(res => {
        // Create mediasoup Transport for sending (unless we don't want to produce).
        this._protoo
          .request("createWebRtcTransport", {
            forceTcp: this._forceTcp,
            producing: true,
            consuming: false,
            sctpCapabilities: undefined
          })
          .then(sendTransportInfo => {
            this._sendTransport = this._mediasoupDevice.createSendTransport({
              id: sendTransportInfo.id,
              iceParameters: sendTransportInfo.iceParameters,
              iceCandidates: sendTransportInfo.iceCandidates,
              dtlsParameters: sendTransportInfo.dtlsParameters,
              sctpParameters: sendTransportInfo.sctpParameters,
              iceServers: this._iceServers,
              iceTransportPolicy: this._iceTransportPolicy,
              proprietaryConstraints: PC_PROPRIETARY_CONSTRAINTS,
              additionalSettings: { encodedInsertableStreams: supportsInsertableStreams }
            });

            this._sendTransport.on("connect", (
              { dtlsParameters },
              callback,
              errback // eslint-disable-line no-shadow
            ) => {
              this._protoo
                .request("connectWebRtcTransport", {
                  transportId: this._sendTransport.id,
                  dtlsParameters
                })
                .then(callback)
                .catch(errback);
            });

            this._sendTransport.on("connectionstatechange", state => {
              if (state === "connected" && this._localMediaStream) {
                this.createMissingProducers(this._localMediaStream);
              }
            });

            this._sendTransport.on("produce", async ({ kind, rtpParameters, appData }, callback, errback) => {
              try {
                // eslint-disable-next-line no-shadow
                const { id } = await this._protoo.request("produce", {
                  transportId: this._sendTransport.id,
                  kind,
                  rtpParameters,
                  appData
                });

                callback({ id });
              } catch (error) {
                errback(error);
              }
            });

            this._creatingSendTransportPromise = null;

            res();
          });
      });
    }

    return this._creatingSendTransportPromise;
  }

  async ensureRecvTransport() {
    if (this._closed || this._recvTransport) return;

    if (!this._creatingRecvTransportPromise) {
      // Create mediasoup Transport for receiving
      this._creatingRecvTransportPromise = new Promise(res => {
        this._protoo
          .request("createWebRtcTransport", {
            forceTcp: this._forceTcp,
            producing: false,
            consuming: true,
            sctpCapabilities: undefined
          })
          .then(recvTransportInfo => {
            this._recvTransport = this._mediasoupDevice.createRecvTransport({
              id: recvTransportInfo.id,
              iceParameters: recvTransportInfo.iceParameters,
              iceCandidates: recvTransportInfo.iceCandidates,
              dtlsParameters: recvTransportInfo.dtlsParameters,
              sctpParameters: recvTransportInfo.sctpParameters,
              iceServers: this._iceServers,
              additionalSettings: { encodedInsertableStreams: supportsInsertableStreams }
            });

            this._recvTransport.on("connect", (
              { dtlsParameters },
              callback,
              errback // eslint-disable-line no-shadow
            ) => {
              this._protoo
                .request("connectWebRtcTransport", {
                  transportId: this._recvTransport.id,
                  dtlsParameters
                })
                .then(callback)
                .catch(errback);
            });

            this._creatingRecvTransportPromise = null;

            res();
          });
      });
    }

    return this._creatingRecvTransportPromise;
  }

  async closeUnneededTransports() {
    if (this._sendTransport) {
      const micIsAlive = !!(this._micProducer && this._micEnabled);
      const videoIsAlive = !!this._videoProducer;

      if (!micIsAlive && !videoIsAlive) {
        this._protoo.request("closeSendTransport", {});
      }
    }

    if (this._recvTransport) {
      if (this._consumers.size === 0) {
        this._protoo.request("closeRecvTransport", {});
      }
    }
  }

  closeUnneededTransportsAfterDelay() {
    const delay =
      this._consumers.size > 0
        ? CLOSE_MIC_PRODUCER_WITH_PEERS_DURATION_MS
        : CLOSE_MIC_PRODUCER_WITH_NO_PEERS_DURATION_MS;

    clearTimeout(this._transportCleanupTimeout);
    this._transportCleanupTimeout = setTimeout(() => this.closeUnneededTransports(), delay);
  }

  async createMissingProducers(stream) {
    if (this._closed) return;

    if (!this._createMissingProducersPromise) {
      this._createMissingProducersPromise = new Promise(res => {
        let sawAudio = false;
        let sawVideo = false;

        Promise.all(
          stream.getTracks().map(async track => {
            if (track.kind === "audio") {
              sawAudio = true;

              // TODO multiple audio tracks?
              if (this._micProducer) {
                if (this._micProducer.track !== track) {
                  this._micProducer.track.stop();
                  this._micProducer.replaceTrack(track);
                }
              } else {
                track.enabled = this._micEnabled;
                await this.ensureSendTransport();

                // stopTracks = false because otherwise the track will end during a temporary disconnect
                this._micProducer = await this._sendTransport.produce({
                  track,
                  stopTracks: false,
                  codecOptions: { opusStereo: false, opusDtx: true }
                });

                if (supportsInsertableStreams) {
                  const self = this;

                  // Add viseme encoder
                  const senderTransform = new TransformStream({
                    start() {
                      // Called on startup.
                    },

                    async transform(encodedFrame, controller) {
                      if (encodedFrame.data.byteLength < 2) {
                        controller.enqueue(encodedFrame);
                        return;
                      }

                      // Create a new buffer with 1 byte for viseme.
                      const newData = new ArrayBuffer(encodedFrame.data.byteLength + 1 + visemeMagicBytes.length);
                      const arr = new Uint8Array(newData);
                      arr.set(new Uint8Array(encodedFrame.data), 0);

                      for (let i = 0, l = visemeMagicBytes.length; i < l; i++) {
                        arr[encodedFrame.data.byteLength + i] = visemeMagicBytes[i];
                      }

                      if (self._outgoingVisemeBuffer) {
                        const viseme = self._micEnabled ? self._outgoingVisemeBuffer[0] : 0;
                        arr[encodedFrame.data.byteLength + visemeMagicBytes.length] = viseme;
                        self._visemeMap.set(self._clientId, viseme);
                      }

                      encodedFrame.data = newData;
                      controller.enqueue(encodedFrame);
                    },

                    flush() {
                      // Called when the stream is about to be closed.
                    }
                  });

                  const senderStreams = this._micProducer.rtpSender.createEncodedStreams();
                  senderStreams.readable.pipeThrough(senderTransform).pipeTo(senderStreams.writable);
                }

                this._micProducer.on("transportclose", () => (this._micProducer = null));

                if (!this._micEnabled && !this._micProducer.paused) {
                  this._micProducer.pause();
                } else if (this._micEnabled && this._micProducer.paused) {
                  this._micProducer.resume();
                }
              }
            } else {
              sawVideo = true;

              if (this._videoProducer) {
                if (this._videoProducer.track !== track) {
                  this._videoProducer.track.stop();
                  this._videoProducer.replaceTrack(track);
                }
              } else {
                await this.ensureSendTransport();

                // stopTracks = false because otherwise the track will end during a temporary disconnect
                this._videoProducer = await this._sendTransport.produce({
                  track,
                  stopTracks: false,
                  codecOptions: { videoGoogleStartBitrate: 1000 }
                });

                this._videoProducer.on("transportclose", () => (this._videoProducer = null));
              }
            }

            this.resolvePendingMediaRequestForTrack(this._clientId, track);
          })
        ).then(() => {
          if (!sawAudio && this._micProducer) {
            this._micProducer.close();
            this._protoo.request("closeProducer", { producerId: this._micProducer.id });
            this._micProducer = null;
          }

          if (!sawVideo && this._videoProducer) {
            this._videoProducer.close();
            this._protoo.request("closeProducer", { producerId: this._videoProducer.id });
            this._videoProducer = null;
          }

          this._localMediaStream = stream;
          this._createMissingProducersPromise = null;
          res();
        });
      });
    }
  }

  async enableMicrophone(enabled) {
    if (enabled && this._localMediaStream && !this._micProducer) {
      await this.createMissingProducers(this._localMediaStream);
    }

    clearTimeout(this._transportCleanupTimeout);

    if (this._micProducer) {
      if (enabled) {
        this._micProducer.resume();
      } else {
        this._micProducer.pause();
        this.closeUnneededTransportsAfterDelay();
      }
    }

    this._micEnabled = enabled;
  }

  setWebRtcOptions() {
    // Not implemented
  }

  isDisconnected() {
    return !!(!this._protoo || !this._protoo.connected);
  }

  disconnect() {
    if (this._closed) return;

    if (this._reconnecting && this._reconnectionErrorListener) {
      this._reconnectionErrorListener(new Error("Reconnection failed, networking shut down."));
    }

    this._closed = true;

    const peerIds = Object.keys(this.occupants);
    for (let i = 0; i < peerIds.length; i++) {
      const peerId = peerIds[i];
      if (peerId === this._clientId) continue;
      this._onOccupantDisconnected(peerId);
    }

    this.occupants = {};

    if (this._onOccupantsChanged) {
      this._onOccupantsChanged(this.occupants);
    }

    debug("disconnect()");

    // Close protoo Peer, though may already be closed if this is happening due to websocket breakdown
    if (this._protoo && this._protoo.connected) {
      this._protoo.close();
      this._protoo = null;
    }

    if (this._micProducer) {
      this._micProducer.close();
      this._micProducer = null;
    }

    if (this._videoProducer) {
      this._videoProducer.close();
      this._videoProducer = null;
    }

    // Close mediasoup Transports.
    if (this._sendTransport) {
      this._sendTransport.close();
      this._sendTransport = null;
    }

    if (this._recvTransport) {
      this._recvTransport.close();
      this._recvTransport = null;
    }
  }

  kick(clientId, permsToken) {
    return this._protoo
      .request("kick", {
        room_id: this.room,
        user_id: clientId,
        token: permsToken
      })
      .then(() => {
        document.body.dispatchEvent(new CustomEvent("kicked", { detail: { clientId: clientId } }));
      });
  }

  async updateTimeOffset() {
    if (this.isDisconnected()) return;

    const clientSentTime = Date.now();

    const res = await fetch(document.location.href, {
      method: "HEAD",
      cache: "no-cache"
    });

    const precision = 1000;
    const serverReceivedTime = new Date(res.headers.get("Date")).getTime() + precision / 2;
    const clientReceivedTime = Date.now();
    const serverTime = serverReceivedTime + (clientReceivedTime - clientSentTime) / 2;
    const timeOffset = serverTime - clientReceivedTime;

    this._serverTimeRequests++;

    if (this._serverTimeRequests <= 10) {
      this._timeOffsets.push(timeOffset);
    } else {
      this._timeOffsets[this._serverTimeRequests % 10] = timeOffset;
    }

    this._avgTimeOffset = this._timeOffsets.reduce((acc, offset) => (acc += offset), 0) / this._timeOffsets.length;

    if (this._serverTimeRequests > 10) {
      debug(`new server time offset: ${this._avgTimeOffset}ms`);
      setTimeout(() => this.updateTimeOffset(), 5 * 60 * 1000); // Sync clock every 5 minutes.
    } else {
      this.updateTimeOffset();
    }
  }

  toggleFreeze() {
    if (this.frozen) {
      this.unfreeze();
    } else {
      this.freeze();
    }
  }

  freeze() {
    this.frozen = true;
  }

  unfreeze() {
    this.frozen = false;
    this.flushPendingUpdates();
  }

  storeMessage(message) {
    if (message.dataType === "um") {
      // UpdateMulti
      for (let i = 0, l = message.data.d.length; i < l; i++) {
        this.storeSingleMessage(message, i);
      }
    } else {
      this.storeSingleMessage(message);
    }
  }

  storeSingleMessage(message, index) {
    const data = index !== undefined ? message.data.d[index] : message.data;
    const dataType = message.dataType;

    const networkId = data.networkId;

    if (!this._frozenUpdates.has(networkId)) {
      this._frozenUpdates.set(networkId, message);
    } else {
      const storedMessage = this._frozenUpdates.get(networkId);
      const storedData =
        storedMessage.dataType === "um" ? this.dataForUpdateMultiMessage(networkId, storedMessage) : storedMessage.data;

      // Avoid updating components if the entity data received did not come from the current owner.
      const isOutdatedMessage = data.lastOwnerTime < storedData.lastOwnerTime;
      const isContemporaneousMessage = data.lastOwnerTime === storedData.lastOwnerTime;
      if (isOutdatedMessage || (isContemporaneousMessage && storedData.owner > data.owner)) {
        return;
      }

      if (dataType === "r") {
        const createdWhileFrozen = storedData && storedData.isFirstSync;
        if (createdWhileFrozen) {
          // If the entity was created and deleted while frozen, don't bother conveying anything to the consumer.
          this._frozenUpdates.delete(networkId);
        } else {
          // Delete messages override any other messages for this entity
          this._frozenUpdates.set(networkId, message);
        }
      } else {
        // merge in component updates
        if (storedData.components && data.components) {
          Object.assign(storedData.components, data.components);
        }
      }
    }
  }

  onDataChannelMessage(e, source) {
    this.onData(JSON.parse(e.data), source);
  }

  onData(message, source) {
    if (debug.enabled) {
      debug(`DC in: ${message}`);
    }

    if (!message.dataType) return;

    message.source = source;

    if (this.frozen) {
      this.storeMessage(message);
    } else {
      this._onOccupantMessage(null, message.dataType, message.data, message.source);
    }
  }

  getPendingData(networkId, message) {
    if (!message) return null;

    const data = message.dataType === "um" ? this.dataForUpdateMultiMessage(networkId, message) : message.data;

    // Ignore messages from users that we may have blocked while frozen.
    if (data.owner && this._blockedClients.has(data.owner)) return null;

    return data;
  }

  // Used externally
  getPendingDataForNetworkId(networkId) {
    return this.getPendingData(networkId, this._frozenUpdates.get(networkId));
  }

  flushPendingUpdates() {
    for (const [networkId, message] of this._frozenUpdates) {
      const data = this.getPendingData(networkId, message);
      if (!data) continue;

      // Override the data type on "um" messages types, since we extract entity updates from "um" messages into
      // individual frozenUpdates in storeSingleMessage.
      const dataType = message.dataType === "um" ? "u" : message.dataType;

      this._onOccupantMessage(null, dataType, data, message.source);
    }
    this._frozenUpdates.clear();
  }

  dataForUpdateMultiMessage(networkId, message) {
    // "d" is an array of entity datas, where each item in the array represents a unique entity and contains
    // metadata for the entity, and an array of components that have been updated on the entity.
    // This method finds the data corresponding to the given networkId.
    for (let i = 0, l = message.data.d.length; i < l; i++) {
      const data = message.data.d[i];

      if (data.networkId === networkId) {
        return data;
      }
    }

    return null;
  }
}

NAF.adapters.register("dialog", DialogAdapter);
