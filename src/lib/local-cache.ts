/**
 * Encrypted device-local cache.
 *
 * Used for: offline activity events awaiting synchronization, cached timeline
 * data, and preferences needed while offline. The cloud database remains the
 * persistent source of truth after a successful sync — this cache is disposable
 * and can be wiped without losing account data.
 *
 * Values are encrypted with AES-GCM using a device-local key kept in
 * localStorage, so cached activity is not readable as plain text on disk.
 */

const KEY_STORAGE = "dlt.cache.key";
const PREFIX = "dlt.enc.";

let cachedKey: CryptoKey | null = null;

function toB64(bytes: Uint8Array) {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}

function fromB64(value: string) {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

async function getKey(): Promise<CryptoKey | null> {
  if (typeof window === "undefined" || !window.crypto?.subtle) return null;
  if (cachedKey) return cachedKey;
  let raw = localStorage.getItem(KEY_STORAGE);
  if (!raw) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    raw = toB64(bytes);
    localStorage.setItem(KEY_STORAGE, raw);
  }
  cachedKey = await crypto.subtle.importKey("raw", fromB64(raw), "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
  return cachedKey;
}

export async function secureSet(name: string, value: unknown): Promise<void> {
  const key = await getKey();
  if (!key) return;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(value));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data));
  const merged = new Uint8Array(iv.length + ct.length);
  merged.set(iv);
  merged.set(ct, iv.length);
  localStorage.setItem(PREFIX + name, toB64(merged));
}

export async function secureGet<T>(name: string): Promise<T | null> {
  const key = await getKey();
  const stored = typeof window === "undefined" ? null : localStorage.getItem(PREFIX + name);
  if (!key || !stored) return null;
  try {
    const merged = fromB64(stored);
    const iv = merged.slice(0, 12);
    const ct = merged.slice(12);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return JSON.parse(new TextDecoder().decode(plain)) as T;
  } catch {
    return null;
  }
}

export function secureClear(): void {
  if (typeof window === "undefined") return;
  Object.keys(localStorage)
    .filter((k) => k.startsWith(PREFIX))
    .forEach((k) => localStorage.removeItem(k));
}

export interface QueuedEvent {
  device_id: string | null;
  event_type: string;
  application_name?: string | null;
  category?: string | null;
  productivity?: string | null;
  started_at: string;
  ended_at?: string | null;
  duration_seconds?: number;
  metadata?: Record<string, unknown>;
}

const QUEUE = "pending-events";

export async function queueEvent(event: QueuedEvent): Promise<void> {
  const pending = (await secureGet<QueuedEvent[]>(QUEUE)) ?? [];
  pending.push(event);
  await secureSet(QUEUE, pending);
}

export async function readQueue(): Promise<QueuedEvent[]> {
  return (await secureGet<QueuedEvent[]>(QUEUE)) ?? [];
}

export async function clearQueue(): Promise<void> {
  await secureSet(QUEUE, []);
}

export async function cacheTimeline(events: unknown[]): Promise<void> {
  await secureSet("timeline", events.slice(0, 200));
}

export async function readCachedTimeline<T>(): Promise<T[]> {
  return (await secureGet<T[]>("timeline")) ?? [];
}
