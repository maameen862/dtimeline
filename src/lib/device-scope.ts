/**
 * Global "which device am I looking at" selection used by the top bar switcher.
 *
 * Stored outside React so any hook (including data hooks) can read it without a
 * provider, and persisted per install so the choice survives reloads.
 */
import { useSyncExternalStore } from "react";

const KEY = "dlt.device.scope";
let value: string = typeof window === "undefined" ? "all" : localStorage.getItem(KEY) || "all";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDeviceScope(): string {
  return value;
}

export function setDeviceScope(next: string) {
  value = next || "all";
  if (typeof window !== "undefined") localStorage.setItem(KEY, value);
  listeners.forEach((l) => l());
}

export function useDeviceScope(): string {
  return useSyncExternalStore(subscribe, getDeviceScope, () => "all");
}
