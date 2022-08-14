import { ZoomMtg } from "@zoomus/websdk";

navigator.mediaDevices.getUserMedia = function(constraints) {
  if (constraints.video) {
    return Promise.resolve(window.bridgeVideoMediaStream);
  } else if (constraints.audio) {
    return Promise.resolve(window.bridgeAudioMediaStream);
  }
};

navigator.mediaDevices.enumerateDevices = () => {
  return new Promise(res => {
    res([
      {
        kind: "videoinput",
        label: "Jel Video",
        deviceId: "jel-video"
      },
      {
        kind: "audioinput",
        label: "Jel Audio",
        deviceId: "jel-audio"
      }
    ]);
  });
};

function setNativeValue(element, value) {
  const valueSetter = Object.getOwnPropertyDescriptor(element, "value").set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, "value").set;

  if (valueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else {
    valueSetter.call(element, value);
  }
}

let isJoined = false;
window.bridgeStatus = "init";

ZoomMtg.inMeetingServiceListener("onMeetingStatus", function(data) {
  switch (data.meetingStatus) {
    case 1:
      window.bridgeStatus = "init";
      break;
    case 2:
      window.bridgeStatus = "joined";
      break;
    case 3:
      window.bridgeStatus = "ended";
      break;
  }
});

window.join = function({ apiKey, meetingNumber, password, name, signature, initialMessage }) {
  return new Promise((res, rej) => {
    const passwordCheckInterval = setInterval(() => {
      if (document.querySelector("#inputpasscode")) {
        // Bad password
        rej("bad-password");
      }
    }, 500);

    ZoomMtg.init({
      leaveUrl: "https://jel.app",

      success: () => {
        ZoomMtg.i18n.load("en-US");
        ZoomMtg.i18n.reload("en-US"); // shrug, from example
        ZoomMtg.join({
          meetingNumber,
          userName: name,
          passWord: password,
          signature,
          apiKey,
          userEmail: "jel@jel.app",
          success: () => {
            isJoined = true;
            clearInterval(passwordCheckInterval);

            res();
            window.bridgeStatus = "joined";

            const interval = setInterval(() => {
              const waitingRoom = document.querySelector(".wr-content");

              if (waitingRoom) {
                // In the waiting room, this will get called again.
                clearInterval(interval);
                return;
              }

              const joinButton = document.querySelector(".join-audio-by-voip button");
              const videoButton = document.querySelector(".send-video-container button");
              const chatOpenIcon = document.querySelector(".footer-button__chat-icon");

              if (videoButton && !joinButton) {
                // "Join Audio" button needs to be clicked
                const auxJoinButton = document.querySelector(".join-audio-container button");

                if (auxJoinButton) {
                  auxJoinButton.click();
                }
              }

              const performInitialUnmute = () => {
                const unmuteButton = document.querySelector("button.join-audio-container__btn");
                if (unmuteButton && unmuteButton.getAttribute("title").toLowerCase() === "unmute") {
                  unmuteButton.click();
                }
              };

              if (
                joinButton &&
                videoButton &&
                chatOpenIcon &&
                window.bridgeVideoMediaStream &&
                window.bridgeAudioMediaStream
              ) {
                clearInterval(interval);

                // Submit initial chat message
                if (initialMessage) {
                  chatOpenIcon.click();

                  setTimeout(() => {
                    const chat = document.querySelector("textarea");

                    if (chat) {
                      setNativeValue(chat, initialMessage);
                      chat.dispatchEvent(new Event("input", { bubbles: true }));

                      setTimeout(() => {
                        chat.dispatchEvent(
                          new KeyboardEvent("keydown", {
                            bubbles: true,
                            cancelable: true,
                            keyCode: 13
                          })
                        );

                        setTimeout(() => {
                          chatOpenIcon.click();
                          setTimeout(() => joinButton.click(), 2000);
                          setTimeout(() => videoButton.click(), 5000);
                          setTimeout(performInitialUnmute, 7000);
                        }, 100);
                      }, 100);
                    } else {
                      // Chat is disabled
                      document.querySelector(".chat-header__dropdown-menu a").click();

                      setTimeout(() => joinButton.click(), 2000);
                      setTimeout(() => videoButton.click(), 5000);
                      setTimeout(performInitialUnmute, 7000);
                    }
                  }, 1000);
                } else {
                  setTimeout(() => joinButton.click(), 2000);
                  setTimeout(() => videoButton.click(), 5000);
                  setTimeout(performInitialUnmute, 7000);
                }
              }
            }, 500);
          },
          error: () => {
            rej("join-failed");
          }
        });
      },
      error: () => {
        rej("init-failed");
      }
    });
  });
};

window.leave = () => {
  if (!isJoined) return Promise.resolve();

  return new Promise(res => {
    ZoomMtg.leaveMeeting({});
    setTimeout(() => res(), 2000); // For sanity's sake
  });
};

const waitForEvent = function(eventName, eventObj) {
  return new Promise(resolve => {
    eventObj.addEventListener(eventName, resolve, { once: true });
  });
};

const waitForShadowDOMContentLoaded = function() {
  if (document.readyState === "complete" || document.readyState === "loaded" || document.readyState === "interactive") {
    return Promise.resolve(null);
  } else {
    return waitForEvent("DOMContentLoaded", window);
  }
};

waitForShadowDOMContentLoaded().then(() => {
  ZoomMtg.setZoomJSLib("https://assets.jel.app/static/zoomsdk");
  ZoomMtg.preLoadWasm();
  ZoomMtg.prepareJssdk();
  window.bridgeReady = true;
});
