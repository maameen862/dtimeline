import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Loosely-typed handle used only by the generic table helpers below (dynamic
 * table names can't be resolved against the generated schema types).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
import { detectDevice, getFingerprint, calculateDeviceSignature } from "@/lib/device";
import { cacheTimeline, clearQueue, queueEvent, readQueue } from "@/lib/local-cache";
import { useDeviceScope } from "@/lib/device-scope";

export interface DeviceRow {
  id: string;
  user_id: string;
  name: string;
  device_type: string;
  platform: string;
  os_version: string | null;
  app_version: string | null;
  category: string;
  status: string;
  tracking_paused: boolean;
  fingerprint: string;
  device_signature?: string | null;
  auto_sync: boolean;
  sync_interval_minutes: number;
  battery_level: number | null;
  network_status: string | null;
  last_seen_at: string;
  last_sync_at: string | null;
  created_at: string;
}

export interface EventRow {
  event_id: string;
  device_id: string | null;
  event_type: string;
  application_name: string | null;
  category: string | null;
  productivity: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  bookmarked: boolean;
  tags: string[];
  metadata: Record<string, unknown>;
}

async function uid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

/* -------------------------------------------------- account bootstrap ---- */

/**
 * Called after every successful authentication. Restores the account
 * scaffolding in the cloud and looks up whether THIS install is already a
 * registered device. It never creates a device on its own — registration is an
 * explicit, one-time user decision (see `useRegisterDevice`).
 *
 * Device recognition strategy (in order of preference):
 * 1. Fingerprint match (most reliable, stored in localStorage)
 * 2. Device signature match (fallback when localStorage is cleared)
 * 3. Not found (user will be prompted to register)
 *
 * When a device is recognized, last_seen_at is automatically updated.
 */
export function useAccountBootstrap(enabled: boolean) {
  return useQuery({
    queryKey: ["bootstrap"],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Not signed in");

      await db.from("profiles").upsert(
        {
          id: user.id,
          email: user.email,
          full_name:
            (user.user_metadata?.["full_name"] as string) ?? user.email?.split("@")[0] ?? "Member",
          avatar_url: (user.user_metadata?.["avatar_url"] as string) ?? null,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
      await supabase
        .from("privacy_settings")
        .upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });
      await supabase
        .from("user_preferences")
        .upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });

      const fingerprint = getFingerprint();
      const deviceSignature = calculateDeviceSignature();
      const detected = detectDevice();

      // Strategy 1: Try to find device by fingerprint (localStorage-based, most reliable)
      let { data: existing } = await supabase
        .from("devices")
        .select("*")
        .eq("user_id", user.id)
        .eq("fingerprint", fingerprint)
        .maybeSingle();

      let device = existing as DeviceRow | null;

      // Strategy 2: If no fingerprint match, try device signature (survives localStorage clear)
      if (!device) {
        const { data: bySignature } = await supabase
          .from("devices")
          .select("*")
          .eq("user_id", user.id)
          .eq("device_signature", deviceSignature)
          .maybeSingle();

        device = bySignature as DeviceRow | null;

        // If found by signature, update the fingerprint (restore localStorage recovery ability)
        if (device) {
          await supabase
            .from("devices")
            .update({
              fingerprint,
              device_signature: deviceSignature,
              last_seen_at: new Date().toISOString(),
              network_status: navigator.onLine ? "online" : "offline",
              ...detected,
            })
            .eq("id", device.id);

          // Refetch to get updated device data
          const { data: updated } = await supabase
            .from("devices")
            .select("*")
            .eq("id", device.id)
            .maybeSingle();
          device = updated as DeviceRow;
        }
      } else if (device) {
        // Device found by fingerprint - just update last_seen_at
        await supabase
          .from("devices")
          .update({
            device_signature: deviceSignature,
            last_seen_at: new Date().toISOString(),
            network_status: navigator.onLine ? "online" : "offline",
            ...detected,
          })
          .eq("id", device.id);
      }

      return { device, userId: user.id, registered: Boolean(device) };
    },
  });
}

