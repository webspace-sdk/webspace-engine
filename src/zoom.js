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

window.join = function({ apiKey, meetingNumber, password, name, signature }) {
  return new Promise((res, rej) => {
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

              if (videoButton && !joinButton) {
                // "Join Audio" button needs to be clicked
                const auxJoinButton = document.querySelector(".join-audio-container button");

                if (auxJoinButton) {
                  auxJoinButton.click();
                }
              }

              if (joinButton && videoButton && window.bridgeVideoMediaStream && window.bridgeAudioMediaStream) {
                clearInterval(interval);

                setTimeout(() => joinButton.click(), 2000);
                setTimeout(() => videoButton.click(), 5000);
              }
            }, 500);
          },
          error: () => {
            rej();
          }
        });
      },
      error: () => {
        rej();
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

const waitForDOMContentLoaded = function() {
  if (document.readyState === "complete" || document.readyState === "loaded" || document.readyState === "interactive") {
    return Promise.resolve(null);
  } else {
    return waitForEvent("DOMContentLoaded", window);
  }
};

waitForDOMContentLoaded().then(() => {
  ZoomMtg.setZoomJSLib("https://assets.jel.app/static/zoomsdk");
  ZoomMtg.preLoadWasm();
  ZoomMtg.prepareJssdk();
  window.bridgeReady = true;
});
