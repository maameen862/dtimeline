import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useEvents, useSaveSettings, useSettings } from "@/lib/api";
import { useCurrentDevice } from "@/hooks/use-current-device";
import { relativeTime } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Digital Life Timeline" },
      {
        name: "description",
        content:
          "Profile, timezone, sync frequency and display preferences — all stored in the cloud so they restore on any device.",
      },
      { property: "og:title", content: "Settings — Digital Life Timeline" },
      {
        property: "og:description",
        content: "Cloud-synced profile, sync and display preferences.",
      },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { user } = useAuth();
  const settings = useSettings();

  const saveProfile = useSaveSettings("profiles");
  const savePrefs = useSaveSettings("user_preferences");
  const { device, autoSync } = useCurrentDevice();
  const events = useEvents({ days: 90 });
  const profile = (settings.data?.profile ?? {}) as Record<string, unknown>;
  const prefs = (settings.data?.preferences ?? {}) as Record<string, unknown>;

  const ok = () => toast.success("Saved to your cloud account");

  return (
    <AppShell title="Settings" description="Preferences follow your account, not this device">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="text-sm font-semibold">Profile</h2>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Display name</Label>
              <Input
                id="full_name"
                defaultValue={(profile["full_name"] as string) ?? ""}
                onBlur={(e) => saveProfile.mutate({ full_name: e.target.value }, { onSuccess: ok })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                defaultValue={(profile["timezone"] as string) ?? ""}
                onBlur={(e) => saveProfile.mutate({ timezone: e.target.value }, { onSuccess: ok })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Email: {(profile["email"] as string) ?? "—"}
            </p>
          </div>
        </section>

        <section className="panel p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex-1 text-sm font-semibold">Synchronization</h2>
            <Badge variant={autoSync.enabled ? "default" : "secondary"}>
              {autoSync.enabled ? `Auto every ${autoSync.intervalMinutes}m` : "Auto-sync off"}
            </Badge>
          </div>
          <div className="mt-4 space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <Label htmlFor="auto-sync">Automatic synchronization</Label>
                <p className="text-xs text-muted-foreground">
                  Keeps every authorized device and the cloud archive in step in the background.
                  Individual devices can opt out on the Devices page.
                </p>
              </div>
              <Switch
                id="auto-sync"
                checked={prefs["auto_sync_enabled"] !== false}
                onCheckedChange={(v) =>
                  savePrefs.mutate({ auto_sync_enabled: v }, { onSuccess: ok })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="auto-interval">Account-wide auto-sync interval</Label>
              <Select
                value={String(prefs["auto_sync_interval_minutes"] ?? 15)}
                onValueChange={(v) =>
                  savePrefs.mutate({ auto_sync_interval_minutes: Number(v) }, { onSuccess: ok })
                }
              >
                <SelectTrigger id="auto-interval">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Every 5 minutes</SelectItem>
                  <SelectItem value="15">Every 15 minutes</SelectItem>
                  <SelectItem value="30">Every 30 minutes</SelectItem>
                  <SelectItem value="60">Every hour</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used for devices that do not set their own interval.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sync">Sync frequency (minutes)</Label>
              <Input
                id="sync"
                type="number"
                defaultValue={String(prefs["sync_interval_minutes"] ?? 5)}
                onBlur={(e) =>
                  savePrefs.mutate(
                    { sync_interval_minutes: Number(e.target.value) },
                    { onSuccess: ok },
                  )
                }
              />
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <Label htmlFor="wifi">Sync on Wi-Fi only</Label>
                <p className="text-xs text-muted-foreground">
                  Mobile devices hold events in the encrypted cache until Wi-Fi returns.
                </p>
              </div>
              <Switch
                id="wifi"
                checked={Boolean(prefs["sync_wifi_only"])}
                onCheckedChange={(v) => savePrefs.mutate({ sync_wifi_only: v }, { onSuccess: ok })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This device: {device?.name ?? "registering…"} · last sync{" "}
              {relativeTime(device?.last_sync_at)} · {(events.data ?? []).length} events cached from
              the last 90 days.
            </p>
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="text-sm font-semibold">Display</h2>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="default_range">Default time range</Label>
              <Select
                value={String(prefs["default_range_days"] ?? 7)}
                onValueChange={(v) =>
                  savePrefs.mutate({ default_range_days: Number(v) }, { onSuccess: ok })
                }
              >
                <SelectTrigger id="default_range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Today</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <Label htmlFor="compact">Compact timeline rows</Label>
                <p className="text-xs text-muted-foreground">Fit more events on screen.</p>
              </div>
              <Switch
                id="compact"
                checked={Boolean(prefs["compact_mode"])}
                onCheckedChange={(v) => savePrefs.mutate({ compact_mode: v }, { onSuccess: ok })}
              />
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <Label htmlFor="weekly">Weekly email summary</Label>
                <p className="text-xs text-muted-foreground">
                  A digest of your week across all devices.
                </p>
              </div>
              <Switch
                id="weekly"
                checked={Boolean(prefs["weekly_email"])}
                onCheckedChange={(v) => savePrefs.mutate({ weekly_email: v }, { onSuccess: ok })}
              />
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <Label htmlFor="new-device-email">Email me when a new device is added</Label>
                <p className="text-xs text-muted-foreground">
                  Security alert sent to your notification address whenever a device joins the
                  account.
                </p>
              </div>
              <Switch
                id="new-device-email"
                checked={prefs["notify_email_new_device"] !== false}
                onCheckedChange={(v) =>
                  savePrefs.mutate({ notify_email_new_device: v }, { onSuccess: ok })
                }
              />
            </div>
            <div>
              <Label htmlFor="notify-email">Notification email address</Label>
              <p className="mb-2 text-xs text-muted-foreground">
                Where alerts are sent. Leave empty to use your sign-in address ({user?.email}).
                Alerts are one-way — replies to them are not delivered.
              </p>
              <div className="flex flex-wrap gap-2">
                <Input
                  id="notify-email"
                  type="email"
                  defaultValue={(prefs["notify_email"] as string) ?? ""}
                  placeholder={user?.email ?? "you@example.com"}
                  onBlur={(e) =>
                    savePrefs.mutate(
                      { notify_email: e.target.value.trim() || null },
                      { onSuccess: ok },
                    )
                  }
                  className="w-full sm:w-72"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="text-sm font-semibold">Account recovery</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Everything you see in this app lives in cloud storage under your account: devices,
            activity timeline, analytics, reports, insights, goals, alert rules and these
            preferences. Uninstalling the app or resetting a device never deletes them. Install on a
            new device, sign in, and your history restores automatically.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="destructive" asChild>
              <Link to="/delete-data">
                <Trash2 className="size-4" /> Delete data
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link to="/privacy">Privacy controls</Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            All deletion lives in one place: choose the data types, the time range and the device —
            nothing is deleted from the timeline itself.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
