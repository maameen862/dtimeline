import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const APPS: Array<{ name: string; category: string; productivity: string }> = [
  { name: "Visual Studio Code", category: "development", productivity: "productive" },
  { name: "Google Chrome", category: "browsing", productivity: "neutral" },
  { name: "Microsoft Excel", category: "work", productivity: "productive" },
  { name: "Slack", category: "communication", productivity: "productive" },
  { name: "WhatsApp", category: "communication", productivity: "neutral" },
  { name: "YouTube", category: "entertainment", productivity: "distracting" },
  { name: "Instagram", category: "social", productivity: "distracting" },
  { name: "Spotify", category: "entertainment", productivity: "neutral" },
];

/**
 * Seeds a realistic 14-day cross-device history so the timeline, analytics and
 * reports have data to render. Everything is written to the cloud database
 * under the signed-in account, so it also survives reinstalls.
 */
export async function seedDemoData(userId: string, currentDeviceId: string) {
  const extra = [
    {
      user_id: userId,
      name: "Personal Windows PC",
      device_type: "desktop",
      platform: "windows",
      os_version: "Windows 11 23H2",
      app_version: "1.0.0 (agent)",
      category: "personal",
      status: "authorized",
      fingerprint: `demo-windows-${crypto.randomUUID()}`,
      battery_level: null,
      network_status: "online",
      last_sync_at: new Date().toISOString(),
    },
    {
      user_id: userId,
      name: "Android Phone",
      device_type: "phone",
      platform: "android",
      os_version: "Android 15",
      app_version: "1.0.0 (mobile)",
      category: "personal",
      status: "authorized",
      fingerprint: `demo-android-${crypto.randomUUID()}`,
      battery_level: 74,
      network_status: "online",
      last_sync_at: new Date(Date.now() - 120_000).toISOString(),
    },
    {
      user_id: userId,
      name: "Work Laptop",
      device_type: "laptop",
      platform: "windows",
      os_version: "Windows 11 22H2",
      app_version: "1.0.0 (agent)",
      category: "work",
      status: "authorized",
      fingerprint: `demo-work-${crypto.randomUUID()}`,
      network_status: "offline",
      last_sync_at: new Date(Date.now() - 3 * 3600_000).toISOString(),
    },
  ];

  const { data: devices, error } = await db.from("devices").insert(extra).select("id, platform");
  if (error) throw error;
  const deviceIds = [...(devices ?? []).map((d: { id: string }) => d.id), currentDeviceId];

  const events: Record<string, unknown>[] = [];
  for (let day = 13; day >= 0; day--) {
    for (const deviceId of deviceIds.slice(0, 3)) {
      const base = new Date();
      base.setDate(base.getDate() - day);
      base.setHours(8 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 50), 0, 0);
      events.push({
        user_id: userId,
        device_id: deviceId,
        event_type: "device_unlock",
        started_at: base.toISOString(),
        duration_seconds: 0,
      });
      let cursor = new Date(base.getTime() + 3 * 60_000);
      const sessions = 4 + Math.floor(Math.random() * 4);
      for (let i = 0; i < sessions; i++) {
        const app = APPS[Math.floor(Math.random() * APPS.length)]!;
        const duration = (10 + Math.floor(Math.random() * 80)) * 60;
        const ended = new Date(cursor.getTime() + duration * 1000);
        events.push({
          user_id: userId,
          device_id: deviceId,
          event_type: "app_usage",
          application_name: app.name,
          category: app.category,
          productivity: app.productivity,
          started_at: cursor.toISOString(),
          ended_at: ended.toISOString(),
          duration_seconds: duration,
        });
        cursor = new Date(ended.getTime() + 5 * 60_000);
      }
      events.push({
        user_id: userId,
        device_id: deviceId,
        event_type: "device_lock",
        started_at: cursor.toISOString(),
      });
      events.push({
        user_id: userId,
        device_id: deviceId,
        event_type: "sync_completed",
        started_at: new Date(cursor.getTime() + 60_000).toISOString(),
      });
    }
  }

  for (let i = 0; i < events.length; i += 400) {
    const { error: insertError } = await db.from("activity_events").insert(events.slice(i, i + 400));
    if (insertError) throw insertError;
  }

  await db.from("application_categories").upsert(
    APPS.map((a) => ({
      user_id: userId,
      application_name: a.name,
      category: a.category,
      productivity: a.productivity,
    })),
    { onConflict: "user_id,application_name" },
  );

  await db.from("insights").insert([
    {
      user_id: userId,
      title: "Your most productive window is 09:00 – 11:30",
      body: "Across the last two weeks, 41% of your productive application time happens before noon on your Windows devices.",
      kind: "pattern",
    },
    {
      user_id: userId,
      title: "Phone usage rose 18% week over week",
      body: "Communication and social applications on your Android phone account for most of the increase.",
      kind: "trend",
    },
    {
      user_id: userId,
      title: "Work Laptop has not synchronized for 3 hours",
      body: "Activity from that device may be queued locally until it comes back online.",
      kind: "alert",
    },
  ]);

  await db.from("user_goals").insert([
    {
      user_id: userId,
      title: "Keep entertainment apps under 1h/day",
      metric: "app_time",
      application_name: "YouTube",
      target_minutes: 60,
      direction: "under",
      period: "daily",
    },
    {
      user_id: userId,
      title: "At least 4h of productive time each day",
      metric: "productive_time",
      target_minutes: 240,
      direction: "over",
      period: "daily",
    },
  ]);

  await db.from("alert_rules").insert([
    { user_id: userId, name: "Daily screen time over 8h", metric: "daily_screen_time", threshold_minutes: 480 },
    { user_id: userId, name: "Device not synced for 6h", metric: "sync_stale", threshold_minutes: 360 },
  ]);

  await db.from("notifications").insert([
    {
      user_id: userId,
      title: "Weekly report ready",
      body: "Your cross-device usage report for last week has been generated.",
      kind: "report",
    },
    {
      user_id: userId,
      title: "Work Laptop went offline",
      body: "Last seen 3 hours ago. Queued events will upload on reconnect.",
      kind: "sync",
    },
  ]);
}
