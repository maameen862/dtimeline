import { createFileRoute } from "@tanstack/react-router";
import { Check, Laptop, Pause, Play, Smartphone, X, Globe, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useParentalGate } from "@/components/parental-gate";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useDeleteDevice,
  useDeviceAuthorizations,
  useDeviceMutation,
  useDevices,
  useEvents,
  useSyncLog,
} from "@/lib/api";
import { useCurrentDevice } from "@/hooks/use-current-device";
import { relativeTime, minutesLabel } from "@/lib/format";
import { byDevice } from "@/lib/analytics";
import { PLATFORM_CAPABILITIES } from "@/lib/device";

export const Route = createFileRoute("/_authenticated/devices")({
  head: () => ({
    meta: [
      { title: "Devices — Digital Life Timeline" },
      {
        name: "description",
        content:
          "Manage authorized devices, approve new installs, pause tracking per device and review the authorization audit log.",
      },
      { property: "og:title", content: "Devices — Digital Life Timeline" },
      {
        property: "og:description",
        content: "Approve, pause and revoke devices linked to your cloud account.",
      },
    ],
  }),
  component: Devices,
});

const ICONS: Record<string, typeof Laptop> = {
  desktop: Laptop,
  laptop: Laptop,
  phone: Smartphone,
  tablet: Smartphone,
  browser: Globe,
};

