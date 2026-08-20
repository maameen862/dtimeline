import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { pushLocal } from "@/lib/notify";

type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  kind: string;
  created_at: string;
};

/**
 * Instant account alerts on every registered device.
 *
 * Any notification written to the account (a new device joining, a lockout, a
 * screen-time reminder) arrives here over the realtime channel and is raised as
 * a system notification on each device that has the app open and has allowed
 * notifications — no email required.
 */
export function useAccountAlerts() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`account-alerts-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as NotificationRow;
          qc.invalidateQueries({ queryKey: ["notifications"] });
          const when = new Date(row.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          pushLocal(row.title, `${row.body ?? ""}${row.body ? " · " : ""}${when}`, row.id);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, qc]);
}
