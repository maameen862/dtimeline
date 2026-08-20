import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, BellRing, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  useAlertRules,
  useNotifications,
  useRowMutation,
  useSaveSettings,
  useSettings,
} from "@/lib/api";
import { relativeTime } from "@/lib/format";
import { useDeviceNotifications } from "@/lib/notify";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Digital Life Timeline" },
      {
        name: "description",
        content:
          "Security alerts, device approval requests and usage threshold rules for your synchronized account.",
      },
      { property: "og:title", content: "Notifications — Digital Life Timeline" },
      {
        property: "og:description",
        content: "Alerts for new devices, sync issues and usage thresholds you define.",
      },
    ],
  }),
  component: Notifications,
});

function Notifications() {
  const notifications = useNotifications();
  const notificationMutation = useRowMutation("notifications", ["notifications"]);
  const rules = useAlertRules();
  const ruleMutation = useRowMutation("alert_rules", ["alert-rules"]);
  const [name, setName] = useState("");
  const [threshold, setThreshold] = useState("180");

  const settings = useSettings();
  const savePrefs = useSaveSettings("user_preferences");
  const prefs = (settings.data?.preferences ?? {}) as Record<string, unknown>;
  const push = useDeviceNotifications();
  const limit = Number(prefs["screen_time_limit_minutes"] ?? 0);
  const ok = () => toast.success("Reminder settings saved");

  return (
    <AppShell title="Notifications" description="Alerts, approvals and usage thresholds">
      <section className="panel mb-4 p-5">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Screen time reminder</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Get a nudge when your daily active time passes a limit you choose. It is a reminder only —
          nothing is ever blocked or locked, and your device stays fully usable.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="limit">Daily limit (minutes)</Label>
            <Input
              id="limit"
              type="number"
              min={0}
              max={1440}
              defaultValue={limit || ""}
              placeholder="e.g. 240"
              className="mt-1"
              onBlur={(e) =>
                savePrefs.mutate(
                  { screen_time_limit_minutes: Math.max(0, Number(e.target.value) || 0) },
                  { onSuccess: ok },
                )
              }
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {limit > 0
                ? `Reminders at ${Math.round(limit * 0.8)} min and again at ${limit} min.`
                : "Set to 0 or empty to turn reminders off."}
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <Label htmlFor="limit-on">Limit reminders</Label>
                <p className="text-xs text-muted-foreground">Notify me when I pass the limit.</p>
              </div>
              <Switch
                id="limit-on"
                checked={prefs["notify_screen_time_limit"] !== false}
                onCheckedChange={(v) =>
                  savePrefs.mutate({ notify_screen_time_limit: v }, { onSuccess: ok })
                }
              />
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <Label htmlFor="device-on">New device alerts</Label>
                <p className="text-xs text-muted-foreground">
                  Instant alert with the device name and time whenever a device joins the account.
                </p>
              </div>
              <Switch
                id="device-on"
                checked={prefs["notify_new_device_push"] !== false}
                onCheckedChange={(v) =>
                  savePrefs.mutate({ notify_new_device_push: v }, { onSuccess: ok })
                }
              />
            </div>
            {push.permission !== "unsupported" && (
              <Button
                size="sm"
                variant={push.optedIn ? "secondary" : "default"}
                onClick={() => (push.optedIn ? push.disable() : void push.enable())}
              >
                <BellRing className="size-4" />
                {push.optedIn ? "Alerts on this device: on" : "Allow notifications on this device"}
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Turn this on for each device you sign in on — every one of them then pops the same
              alerts. No email needed.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel divide-y divide-border">
          <header className="flex items-center gap-2 p-4">
            <Bell className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Inbox</h2>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto"
              onClick={() => {
                (notifications.data ?? [])
                  .filter((n) => !n.read_at)
                  .forEach((n) =>
                    notificationMutation.mutate({
                      kind: "update",
                      id: n.id,
                      values: { read_at: new Date().toISOString() },
                    }),
                  );
              }}
            >
              Mark all read
            </Button>
          </header>
          {(notifications.data ?? []).map((n) => (
            <article key={n.id} className={cn("flex gap-3 p-4", !n.read_at && "bg-surface-2")}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant={n.kind === "security" ? "destructive" : "secondary"}>
                    {n.kind}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {relativeTime(n.created_at)}
                  </span>
                </div>
                <h3 className="mt-1.5 text-sm font-medium">{n.title}</h3>
                {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => notificationMutation.mutate({ kind: "delete", id: n.id })}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </article>
          ))}
          {(notifications.data ?? []).length === 0 && (
            <p className="p-6 text-sm text-muted-foreground">No notifications yet.</p>
          )}
        </section>

        <section className="panel p-5">
          <div className="flex items-center gap-2">
            <BellRing className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Usage alert rules</h2>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {(rules.data ?? []).map((r) => (
              <li key={r.id} className="flex items-center gap-3">
                <span className="flex-1">
                  {r.name}
                  <span className="text-muted-foreground"> · over {r.threshold_minutes} min</span>
                </span>
                <Switch
                  checked={r.enabled}
                  onCheckedChange={(enabled) =>
                    ruleMutation.mutate({ kind: "update", id: r.id, values: { enabled } })
                  }
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => ruleMutation.mutate({ kind: "delete", id: r.id })}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </li>
            ))}
            {(rules.data ?? []).length === 0 && (
              <li className="text-muted-foreground">No alert rules yet.</li>
            )}
          </ul>

          <form
            className="mt-4 flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name) return;
              ruleMutation.mutate(
                {
                  kind: "insert",
                  values: {
                    name,
                    metric: "screen_time",
                    threshold_minutes: Number(threshold),
                    enabled: true,
                  },
                },
                {
                  onSuccess: () => {
                    setName("");
                    toast.success("Alert rule saved");
                  },
                },
              );
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="rule">Rule name</Label>
              <Input
                id="rule"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Warn me after 3h of screen time"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="threshold">Minutes</Label>
              <Input
                id="threshold"
                type="number"
                className="w-28"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
            </div>
            <Button type="submit">Add rule</Button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
