import React from "react";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
import classNames from "classnames";
import AtomMetadata, {ATOM_TYPES} from "../utils/atom-metadata";
import PresenceList from "./presence-list";

const scene = window.APP.scene;
const metadata = new AtomMetadata(ATOM_TYPES.HUB);
metadata._metadata.set("ZJenEkZ", { displayName: "World Name" });
metadata._metadata.set("J8eetqM", { displayName: "Test Very Long World Name That Keeps Going and Going" });

const presences = {
  "0cea1949-b385-4c60-966d-c45988fbdb7b": {
    metas: [
      {
        context: { mobile: false },
        hub_id: "ZJenEkZ",
        phx_ref: "D8cBgniuRC0=",
        phx_ref_prev: "9c71qUGEl3U=",
        presence: "room",
        profile: {
          avatarId: "https://hubs.local:8080/hubs/assets/models/DefaultAvatar-dc6216902968b75a81ab6df90fb07bb3.glb",
          displayName: "Sally Jonsey",
          identityName: "GregFodor#001",
          persona: {
            avatar: { primary_color: { b: 0.8705882352941177, g: 0.5803921568627451, r: 0.12156862745098039 } }
          }
        }
      }
    ]
  },
  "0dea1949-b385-4c60-966d-c45988fbdb7b": {
    metas: [
      {
        context: { mobile: false },
        hub_id: "ZJenEkZ",
        phx_ref: "D8cBgniuRC0=",
        phx_ref_prev: "9c71qUGEl3U=",
        presence: "room",
        profile: {
          avatarId: "https://hubs.local:8080/hubs/assets/models/DefaultAvatar-dc6216902968b75a81ab6df90fb07bb3.glb",
          displayName: "Really Long Name Goes Here Testingtesting",
          identityName: "GregFodor#001",
          persona: {
            avatar: { primary_color: { b: 0.8705882352941177, g: 0.5803921568627451, r: 0.12156862745098039 } }
          }
        }
      }
    ]
  },
  "97c1ed75-0f1c-45e7-9f51-89e74ef23cf0": {
    metas: [
      {
        context: { mobile: false },
        hub_id: "J8eetqM",
        phx_ref: "MqjSNe2D74w=",
        phx_ref_prev: "bWGGXKUpotw=",
        presence: "room",
        profile: {
          avatarId: "https://hubs.local:8080/hubs/assets/models/DefaultAvatar-dc6216902968b75a81ab6df90fb07bb3.glb",
          displayName: "Greg Fodor",
          identityName: "GregFodor#001",
          persona: {
            avatar: { primary_color: { b: 0.43137254901960786, g: 0.7333333333333333, r: 0.09019607843137255 } }
          }
        }
      }
    ]
  },
  "d929d0df-eb53-4bed-aa22-b87c67f1ab28": {
    metas: [
      {
        context: { mobile: false },
        hub_id: "jdF66eU",
        phx_ref: "zwpayVlnoss=",
        phx_ref_prev: "gPBE+aGTTbM=",
        presence: "room",
        profile: {
          avatarId: "https://hubs.local:8080/hubs/assets/models/DefaultAvatar-dc6216902968b75a81ab6df90fb07bb3.glb",
          displayName: "Greg Fodor",
          identityName: "GregFodor#001",
          persona: {
            avatar: { primary_color: { b: 0.09019607843137255, g: 0.09019607843137255, r: 0.7333333333333333 } }
          }
        }
      }
    ]
  },
  "a929d0df-eb53-4bed-aa22-b87c67f1ab28": {
    metas: [
      {
        context: { mobile: false },
        hub_id: "jdF66eU",
        phx_ref: "zwpayVlnoss=",
        phx_ref_prev: "gPBE+aGTTbM=",
        presence: "room",
        profile: {
          avatarId: "https://hubs.local:8080/hubs/assets/models/DefaultAvatar-dc6216902968b75a81ab6df90fb07bb3.glb",
          displayName: "Another Person",
          identityName: "GregFodor#002",
          persona: {
            avatar: { primary_color: { b: 0.09019607843137255, g: 0.09019607843137255, r: 0.7333333333333333 } }
          }
        }
      }
    ]
  }
};

window.APP.spaceChannel.presence = { state: presences };

export const Normal = () => {
  setTimeout(() => scene.dispatchEvent(new CustomEvent("presence-synced")));

  return (
    <div
      className={classNames(sharedStyles.basePanel)}
      style={{
        width: "300px",
        height: "300px"
      }}
    >
      <PresenceList
        scene={scene}
        hubMetadata={metadata}
        hubCan={() => true}
        sessionId={"d929d0df-eb53-4bed-aa22-b87c67f1ab28"}
        onGoToHubClicked={hubId => console.log(hubId)}
        onGoToUserClicked={sessionId => console.log(sessionId)}
      />
    </div>
  );
};

export default {
  title: "Presence List"
};
