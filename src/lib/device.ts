/**
 * Device identity for this app instance.
 *
 * Each install (browser profile, phone, PC agent) generates its own local
 * fingerprint. Reinstalling produces a NEW fingerprint, so the reinstalled app
 * registers as a new device instance and — when required by the user's security
 * settings — waits for authorization. Cloud data is never tied to the
 * fingerprint, only to the account, so history always restores after login.
 */

const FINGERPRINT_KEY = "dlt.device.fingerprint";

export function getFingerprint(): string {
  if (typeof window === "undefined") return "ssr";
  let value = localStorage.getItem(FINGERPRINT_KEY);
  if (!value) {
    value = crypto.randomUUID();
    localStorage.setItem(FINGERPRINT_KEY, value);
  }
  return value;
}

export function resetFingerprint(): void {
  if (typeof window !== "undefined") localStorage.removeItem(FINGERPRINT_KEY);
}

export interface DetectedDevice {
  name: string;
  device_type: string;
  platform: string;
  os_version: string;
  app_version: string;
}

export function detectDevice(): DetectedDevice {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const mobile = /Android|iPhone|iPad|Mobile/i.test(ua);
  const platform = /Android/i.test(ua)
    ? "android"
    : /iPhone|iPad|iOS/i.test(ua)
      ? "ios"
      : /Windows/i.test(ua)
        ? "windows"
        : /Mac OS/i.test(ua)
          ? "macos"
          : /Linux/i.test(ua)
            ? "linux"
            : "web";
  const osMatch = ua.match(/\((.*?)\)/);
  return {
    name: `${platform.charAt(0).toUpperCase()}${platform.slice(1)} ${mobile ? "Phone" : "Computer"}`,
    device_type: mobile ? "phone" : "desktop",
    platform,
    os_version: osMatch?.[1]?.split(";")[0]?.trim() ?? "unknown",
    app_version: "1.0.0 (web dashboard)",
  };
}

export const PLATFORM_CAPABILITIES: Record<string, string[]> = {
  windows: [
    "Application usage tracking",
    "Lock / unlock events",
    "Session tracking",
    "Startup & shutdown",
    "Screen activity",
  ],
  android: ["App usage where permitted", "Screen time", "Device sessions", "Usage statistics"],
  ios: ["Only activity available through approved Apple APIs"],
  macos: ["App usage", "Session tracking", "Screen activity"],
  linux: ["App usage", "Session tracking"],
  web: ["Dashboard session events", "Sync events", "Manual activity entries"],
};

/**
 * Real name of the application generating activity on this install, taken
 * automatically from the browser itself (brand list first, user-agent second).
 * No manual naming or categorising is required anywhere in the app.
 */
export function detectBrowser(): string {
  const nav = typeof navigator === "undefined" ? undefined : navigator;
  const brands = (
    nav as unknown as { userAgentData?: { brands?: { brand: string; version: string }[] } }
  )?.userAgentData?.brands;
  if (brands?.length) {
    const real = brands.map((b) => b.brand).find((b) => !/not.?a.?brand|chromium/i.test(b));
    if (real) return real;
  }
  const ua = nav?.userAgent ?? "";
  return /Edg\//i.test(ua)
    ? "Microsoft Edge"
    : /OPR\/|Opera/i.test(ua)
      ? "Opera"
      : /Firefox\//i.test(ua)
        ? "Firefox"
        : /Brave/i.test(ua)
          ? "Brave"
          : /Chrome\//i.test(ua)
            ? "Google Chrome"
            : /Safari\//i.test(ua)
              ? "Safari"
              : "Web browser";
}

/**
 * Calculates a stable device signature based on characteristics that persist
 * across browser cache/localStorage clears. This allows recognizing the same
 * physical device + browser combination even after clearing site data.
 *
 * The signature is derived from:
 * - Platform (Windows, macOS, Linux, Android, iOS, Web)
 * - Device type (phone vs desktop)
 * - Browser name (Chrome, Firefox, Safari, Edge, etc.)
 * - OS version (major version only for stability)
 *
 * This is privacy-conscious as all data comes from the User-Agent string,
 * which is already sent to servers with every request.
 *
 * Limitations:
 * - Not unique per device (two Windows 11 computers running Chrome will have similar signatures)
 * - Different browsers on the same device will have different signatures
 * - OS updates or browser updates might change the signature
 * - Should only be used as a fallback when localStorage fingerprint is unavailable
 */
export function calculateDeviceSignature(): string {
  const device = detectDevice();
  const browser = detectBrowser();

  // Extract major OS version only for better stability across OS updates
  const osVersionMatch = device.os_version.match(/^\d+/);
  const majorVersion = osVersionMatch ? osVersionMatch[0] : "0";

  // Combine stable characteristics into a signature
  // Format: platform-devicetype-browser-osmajorversion
  const parts = [device.platform, device.device_type, browser.toLowerCase().replace(/\s+/g, "-"), majorVersion];
  const signature = parts.join("|");

  return signature;
}
