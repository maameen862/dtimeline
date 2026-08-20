/**
 * One-time, per-install decision about whether this device may sync activity to
 * the account. Stored locally next to the device fingerprint so the prompt is
 * shown exactly once per install and never re-asked on every sign-in.
 */
import { useSyncExternalStore } from "react";

const KEY = "dlt.device.consent";
export type DeviceConsent = "unknown" | "granted" | "denied";

function read(): DeviceConsent {
  if (typeof window === "undefined") return "unknown";
  const raw = localStorage.getItem(KEY);
  return raw === "granted" || raw === "denied" ? raw : "unknown";
}

let value: DeviceConsent = read();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDeviceConsent(): DeviceConsent {
  return value;
}

export function setDeviceConsent(next: DeviceConsent) {
  value = next;
  if (typeof window !== "undefined") {
    if (next === "unknown") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, next);
  }
  listeners.forEach((l) => l());
}

export function useDeviceConsent(): DeviceConsent {
  return useSyncExternalStore(subscribe, getDeviceConsent, () => "unknown");
}