function Devices() {
  const devices = useDevices();
  const { device: current, autoSync } = useCurrentDevice();
  const { guard, gate } = useParentalGate();
  const mutate = useDeviceMutation();
  const remove = useDeleteDevice();
  const audit = useDeviceAuthorizations();
  const syncLog = useSyncLog();
  const events = useEvents({ days: 30 });
  const usage = new Map(byDevice(events.data ?? [], devices.data ?? []).map((d) => [d.name, d]));

  return (
    <AppShell
      title="Devices"
      description="Every install registered to your account — approve, pause or revoke"
      actions={
        <Badge variant="outline" className="gap-1">
          <RefreshCw className={autoSync.running ? "size-3 animate-spin" : "size-3"} />
          {autoSync.enabled ? `Auto-sync every ${autoSync.intervalMinutes}m` : "Auto-sync off"}
        </Badge>
      }
    >
      {gate}
      <div className="grid gap-4 lg:grid-cols-2">
        {(devices.data ?? []).map((d) => {
          const Icon = ICONS[d.device_type] ?? Laptop;
          const stats = usage.get(d.name);
          return (
            <article key={d.id} className="panel p-5">
              <header className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-2">
                  <Icon className="size-5 text-primary" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="flex items-center gap-2 truncate text-sm font-semibold">
                    {d.name}
                    {current?.id === d.id && <Badge variant="secondary">This device</Badge>}
                  </h2>
                  <p className="truncate text-xs text-muted-foreground">
                    {d.platform} · {d.os_version ?? "unknown OS"} · {d.app_version ?? "web"}
                  </p>
                </div>
                <Badge
                  variant={
                    d.status === "authorized"
                      ? "default"
                      : d.status === "pending"
                        ? "secondary"
                        : "destructive"
                  }
                >
                  {d.status}
                </Badge>
              </header>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-muted-foreground">Last seen</dt>
                  <dd>{relativeTime(d.last_seen_at)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Last sync</dt>
                  <dd>{relativeTime(d.last_sync_at)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Activity (30d)</dt>
                  <dd>
                    {stats
                      ? `${minutesLabel(stats.seconds)} · ${stats.events} events`
                      : "No activity"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Network / battery</dt>
                  <dd>
                    {d.network_status ?? "unknown"}
                    {d.battery_level != null ? ` · ${d.battery_level}%` : ""}
                  </dd>
                </div>
              </dl>

              <div className="mt-4">
                <Label htmlFor={`name-${d.id}`} className="text-xs text-muted-foreground">
                  Device name
                </Label>
                <Input
                  id={`name-${d.id}`}
                  defaultValue={d.name}
                  maxLength={40}
                  className="mt-1 h-8 text-xs"
                  onBlur={(e) => {
                    const name = e.target.value.trim();
                    if (!name || name === d.name) return;
                    mutate.mutate(
                      { id: d.id, patch: { name } },
                      { onSuccess: () => toast.success("Device renamed") },
                    );
                  }}
                />
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Tracks: {(PLATFORM_CAPABILITIES[d.platform] ?? ["app usage"]).join(", ")}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-2/40 p-3">
                <div className="min-w-0 flex-1">
                  <Label htmlFor={`auto-${d.id}`} className="text-xs">
                    Automatic sync
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Uploads queued events on its own schedule for this device.
                  </p>
                </div>
                <Select
                  value={String(d.sync_interval_minutes ?? 15)}
                  onValueChange={(v) =>
                    mutate.mutate({ id: d.id, patch: { sync_interval_minutes: Number(v) } })
                  }
                >
                  <SelectTrigger className="h-8 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">Every 5m</SelectItem>
                    <SelectItem value="15">Every 15m</SelectItem>
                    <SelectItem value="30">Every 30m</SelectItem>
                    <SelectItem value="60">Hourly</SelectItem>
                  </SelectContent>
                </Select>
                <Switch
                  id={`auto-${d.id}`}
                  checked={d.auto_sync !== false}
                  onCheckedChange={(v) => mutate.mutate({ id: d.id, patch: { auto_sync: v } })}
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Select
                  value={d.category}
                  onValueChange={(category) => mutate.mutate({ id: d.id, patch: { category } })}
                >
                  <SelectTrigger className="h-8 w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="work">Work</SelectItem>
                    <SelectItem value="shared">Shared</SelectItem>
                  </SelectContent>
                </Select>

                {d.status === "pending" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() =>
                        mutate.mutate(
                          { id: d.id, patch: { status: "authorized" } },
                          { onSuccess: () => toast.success(`${d.name} authorized`) },
                        )
                      }
                    >
                      <Check className="size-4" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => mutate.mutate({ id: d.id, patch: { status: "revoked" } })}
                    >
                      <X className="size-4" /> Deny
                    </Button>
                  </>
                )}

                {d.status === "authorized" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      mutate.mutate({ id: d.id, patch: { tracking_paused: !d.tracking_paused } })
                    }
                  >
                    {d.tracking_paused ? <Play className="size-4" /> : <Pause className="size-4" />}
                    {d.tracking_paused ? "Resume tracking" : "Pause tracking"}
                  </Button>
                )}

                {d.status !== "pending" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      mutate.mutate(
                        {
                          id: d.id,
                          patch: { status: d.status === "revoked" ? "authorized" : "revoked" },
                        },
                        { onSuccess: () => toast.success("Device authorization updated") },
                      )
                    }
                  >
                    {d.status === "revoked" ? "Re-authorize" : "Revoke"}
                  </Button>
                )}

                {current?.id !== d.id && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() =>
                      guard("delete", () =>
                        remove.mutate(d.id, { onSuccess: () => toast.success("Device removed") }),
                      )
                    }
                  >
                    Remove device
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="text-sm font-semibold">Authorization audit log</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(audit.data ?? []).slice(0, 10).map((a) => {
              const row = a as Record<string, string>;
              return (
                <li key={row["id"]} className="flex flex-wrap gap-2">
                  <Badge variant="outline">{row["action"]}</Badge>
                  <span className="flex-1 truncate text-muted-foreground">
                    {row["device_name"] ?? "Device"} — {row["note"] ?? "no note"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {relativeTime(row["created_at"])}
                  </span>
                </li>
              );
            })}
            {(audit.data ?? []).length === 0 && (
              <li className="text-muted-foreground">No authorization events yet.</li>
            )}
          </ul>
        </section>

        <section className="panel p-5">
          <h2 className="text-sm font-semibold">Synchronization log</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(syncLog.data ?? []).slice(0, 10).map((s) => {
              const row = s as Record<string, string | number>;
              return (
                <li key={row["id"] as string} className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{row["status"] as string}</Badge>
                  <span className="flex-1 truncate text-muted-foreground">
                    {(row["detail"] as string) ?? ""}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {relativeTime(row["created_at"] as string)}
                  </span>
                </li>
              );
            })}
            {(syncLog.data ?? []).length === 0 && (
              <li className="text-muted-foreground">No sync events recorded yet.</li>
            )}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
