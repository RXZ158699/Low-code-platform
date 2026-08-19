import { saveUser } from "../api/tokenStore.js";

export const AUTH_SYNC_TYPE = "dp.auth.sync";
const CHANNEL_NAME = "dp.auth";

let channel;

function getChannel() {
  if (channel) return channel;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
  } catch {
    return null;
  }
  return channel;
}

export function notifyAuthSync(user) {
  const nextUser = user ?? null;
  saveUser(nextUser);
  const payload = { type: AUTH_SYNC_TYPE, user: nextUser };
  try {
    getChannel()?.postMessage(payload);
  } catch {
    // BroadcastChannel is unavailable in some environments
  }
  if (window.opener && !window.opener.closed) {
    try {
      window.opener.postMessage(payload, window.location.origin);
      window.opener.dispatchEvent(new CustomEvent(AUTH_SYNC_TYPE, { detail: nextUser }));
    } catch {
      // opener may be cross-origin or already closing
    }
  }
}

export function subscribeAuthSync(onChange) {
  const handleMessage = (event) => {
    if (event.origin && event.origin !== window.location.origin) return;
    if (event.data?.type !== AUTH_SYNC_TYPE) return;
    onChange(event.data.user ?? null);
  };
  const handleCustom = (event) => {
    onChange(event.detail ?? null);
  };
  window.addEventListener("message", handleMessage);
  window.addEventListener(AUTH_SYNC_TYPE, handleCustom);

  let localChannel;
  try {
    localChannel = new BroadcastChannel(CHANNEL_NAME);
    localChannel.onmessage = (event) => {
      if (event.data?.type !== AUTH_SYNC_TYPE) return;
      onChange(event.data.user ?? null);
    };
  } catch {
    // ignore
  }

  return () => {
    window.removeEventListener("message", handleMessage);
    window.removeEventListener(AUTH_SYNC_TYPE, handleCustom);
    localChannel?.close();
  };
}
