import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useSaveSettings, useSettings } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy — Digital Life Timeline" },
      {
        name: "description",
        content:
          "Control what is tracked, exclude applications, set retention limits and delete your cloud activity history at any time.",
      },
      { property: "og:title", content: "Privacy — Digital Life Timeline" },
      {
        property: "og:description",
        content: "Granular tracking controls, retention limits and full data deletion.",
      },
    ],
  }),
  component: Privacy,
});

const TOGGLES: Array<{ key: string; label: string; hint: string }> = [
  {
    key: "track_app_usage",
    label: "Track application usage",
    hint: "Records app names and durations — never window contents or keystrokes.",
  },
  {
    key: "track_device_events",
    label: "Track device events",
    hint: "Lock, unlock, startup, shutdown and charging events.",
  },
  {
    key: "track_web_categories",
    label: "Track browsing categories",
    hint: "Category-level only. Individual URLs and page contents are never stored.",
  },
  {
    key: "track_location_coarse",
    label: "Coarse device location",
    hint: "Optional city-level context on device records. Off by default.",
  },
  {
    key: "require_device_approval",
    label: "Require approval for new devices",
    hint: "New installs stay pending until you approve them from an authorized device.",
  },
  {
    key: "share_analytics",
    label: "Contribute anonymous product analytics",
    hint: "Aggregate counts only, no activity contents.",
  },
];

function Privacy() {
  const settings = useSettings();
  const save = useSaveSettings("privacy_settings");
  const privacy = (settings.data?.privacy ?? {}) as Record<string, unknown>;

  function update(values: Record<string, unknown>) {
    save.mutate(values, {
      onSuccess: () => toast.success("Privacy settings saved to your account"),
      onError: (e) => toast.error((e as Error).message),
    });
  }

  return (
    <AppShell title="Privacy" description="You decide what is collected — and what is deleted">
      <section className="panel p-5">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Collection controls</h2>
        </div>
        <ul className="mt-4 space-y-4">
          {TOGGLES.map((t) => (
            <li key={t.key} className="flex items-start gap-4">
              <div className="flex-1">
                <Label htmlFor={t.key}>{t.label}</Label>
                <p className="text-xs text-muted-foreground">{t.hint}</p>
              </div>
              <Switch
                id={t.key}
                checked={Boolean(privacy[t.key])}
                onCheckedChange={(v) => update({ [t.key]: v })}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="panel mt-4 p-5">
        <h2 className="text-sm font-semibold">Retention and exclusions</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="retention">Retention (days)</Label>
            <Input
              id="retention"
              type="number"
              defaultValue={String(privacy["retention_days"] ?? 365)}
              onBlur={(e) => update({ retention_days: Number(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">
              Activity older than this can be pruned. Cloud data is never removed automatically on
              uninstall.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="excluded">Excluded applications</Label>
            <Input
              id="excluded"
              defaultValue={((privacy["excluded_apps"] as string[]) ?? []).join(", ")}
              placeholder="Banking App, Password Manager"
              onBlur={(e) =>
                update({
                  excluded_apps: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Activity from these apps is never recorded on any device.
            </p>
          </div>
        </div>
      </section>

      <section className="panel mt-4 border-destructive/40 p-5">
        <h2 className="text-sm font-semibold">Deleting data</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Individual events are no longer deleted one by one. Everything is removed from a single
          place, where you pick exactly which data and which time range to clear.
        </p>
        <Button variant="secondary" className="mt-4" asChild>
          <Link to="/delete-data">
            <Trash2 className="size-4" /> Open delete data
          </Link>
        </Button>
      </section>

      <p className="mt-4 text-xs text-muted-foreground">
        This product never collects keystrokes, screenshots, message contents, passwords or
        individual URLs. Use it only on devices you own or are explicitly authorized to monitor.
      </p>
    </AppShell>
  );
}
