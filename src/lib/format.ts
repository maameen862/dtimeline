export function minutesLabel(totalSeconds: number): string {
  const mins = Math.round(totalSeconds / 60);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export const EVENT_LABELS: Record<string, string> = {
  device_startup: "Device started",
  device_shutdown: "Device shut down",
  device_lock: "Device locked",
  device_unlock: "Device unlocked",
  device_sleep: "Device sleeping",
  device_wake: "Device woke",
  screen_on: "Screen on",
  screen_off: "Screen off",
  session_start: "Session started",
  session_end: "Session ended",
  app_usage: "Application active",
  app_open: "Application opened",
  app_close: "Application closed",
  sync_started: "Sync started",
  sync_completed: "Sync completed",
  sync_failed: "Sync failed",
  device_online: "Device online",
  device_offline: "Device offline",
  device_added: "Device added",
  device_removed: "Device removed",
  tracking_paused: "Tracking paused",
  tracking_resumed: "Tracking resumed",
  login: "Signed in",
  logout: "Signed out",
  security_event: "Security event",
};

export function eventLabel(type: string, app?: string | null): string {
  const base = EVENT_LABELS[type] ?? type.replace(/_/g, " ");
  return app ? `${app} — ${base.toLowerCase()}` : base;
}
