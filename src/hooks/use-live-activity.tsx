import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { detectBrowser } from "@/lib/device";

const HEARTBEAT_MS = 5_000;
const SESSION_KEY = "dlt.live.session";

export interface LiveActivity {
  application: string;
  seconds: number;
  active: boolean;
}

interface LiveSession {
  eventId: string;
  application: string;
  deviceId: string;
  day: string;
  seconds: number;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function readSession(): LiveSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LiveSession;
    return parsed.day === todayKey() ? parsed : null;
  } catch {
    return null;
  }
}

function writeSession(session: LiveSession) {
  if (typeof window !== "undefined") sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/** Guards against two mounts racing to create the same usage row. */
let starting: Promise<LiveSession | null> | null = null;

/**
 * Foreground activity recorder for this install.
 *
 * A single usage row per browser session is created the first time the app is
 * opened and then grown in place every few seconds while the window is focused.
 * Navigating between pages resumes the same row instead of creating a new one,
 * so per-application totals in the charts keep climbing continuously instead of
 * fragmenting into hundreds of zero-length events.
 */
export function useLiveActivity(options: {
  deviceId: string | undefined;
  enabled: boolean;
}): LiveActivity | null {
  const { deviceId, enabled } = options;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const application = detectBrowser();
  const [seconds, setSeconds] = useState(() => readSession()?.seconds ?? 0);
  const [active, setActive] = useState(true);
  const session = useRef<LiveSession | null>(readSession());

  useEffect(() => {
    if (!user || !deviceId || !enabled) return;
    let cancelled = false;

    async function resume(): Promise<LiveSession | null> {
      const existing = readSession();
      if (existing && existing.deviceId === deviceId && existing.application === application) {
        return existing;
      }

      const startedAt = new Date().toISOString();
      await supabase.from("activity_events").insert({
        user_id: user!.id,
        device_id: deviceId!,
        event_type: "app_open",
        application_name: application,
        started_at: startedAt,
        duration_seconds: 0,
        metadata: { source: "live-tracker" },
      });

      const { data } = await supabase
        .from("activity_events")
        .insert({
          user_id: user!.id,
          device_id: deviceId!,
          event_type: "app_usage",
          application_name: application,
          started_at: startedAt,
          duration_seconds: 0,
          metadata: { live: true, source: "live-tracker" },
        })
        .select("event_id")
        .single();

      const eventId = (data as { event_id: string } | null)?.event_id;
      if (!eventId) return null;
      const created: LiveSession = {
        eventId,
        application,
        deviceId: deviceId!,
        day: todayKey(),
        seconds: 0,
      };
      writeSession(created);
      return created;
    }

    async function boot() {
      starting = starting ?? resume();
      const result = await starting.finally(() => {
        starting = null;
      });
      if (cancelled || !result) return;
      session.current = result;
      setSeconds(result.seconds);
      queryClient.invalidateQueries({ queryKey: ["events"] });
    }

    void boot();

    async function push() {
      const current = session.current;
      if (!current) return;
      writeSession(current);
      await supabase
        .from("activity_events")
        .update({
          duration_seconds: Math.round(current.seconds),
          ended_at: new Date().toISOString(),
        })
        .eq("event_id", current.eventId);
      queryClient.invalidateQueries({ queryKey: ["events"] });
    }

    const timer = window.setInterval(() => {
      const focused = !document.hidden;
      setActive(focused);
      const current = session.current;
      if (!focused || !current) return;
      current.seconds += HEARTBEAT_MS / 1000;
      setSeconds(current.seconds);
      void push();
    }, HEARTBEAT_MS);

    const onVisibility = () => {
      setActive(!document.hidden);
      void push();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onVisibility);
      void push();
    };
  }, [user, deviceId, enabled, application, queryClient]);

  if (!enabled || !deviceId) return null;
  return { application, seconds, active };
}
