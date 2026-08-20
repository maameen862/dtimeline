import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { minutesLabel } from "@/lib/format";

const KEY = "dlt.screentime.limit.fired";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function alreadyFired(stage: "warn" | "over") {
  return localStorage.getItem(`${KEY}.${stage}`) === today();
}

function markFired(stage: "warn" | "over") {
  localStorage.setItem(`${KEY}.${stage}`, today());
}

/**
 * Screen-time reminder — notification only, never a restriction.
 *
 * Once today's active time crosses 80% of the chosen daily limit, and again
 * when it passes the limit itself, one reminder is written to the account inbox
 * (which raises a system notification on every signed-in device). Nothing is
 * blocked or locked; the device stays fully usable.
 */
export function useScreenTimeLimit(args: {
  totalSeconds: number;
  limitMinutes: number;
  enabled: boolean;
}) {
  const { user } = useAuth();
  const { totalSeconds, limitMinutes, enabled } = args;

  useEffect(() => {
    if (!user || !enabled || limitMinutes <= 0) return;
    const limitSeconds = limitMinutes * 60;

    const notify = (title: string, body: string) =>
      void supabase.from("notifications").insert({ user_id: user.id, title, body, kind: "alert" });

    if (totalSeconds >= limitSeconds && !alreadyFired("over")) {
      markFired("over");
      markFired("warn");
      notify(
        "Screen time limit reached",
        `You've been active ${minutesLabel(totalSeconds)} today — past your ${minutesLabel(
          limitSeconds,
        )} reminder. Nothing is blocked, this is just a nudge.`,
      );
      return;
    }

    if (totalSeconds >= limitSeconds * 0.8 && !alreadyFired("warn")) {
      markFired("warn");
      notify(
        "Approaching your screen time limit",
        `${minutesLabel(totalSeconds)} used of your ${minutesLabel(limitSeconds)} daily reminder.`,
      );
    }
  }, [user, totalSeconds, limitMinutes, enabled]);
}
