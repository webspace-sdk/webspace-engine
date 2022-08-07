import { fetchReticulumAuthenticated } from "../../hubs/utils/phoenix-utils";

export function membershipForSpaceId(spaceId, memberships) {
  if (!memberships) return null;

  for (let i = 0; i < memberships.length; i++) {
    const membership = memberships[i];

    if (membership.space.space_id === spaceId) {
      return membership;
    }
  }

  return null;
}

export function membershipSettingsForSpaceId(spaceId, memberships) {
  const membership = membershipForSpaceId(spaceId, memberships);
  if (!membership) return null;

  return {
    notifySpaceCopresence: membership.notify_space_copresence,
    notifyHubCopresence: membership.notify_hub_copresence,
    notifyCurrentWorldChatMode: membership.notify_current_world_chat_mode
  };
}

export function hubSettingsForHubId(hubId, hubSettings) {
  for (let i = 0; i < hubSettings.length; i++) {
    const s = hubSettings[i];

    if (s.hub.hub_id === hubId) {
      return {
        notifyJoins: s.notify_joins
      };
    }
  }

  return null;
}

export function homeHubForSpaceId(spaceId, memberships) {
  const m = membershipForSpaceId(spaceId, memberships);
  return m ? m.home_hub : null;
}

export function spaceForSpaceId(spaceId, memberships) {
  const m = membershipForSpaceId(spaceId, memberships);
  return m ? m.space : null;
}

export async function getInitialHubForSpaceId(spaceId) {
  const { store } = window.APP;

  const lastJoinedHubId =
    store.state &&
    store.state.context &&
    store.state.context.lastJoinedHubIds &&
    store.state.context.lastJoinedHubIds[spaceId];

  if (lastJoinedHubId) {
    const lastHubRes = await fetchReticulumAuthenticated(`/api/v1/hubs/${lastJoinedHubId}`);

    if (lastHubRes && !lastHubRes.error) {
      if (lastHubRes.hubs && lastHubRes.hubs.length > 0) {
        return lastHubRes.hubs[0];
      }
    }
  }

  const accountId = store.credentialsAccountId;
  const res = await fetchReticulumAuthenticated(`/api/v1/accounts/${accountId}`);
  const membership = (res.memberships || []).filter(m => m.space.space_id === spaceId)[0];
  return (membership && membership.default_hub) || null;
}
