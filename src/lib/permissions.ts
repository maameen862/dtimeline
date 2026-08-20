/**
 * Mandatory device permissions collected at registration time.
 *
 * A web build can only *ask* for what the browser exposes (notifications).
 * Platform-level grants such as Android's Usage Access cannot be read or
 * requested by a web page, so those steps deep-link into the system settings
 * screen and are confirmed by the user before the device is allowed to sync.
 */

export type PermissionKind = "notifications" | "usage-access" | "battery-exempt";

export interface RequiredPermission {
  kind: PermissionKind;
  title: string;
  detail: string;
  /** Browser-grantable (notifications) vs. confirmed in system settings. */
  mode: "request" | "settings";
  /** Deep link opened when mode === "settings". */
  deepLink?: string;
  /** Blocks registration until handled. */
  mandatory: boolean;
}

const ANDROID_USAGE_ACCESS =
  "intent://settings/usage-access#Intent;action=android.settings.USAGE_ACCESS_SETTINGS;end";
const ANDROID_BATTERY =
  "intent://settings/battery#Intent;action=android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS;end";

export function requiredPermissions(platform: string): RequiredPermission[] {
  const notifications: RequiredPermission = {
    kind: "notifications",
    title: "Notifications",
    detail:
      "Required for new-device security alerts, screen-time reminders and daily usage reports.",
    mode: "request",
    mandatory: true,
  };

  if (platform === "android") {
    return [
      {
        kind: "usage-access",
        title: "Usage access (screen time)",
        detail:
          "Android only reports per-app screen time to apps with Usage Access. Turn it on for Digital Life Timeline in Settings → Special app access → Usage access.",
        mode: "settings",
        deepLink: ANDROID_USAGE_ACCESS,
        mandatory: true,
      },
      notifications,
      {
        kind: "battery-exempt",
        title: "Background activity",
        detail:
          "Allow unrestricted background use so tracking and auto-sync keep running when the screen is off.",
        mode: "settings",
        deepLink: ANDROID_BATTERY,
        mandatory: false,
      },
    ];
  }

  return [notifications];
}

const KEY = "dlt.permissions.granted";

export function markPermission(kind: PermissionKind) {
  if (typeof window === "undefined") return;
  const set = new Set(readPermissions());
  set.add(kind);
  localStorage.setItem(KEY, JSON.stringify([...set]));
}

export function readPermissions(): PermissionKind[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as PermissionKind[];
  } catch {
    return [];
  }
}

export function openDeepLink(link: string) {
  if (typeof window === "undefined") return;
  window.location.href = link;
}
