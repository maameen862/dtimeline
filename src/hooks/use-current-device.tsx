import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useAccountBootstrap, useDevices, useSettings, useSync, type DeviceRow } from "@/lib/api";
import { getFingerprint } from "@/lib/device";
import { clearQueue, readQueue } from "@/lib/local-cache";
import { useLiveActivity } from "@/hooks/use-live-activity";

/**
 * Resolves the device row for this install, keeps it fresh from realtime,
 * flushes the encrypted offline queue whenever the device comes back online,
 * and runs automatic synchronization on the device's own interval.
 */
export function useCurrentDevice() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const bootstrap = useAccountBootstrap(Boolean(user));
  const devices = useDevices();
  const settings = useSettings();

  const fingerprint = getFingerprint();
  const device =
    (devices.data ?? []).find((d) => d.fingerprint === fingerprint) ??
    (bootstrap.data?.device as DeviceRow | undefined) ??
    null;

  const sync = useSync(device?.id);
  const prefs = (settings.data?.preferences ?? {}) as Record<string, unknown>;
  const accountAutoSync = prefs["auto_sync_enabled"] !== false;
  const intervalMinutes = Math.max(
    1,
    Number(device?.sync_interval_minutes ?? prefs["auto_sync_interval_minutes"] ?? 15),
  );

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`account-stream-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "devices" }, () =>
        queryClient.invalidateQueries({ queryKey: ["devices"] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_events" }, () =>
        queryClient.invalidateQueries({ queryKey: ["events"] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () =>
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  useEffect(() => {
    if (!user || !device) return;
    async function flush() {
      const pending = await readQueue();
      if (!pending.length) return;
      const { error } = await (
        supabase as unknown as {
          from: (t: string) => { insert: (rows: unknown[]) => Promise<{ error: unknown }> };
        }
      )
        .from("activity_events")
        .insert(pending.map((e) => ({ ...e, user_id: user!.id })));
      if (!error) {
        await clearQueue();
        await supabase.from("sync_log").insert({
          user_id: user!.id,
          device_id: device!.id,
          status: "completed",
          events_count: pending.length,
          detail: "Offline queue flushed automatically on reconnect",
        });
        queryClient.invalidateQueries();
      }
    }
    window.addEventListener("online", flush);
    void flush();
    return () => window.removeEventListener("online", flush);
  }, [user, device, queryClient]);

  // Automatic background synchronization, driven by the per-device interval
  // (falling back to the account-wide interval) and paused when the device is
  // offline, revoked, or has auto-sync switched off.
  const deviceId = device?.id;
  const deviceAutoSync = device?.auto_sync !== false;
  const deviceStatus = device?.status;
  const trackingPaused = device?.tracking_paused;

  useEffect(() => {
    if (!user || !deviceId) return;
    if (!accountAutoSync || !deviceAutoSync) return;
    if (deviceStatus !== "authorized" || trackingPaused) return;

    let cancelled = false;
    const tick = () => {
      if (cancelled || !navigator.onLine || document.hidden) return;
      sync.mutate(undefined, { onError: () => undefined });
    };
    const timer = window.setInterval(tick, intervalMinutes * 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
    // `sync` is a stable mutation handle; re-running on it would reset the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    user,
    deviceId,
    accountAutoSync,
    deviceAutoSync,
    deviceStatus,
    trackingPaused,
    intervalMinutes,
  ]);

  const trackAppUsage = (settings.data?.privacy as Record<string, unknown> | null)
    ? (settings.data!.privacy as Record<string, unknown>)["track_app_usage"] !== false
    : true;

  const live = useLiveActivity({
    deviceId,
    enabled: Boolean(
      user && deviceId && trackAppUsage && deviceStatus === "authorized" && !trackingPaused,
    ),
  });

  return {
    device,
    live,
    registered: Boolean(device),
    loading: bootstrap.isPending || devices.isPending,
    autoSync: {
      enabled: Boolean(accountAutoSync && deviceAutoSync && deviceStatus === "authorized"),
      intervalMinutes,
      running: sync.isPending,
    },
  };

}
