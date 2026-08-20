import type { DeviceRow, EventRow } from "@/lib/api";
import { dayKey } from "@/lib/format";

export function totalScreenSeconds(events: EventRow[]): number {
  return events.reduce((sum, e) => sum + (e.duration_seconds || 0), 0);
}

export function byApplication(events: EventRow[]) {
  const map = new Map<string, { name: string; seconds: number; productivity: string }>();
  for (const e of events) {
    if (!e.application_name) continue;
    const entry = map.get(e.application_name) ?? {
      name: e.application_name,
      seconds: 0,
      productivity: e.productivity ?? "neutral",
    };
    entry.seconds += e.duration_seconds || 0;
    map.set(e.application_name, entry);
  }
  return [...map.values()].sort((a, b) => b.seconds - a.seconds);
}

export function byDevice(events: EventRow[], devices: DeviceRow[]) {
  const names = new Map(devices.map((d) => [d.id, d.name]));
  const map = new Map<string, { name: string; seconds: number; events: number }>();
  for (const e of events) {
    const id = e.device_id ?? "unknown";
    const entry = map.get(id) ?? { name: names.get(id) ?? "Unknown device", seconds: 0, events: 0 };
    entry.seconds += e.duration_seconds || 0;
    entry.events += 1;
    map.set(id, entry);
  }
  return [...map.values()].sort((a, b) => b.seconds - a.seconds);
}

export function byDay(events: EventRow[], days: number) {
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000);
    buckets.set(dayKey(d.toISOString()), 0);
  }
  for (const e of events) {
    const key = dayKey(e.started_at);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + (e.duration_seconds || 0));
  }
  return [...buckets.entries()].map(([day, seconds]) => ({
    day: new Date(day).toLocaleDateString([], { weekday: "short" }),
    date: day,
    hours: Number((seconds / 3600).toFixed(2)),
    minutes: Math.round(seconds / 60),
  }));
}

export function byHour(events: EventRow[]) {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour: `${hour}:00`, minutes: 0 }));
  for (const e of events) {
    const h = new Date(e.started_at).getHours();
    buckets[h]!.minutes += Math.round((e.duration_seconds || 0) / 60);
  }
  return buckets;
}

export function productivitySplit(events: EventRow[]) {
  const totals = { productive: 0, neutral: 0, distracting: 0 };
  for (const e of events) {
    const key = (e.productivity ?? "neutral") as keyof typeof totals;
    if (key in totals) totals[key] += e.duration_seconds || 0;
  }
  return [
    { name: "Productive", seconds: totals.productive },
    { name: "Neutral", seconds: totals.neutral },
    { name: "Distracting", seconds: totals.distracting },
  ];
}

export function countEvents(events: EventRow[], type: string): number {
  return events.filter((e) => e.event_type === type).length;
}

export function filterToday(events: EventRow[]): EventRow[] {
  const today = dayKey(new Date().toISOString());
  return events.filter((e) => dayKey(e.started_at) === today);
}

export function compareWeeks(events: EventRow[]) {
  const now = Date.now();
  const thisWeek = events.filter((e) => now - new Date(e.started_at).getTime() < 7 * 86400_000);
  const lastWeek = events.filter((e) => {
    const age = now - new Date(e.started_at).getTime();
    return age >= 7 * 86400_000 && age < 14 * 86400_000;
  });
  const a = totalScreenSeconds(thisWeek);
  const b = totalScreenSeconds(lastWeek);
  return {
    thisWeek: a,
    lastWeek: b,
    changePercent: b === 0 ? 0 : Math.round(((a - b) / b) * 100),
  };
}
