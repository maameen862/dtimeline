import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDeleteData, useDevices, type DeletableKey } from "@/lib/api";
import { useParentalGate } from "@/components/parental-gate";
import { secureClear } from "@/lib/local-cache";

export const Route = createFileRoute("/_authenticated/delete-data")({
  head: () => ({
    meta: [
      { title: "Delete data — Digital Life Timeline" },
      {
        name: "description",
        content:
          "One place to clear activity history, sync records, reports, insights and device history for a chosen time range and device.",
      },
      { property: "og:title", content: "Delete data — Digital Life Timeline" },
      {
        property: "og:description",
        content: "Clear the exact data you choose, for the time range you choose.",
      },
    ],
  }),
  component: DeleteData,
});

const ITEMS: Array<{ key: DeletableKey; label: string; hint: string }> = [
  {
    key: "activity",
    label: "Activity history",
    hint: "Every tracked event: app usage, sessions, unlocks, logins.",
  },
  { key: "sync_log", label: "Synchronization records", hint: "Sync attempts and their results." },
  {
    key: "device_history",
    label: "Device authorization history",
    hint: "Approval, revoke and registration audit entries.",
  },
  { key: "reports", label: "Saved reports", hint: "Generated daily, weekly and monthly reports." },
  { key: "insights", label: "AI insights", hint: "Habit observations generated from your data." },
  { key: "notifications", label: "Notifications", hint: "Alerts and security notices inbox." },
  { key: "goals", label: "Goals", hint: "Screen-time goals and their targets." },
  { key: "alert_rules", label: "Alert rules", hint: "Usage threshold rules." },
  {
    key: "app_categories",
    label: "Application classifications",
    hint: "Your productive / neutral / distracting labels.",
  },
];

const RANGES = [
  { value: "1", label: "Last hour" },
  { value: "24", label: "Last 24 hours" },
  { value: "168", label: "Last 7 days" },
  { value: "720", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

function DeleteData() {
  const devices = useDevices();
  const del = useDeleteData();
  const { guard, gate } = useParentalGate();
  const [selected, setSelected] = useState<DeletableKey[]>(["activity"]);
  const [range, setRange] = useState("24");
  const [deviceId, setDeviceId] = useState("all");
  const [alsoCache, setAlsoCache] = useState(true);

  const allSelected = selected.length === ITEMS.length;

  function toggle(key: DeletableKey, on: boolean) {
    setSelected((prev) => (on ? [...new Set([...prev, key])] : prev.filter((k) => k !== key)));
  }

  function run() {
    guard("delete", () =>
      del.mutate(
        {
          keys: selected,
          sinceHours: range === "all" ? null : Number(range),
          deviceId: deviceId === "all" ? null : deviceId,
        },
        {
          onSuccess: () => {
            if (alsoCache) secureClear();
            toast.success("Selected data deleted from your account");
          },
          onError: (e) => toast.error((e as Error).message),
        },
      ),
    );
  }

  return (
    <AppShell
      title="Delete data"
      description="The single place where anything is removed from your account"
    >
      {gate}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="panel p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="flex-1 text-sm font-semibold">What do you want to delete?</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelected(allSelected ? [] : ITEMS.map((i) => i.key))}
            >
              {allSelected ? "Clear selection" : "Select everything"}
            </Button>
          </div>
          <ul className="mt-4 space-y-1">
            {ITEMS.map((item) => {
              const checked = selected.includes(item.key);
              return (
                <li key={item.key}>
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                      checked ? "border-primary/50 bg-primary/5" : "border-border hover:bg-surface-2"
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => toggle(item.key, Boolean(v))}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="block text-sm font-medium">{item.label}</span>
                      <span className="block text-xs text-muted-foreground">{item.hint}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="panel h-fit p-5">
          <h2 className="text-sm font-semibold">Scope</h2>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="range">Time range</Label>
              <Select value={range} onValueChange={setRange}>
                <SelectTrigger id="range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RANGES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="device">Device</Label>
              <Select value={deviceId} onValueChange={setDeviceId}>
                <SelectTrigger id="device">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All devices</SelectItem>
                  {(devices.data ?? []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Only activity, sync and device history can be limited to one device.
              </p>
            </div>
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <Checkbox
                checked={alsoCache}
                onCheckedChange={(v) => setAlsoCache(Boolean(v))}
                className="mt-0.5"
              />
              <span>
                Also wipe the encrypted cache on this device
                <span className="block text-xs text-muted-foreground">
                  Local offline copy only — cloud data is handled above.
                </span>
              </span>
            </label>

            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                Deletion is permanent and applies to your cloud account on every device. Protected by
                the parental lock when enabled.
              </p>
            </div>

            <Button
              variant="destructive"
              className="w-full"
              disabled={del.isPending || selected.length === 0}
              onClick={run}
            >
              <Trash2 className="size-4" />
              {del.isPending ? "Deleting…" : "Delete selected data"}
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link to="/privacy">Privacy & retention settings</Link>
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