/**
 * Registers this install as a device — only ever called from the explicit
 * "Add this device" consent prompt, with the name the user typed for it.
 *
 * Duplicate prevention strategy:
 * 1. Check for existing device by device_signature (most reliable - same device+browser)
 * 2. Check for existing device by name + platform (fallback for earlier registrations)
 * 3. If found by either method, adopt it instead of creating a duplicate
 * 4. Otherwise, create a new device with both fingerprint and device_signature set
 */
export function useRegisterDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input?: { name?: string }) => {
      const userId = await uid();
      const fingerprint = getFingerprint();
      const deviceSignature = calculateDeviceSignature();
      const detected = detectDevice();
      const name = (input?.name ?? "").trim() || detected.name;
      const profile = { ...detected, name };

      // Strategy 1: Check for device by signature (exact match for device+browser)
      let { data: bySignature } = await supabase
        .from("devices")
        .select("*")
        .eq("user_id", userId)
        .eq("device_signature", deviceSignature)
        .maybeSingle();

      const adoptBySignature = bySignature as DeviceRow | undefined;
      if (adoptBySignature) {
        // Device with same signature exists - update it (user is re-registering same device)
        await supabase
          .from("devices")
          .update({
            fingerprint,
            device_signature: deviceSignature,
            status: "authorized",
            last_seen_at: new Date().toISOString(),
            network_status: navigator.onLine ? "online" : "offline",
            ...profile,
          })
          .eq("id", adoptBySignature.id);
        return { ...adoptBySignature, ...profile, fingerprint, device_signature: deviceSignature, status: "authorized" } as DeviceRow;
      }

      // Strategy 2: Fallback - check for device by name + platform (for devices registered before signature was added)
      const { data: byNamePlatform } = await supabase
        .from("devices")
        .select("*")
        .eq("user_id", userId)
        .eq("name", name)
        .eq("platform", detected.platform)
        .limit(1);

      const adoptByName = (byNamePlatform ?? [])[0] as DeviceRow | undefined;
      if (adoptByName) {
        // Device with same name/platform exists - update it with new identifiers
        await supabase
          .from("devices")
          .update({
            fingerprint,
            device_signature: deviceSignature,
            status: "authorized",
            last_seen_at: new Date().toISOString(),
            network_status: navigator.onLine ? "online" : "offline",
            ...profile,
          })
          .eq("id", adoptByName.id);
        return { ...adoptByName, ...profile, fingerprint, device_signature: deviceSignature, status: "authorized" } as DeviceRow;
      }

      // No existing device found - create a new one with both fingerprint and device_signature
      const { data: created, error } = await supabase
        .from("devices")
        .insert({
          user_id: userId,
          fingerprint,
          device_signature: deviceSignature,
          ...profile,
          status: "authorized",
          network_status: navigator.onLine ? "online" : "offline",
        })
        .select("*")
        .single();
      if (error) throw error;
      const device = created as DeviceRow;

      await supabase.from("device_authorizations").insert({
        user_id: userId,
        device_id: device.id,
        device_name: device.name,
        action: "authorized",
        note: "Approved on the device itself during sign-in",
      });
      await supabase.from("notifications").insert({
        user_id: userId,
        title: "New device added to your account",
        body: `${device.name} (${device.platform}) was added and is now syncing to your account. If this wasn't you, revoke it on the Devices page.`,
        kind: "security",
      });
      return device;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

/* --------------------------------------------------------------- devices -- */

export function useDevices() {
  return useQuery({
    queryKey: ["devices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devices")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DeviceRow[];
    },
  });
}

export function useDeviceMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<DeviceRow> }) => {
      const { error } = await supabase.from("devices").update(patch).eq("id", id);
      if (error) throw error;
      if (patch.status) {
        const userId = await uid();
        await supabase.from("device_authorizations").insert({
          user_id: userId,
          device_id: id,
          action: patch.status,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["devices"] });
      qc.invalidateQueries({ queryKey: ["device-authorizations"] });
    },
  });
}

export function useDeleteDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("devices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
}

