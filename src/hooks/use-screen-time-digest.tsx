import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { minutesLabel } from "@/lib/format";

const DIGEST_KEY = "dlt.screentime.digest";
const OPT_IN_KEY = "dlt.screentime.notify";

function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Android-style screen-time reporting.
 *
 * Records one daily digest into the account notification inbox and, when the
 * user has allowed it, also raises a native system notification — the same
 * behaviour as a phone's daily screen-time report.
 */
export function useScreenTimeDigest(args: { totalSeconds: number; topApp?: string | undefined }) {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() =>
    typeof window === "undefined" || !("Notification" in window)
      ? "unsupported"
      : Notification.permission,
  );
  const [optedIn, setOptedIn] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(OPT_IN_KEY) === "1",
  );

  const enable = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      localStorage.setItem(OPT_IN_KEY, "1");
      setOptedIn(true);
    }
  }, []);

  const disable = useCallback(() => {
    localStorage.removeItem(OPT_IN_KEY);
    setOptedIn(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    if (args.totalSeconds < 60) return;
    if (localStorage.getItem(DIGEST_KEY) === today()) return;
    localStorage.setItem(DIGEST_KEY, today());

    const body = `You were active for ${minutesLabel(args.totalSeconds)} today${
      args.topApp ? `, mostly in ${args.topApp}` : ""
    }.`;

    void supabase.from("notifications").insert({
      user_id: user.id,
      title: "Screen time report",
      body,
      kind: "info",
    });

    if (optedIn && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("Screen time report", { body, icon: "/icon-192.png" });
      } catch {
        /* system notification unavailable — inbox entry still recorded */
      }
    }
  }, [user, args.totalSeconds, args.topApp, optedIn]);

  return { permission, optedIn, enable, disable };
}
