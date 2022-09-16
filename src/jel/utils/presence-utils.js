export function getCurrentPresence() {
  if (!NAF.connection.presence?.states) return;

  for (const state of NAF.connection.presence.states.values()) {
    const clientId = state.client_id;
    if (clientId && NAF.clientId === clientId) return state;
  }

  return null;
}