export function useDeviceAuthorizations() {
  return useQuery({
    queryKey: ["device-authorizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("device_authorizations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* -------------------------------------------------------------- activity -- */

export function useEvents(options: { days?: number; deviceId?: string; limit?: number } = {}) {
  const { days = 7, deviceId, limit = 2000 } = options;
  const scope = useDeviceScope();
  const effectiveDeviceId = deviceId ?? (scope === "all" ? undefined : scope);
  return useQuery({
    queryKey: ["events", days, effectiveDeviceId ?? "all", limit],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86400_000).toISOString();
      let query = supabase
        .from("activity_events")
        .select("*")
        .gte("started_at", since)
        .order("started_at", { ascending: false })
        .limit(limit);
      if (effectiveDeviceId) query = query.eq("device_id", effectiveDeviceId);
      const { data, error } = await query;
      if (error) throw error;
      const rows = (data ?? []) as EventRow[];
      void cacheTimeline(rows);
      return rows;
    },
  });
}

export function useDeleteEvents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (filter: {
      ids?: string[];
      deviceId?: string;
      day?: string;
      all?: boolean;
    }) => {
      const userId = await uid();
      let query = supabase.from("activity_events").delete().eq("user_id", userId);
      if (filter.ids?.length) query = query.in("event_id", filter.ids);
      else if (filter.deviceId) query = query.eq("device_id", filter.deviceId);
      else if (filter.day)
        query = query
          .gte("started_at", `${filter.day}T00:00:00.000Z`)
          .lt("started_at", `${filter.day}T23:59:59.999Z`);
      else if (!filter.all) throw new Error("No deletion scope selected");
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useToggleBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase
        .from("activity_events")
        .update({ bookmarked: value })
        .eq("event_id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

/* ------------------------------------------------------------------ sync -- */

export function useSync(deviceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const userId = await uid();
      if (!deviceId) throw new Error("This device is not registered yet");
      if (!navigator.onLine) {
        await queueEvent({
          device_id: deviceId,
          event_type: "device_offline",
          started_at: new Date().toISOString(),
        });
        throw new Error("Offline — event queued in the encrypted local cache");
      }
      const pending = await readQueue();
      if (pending.length) {
        const { error } = await db
          .from("activity_events")
          .insert(pending.map((e) => ({ ...e, user_id: userId })));
        if (error) throw error;
        await clearQueue();
      }
      await supabase.from("activity_events").insert({
        user_id: userId,
        device_id: deviceId,
        event_type: "sync_completed",
        started_at: new Date().toISOString(),
        metadata: { flushed: pending.length },
      });
      await supabase.from("sync_log").insert({
        user_id: userId,
        device_id: deviceId,
        status: "completed",
        events_count: pending.length,
        detail: `${pending.length} queued event(s) uploaded`,
      });
      await supabase
        .from("devices")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("id", deviceId);
      return pending.length;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useSyncLog() {
  return useQuery({
    queryKey: ["sync-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sync_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* --------------------------------------------------------- misc entities -- */

function listHook<T>(key: string, table: string, orderColumn = "created_at") {
  return function useList() {
    return useQuery({
      queryKey: [key],
      queryFn: async () => {
        const { data, error } = await db
          .from(table)
          .select("*")
          .order(orderColumn, { ascending: false });
        if (error) throw error;
        return (data ?? []) as T[];
      },
    });
  };
}

export const useNotifications = listHook<{
  id: string;
  title: string;
  body: string | null;
  kind: string;
  read_at: string | null;
  created_at: string;
}>("notifications", "notifications");

export const useInsights = listHook<{
  id: string;
  title: string;
  body: string;
  kind: string;
  created_at: string;
}>("insights", "insights");

export const useReports = listHook<{
  id: string;
  title: string;
  period: string;
  period_start: string;
  period_end: string;
  summary: Record<string, unknown>;
  created_at: string;
}>("reports", "reports");

export const useGoals = listHook<{
  id: string;
  title: string;
  metric: string;
  application_name: string | null;
  target_minutes: number;
  direction: string;
  period: string;
}>("goals", "user_goals");

export const useAlertRules = listHook<{
  id: string;
  name: string;
  metric: string;
  threshold_minutes: number;
  enabled: boolean;
}>("alert-rules", "alert_rules");

export const useAppCategories = listHook<{
  id: string;
  application_name: string;
  category: string;
  productivity: string;
}>("app-categories", "application_categories");

export function useRowMutation(table: string, invalidate: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      op:
        | { kind: "insert"; values: Record<string, unknown> }
        | { kind: "update"; id: string; idColumn?: string; values: Record<string, unknown> }
        | { kind: "delete"; id: string; idColumn?: string },
    ) => {
      if (op.kind === "insert") {
        const userId = await uid();
        const { error } = await db.from(table).insert({ ...op.values, user_id: userId });
        if (error) throw error;
        return;
      }
      const column = op.idColumn ?? "id";
      if (op.kind === "update") {
        const { error } = await db.from(table).update(op.values).eq(column, op.id);
        if (error) throw error;
        return;
      }
      const { error } = await db.from(table).delete().eq(column, op.id);
      if (error) throw error;
    },
    onSuccess: () => invalidate.forEach((key) => qc.invalidateQueries({ queryKey: [key] })),
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const userId = await uid();
      const [profile, privacy, prefs] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("privacy_settings").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("user_preferences").select("*").eq("user_id", userId).maybeSingle(),
      ]);
      return {
        profile: profile.data as Record<string, unknown> | null,
        privacy: privacy.data as Record<string, unknown> | null,
        preferences: prefs.data as Record<string, unknown> | null,
      };
    },
  });
}

export function useSaveSettings(table: "profiles" | "privacy_settings" | "user_preferences") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const userId = await uid();
      const key = table === "profiles" ? "id" : "user_id";
      const { error } = await db.from(table).update(values).eq(key, userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}

/** Deletes every activity row for the account. Cloud data is only removed on explicit request. */
export function useDeleteAllActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const userId = await uid();
      for (const table of ["activity_events", "sync_log", "reports", "insights"]) {
        const { error } = await db.from(table).delete().eq("user_id", userId);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

/* ------------------------------------------------- unified data deletion -- */

export const DELETABLE = {
  activity: { table: "activity_events", timeColumn: "started_at", deviceScoped: true },
  sync_log: { table: "sync_log", timeColumn: "created_at", deviceScoped: true },
  device_history: { table: "device_authorizations", timeColumn: "created_at", deviceScoped: true },
  reports: { table: "reports", timeColumn: "created_at", deviceScoped: false },
  insights: { table: "insights", timeColumn: "created_at", deviceScoped: false },
  notifications: { table: "notifications", timeColumn: "created_at", deviceScoped: false },
  goals: { table: "user_goals", timeColumn: "created_at", deviceScoped: false },
  alert_rules: { table: "alert_rules", timeColumn: "created_at", deviceScoped: false },
  app_categories: {
    table: "application_categories",
    timeColumn: "created_at",
    deviceScoped: false,
  },
} as const;

export type DeletableKey = keyof typeof DELETABLE;

/**
 * Chrome-style "clear data" mutation: caller picks the datasets, a time range
 * and optionally a single device. Nothing else in the app deletes cloud data.
 */
export function useDeleteData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      keys: DeletableKey[];
      sinceHours?: number | null;
      deviceId?: string | null;
    }) => {
      const userId = await uid();
      if (!input.keys.length) throw new Error("Select at least one type of data");
      const since =
        input.sinceHours && input.sinceHours > 0
          ? new Date(Date.now() - input.sinceHours * 3_600_000).toISOString()
          : null;
      for (const key of input.keys) {
        const spec = DELETABLE[key];
        let query = db.from(spec.table).delete().eq("user_id", userId);
        if (since) query = query.gte(spec.timeColumn, since);
        if (input.deviceId && spec.deviceScoped) query = query.eq("device_id", input.deviceId);
        const { error } = await query;
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}
