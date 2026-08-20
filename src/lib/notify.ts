import { useCallback, useEffect, useState } from "react";

const OPT_IN_KEY = "dlt.screentime.notify";

export type PushState = NotificationPermission | "unsupported";

function supported() {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Raises a system notification on THIS device. Web apps can only notify the
 * devices they are open on, so every registered device that has the app signed
 * in raises its own copy when an account-level alert arrives.
 */
export function pushLocal(title: string, body: string, tag?: string) {
  if (!supported()) return false;
  if (localStorage.getItem(OPT_IN_KEY) !== "1") return false;
  if (Notification.permission !== "granted") return false;
  try {
    new Notification(title, { body, icon: "/icon-192.png", ...(tag ? { tag } : {}) });
    return true;
  } catch {
    return false;
  }
}

/** Single opt-in shared by every notification feature (digest, limits, devices). */
export function useDeviceNotifications() {
  const [permission, setPermission] = useState<PushState>(() =>
    supported() ? Notification.permission : "unsupported",
  );
  const [optedIn, setOptedIn] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(OPT_IN_KEY) === "1",
  );

  useEffect(() => {
    if (supported()) setPermission(Notification.permission);
  }, []);

  const enable = useCallback(async () => {
    if (!supported()) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      localStorage.setItem(OPT_IN_KEY, "1");
      setOptedIn(true);
    }
  }, []);

  const disable = useCallback(() => {
    localStorage.removeItem(OPT_IN_KEY);
    setOptedIn(false);
  }, []);

  return { permission, optedIn, enable, disable };
}
