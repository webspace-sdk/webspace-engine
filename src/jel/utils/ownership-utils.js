/* global NAF SAF */

export function ensureOwnership(el) {
  const isShared = !!el.components.shared;
  if (!isShared && !el.components.networked) return false;

  // Can't take ownership of shared objects without media permissions.
  if (isShared && !window.APP.hubChannel.can("spawn_and_move_media")) return false;

  const utils = (isShared ? SAF : NAF).utils;
  return utils.isMine(el) || utils.takeOwnership(el);
}

export function takeOwnership(el) {
  const isShared = !!el.components.shared;
  if (!isShared && !el.components.networked) return false;

  // Can't take ownership of shared objects without media permissions.
  if (isShared && !window.APP.hubChannel.can("spawn_and_move_media")) return false;

  const utils = (isShared ? SAF : NAF).utils;
  return utils.takeOwnership(el);
}

export function getNetworkedTemplate(el) {
  if (!el.components.shared && !el.components.networked) return null;
  return (el.components.shared || el.components.networked).data.template;
}

export function getNetworkId(el) {
  if (!el.components.shared && !el.components.networked) return null;
  return (el.components.shared || el.components.networked).data.networkId;
}

export function isMine(el) {
  // Inlined for optimization
  if (!el) {
    throw new Error(
      "Entity does not have and is not a child of an entity with the [networking] or [shared] component "
    );
  }

  const components = el.components;

  if (!components) {
    throw new Error(
      "Entity does not have and is not a child of an entity with the [networking] or [shared] component "
    );
  }

  if (components.shared) {
    return components.shared.initialized && components.shared.data.owner == SAF.clientId;
  } else if (components.networked) {
    return components.networked.initialized && components.networked.data.owner == NAF.clientId;
  } else {
    throw new Error(
      "Entity does not have and is not a child of an entity with the [networking] or [shared] component "
    );
  }
}

export function isNonNetworkedOrEnsureOwnership(el) {
  return isMine(el) || takeOwnership(el);
}

export function getNetworkOwner(el) {
  const isShared = !!el.components.shared;
  if (!isShared && !el.components.networked) return false;

  const utils = (isShared ? SAF : NAF).utils;
  return utils.getNetworkOwner(el);
}

export function getCreator(el) {
  const isShared = !!el.components.shared;
  if (!isShared && !el.components.networked) return false;

  const utils = (isShared ? SAF : NAF).utils;
  return utils.getCreator(el);
}

export function isSynchronized(el) {
  return el.components.shared || el.components.networked;
}

export function getNetworkedEntity(entity) {
  return new Promise((resolve, reject) => {
    let curEntity = entity;

    while (curEntity && curEntity.components && !curEntity.components.networked && !curEntity.components.shared) {
      curEntity = curEntity.parentNode;
    }

    if (!curEntity || !curEntity.components || (!curEntity.components.networked && !curEntity.components.shared)) {
      return reject("Entity does not have and is not a child of an entity with the [networked] or [shared] component ");
    }

    if (curEntity.hasLoaded) {
      resolve(curEntity);
    } else {
      curEntity.addEventListener(
        "instantiated",
        () => {
          resolve(curEntity);
        },
        { once: true }
      );
    }
  });
}
export const getNetworkedAvatar = component => {
  if (!component.el) {
    window.setTimeout(() => {
      getNetworkedAvatar(component.el);
    }, 1000);
    return;
  }

  const el = component.el;
  const networkedAvatar = el.components && el.components["networked-avatar"];
  if (networkedAvatar) {
    return networkedAvatar;
  }
  return getNetworkedAvatar(el.parentEl);
};
