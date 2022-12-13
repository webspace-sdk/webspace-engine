export function ensureOwnership(el) {
  if (!el.components.networked) return false;
  if (!window.APP.atomAccessManager.hubCan("spawn_and_move_media")) return false;

  return NAF.utils.isMine(el) || NAF.utils.takeOwnership(el);
}

export function takeOwnership(el) {
  if (!el.components.networked) return false;
  if (!window.APP.atomAccessManager.hubCan("spawn_and_move_media")) return false;

  return NAF.utils.takeOwnership(el);
}

export function getNetworkedTemplate(el) {
  if (!el.components.networked) return null;
  return el.components.networked.data.template;
}

export function getNetworkId(el) {
  if (!el.components.networked) return null;
  return el.components.networked.data.networkId;
}

export function isMine(el) {
  // Inlined for optimization
  if (!el) {
    throw new Error("Entity does not have and is not a child of an entity with the [networking] component ");
  }

  const components = el.components;

  if (!components) {
    throw new Error("Entity does not have and is not a child of an entity with the [networking] component ");
  }

  if (components.networked) {
    return components.networked.initialized && components.networked.data.owner == NAF.clientId;
  } else {
    throw new Error("Entity does not have and is not a child of an entity with the [networking] component ");
  }
}

export function isSynchronized(el) {
  return !!el.components.networked;
}

export function isNonNetworkedOrEnsureOwnership(el) {
  return !isSynchronized(el) || isMine(el) || takeOwnership(el);
}

export function getNetworkOwner(el) {
  if (!el.components.networked) return false;

  return NAF.utils.getNetworkOwner(el);
}

export function getCreator(el) {
  if (!el.components.networked) return false;

  return NAF.utils.getCreator(el);
}

export function getNetworkedEntity(entity) {
  return new Promise((resolve, reject) => {
    let curEntity = entity;

    while (curEntity && curEntity.components && !curEntity.components.networked) {
      curEntity = curEntity.parentNode;
    }

    if (!curEntity || !curEntity.components || !curEntity.components.networked) {
      return reject("Entity does not have and is not a child of an entity with the [networked] component ");
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

export function getNetworkedEntitySync(entity) {
  let curEntity = entity;

  while (curEntity && curEntity.components && !curEntity.components.networked) {
    curEntity = curEntity.parentNode;
  }

  if (!curEntity || !curEntity.components || !curEntity.components.networked) {
    return null;
  }

  if (!curEntity.hasLoaded) {
    console.warn("Called getNetworkedEntitySync on a non-loaded networked entity.");
    return null;
  }

  return curEntity;
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
