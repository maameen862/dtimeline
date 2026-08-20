import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEvents } from "@/lib/api";
import { useCurrentDevice } from "@/hooks/use-current-device";
import { byApplication } from "@/lib/analytics";
import { minutesLabel } from "@/lib/format";
import { RANGE_OPTIONS } from "@/lib/ranges";

export const Route = createFileRoute("/_authenticated/applications")({
  head: () => ({
    meta: [
      { title: "Applications — Digital Life Timeline" },
      {
        name: "description",
        content:
          "See which applications consume your time across devices, with total active time and the share each app takes of your screen time.",
      },
      { property: "og:title", content: "Applications — Digital Life Timeline" },
      {
        property: "og:description",
        content:
          "Per-application usage totals and share of total active time, synced to your account.",
      },
    ],
  }),
  component: Applications,
});

function Applications() {
  const { live } = useCurrentDevice();
  const [days, setDays] = useState("1");
  const events = useEvents({ days: Number(days) });
  const apps = byApplication(events.data ?? []);
  const total = apps.reduce((s, a) => s + a.seconds, 0);
  const denominator = total || 1;

  return (
    <AppShell
      title="Applications"
      description="Real application names, captured automatically — no manual setup"
      actions={
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      {live && (
        <div className="panel mb-4 flex flex-wrap items-center gap-3 p-4">
          <span
            className={`h-2 w-2 rounded-full ${live.active ? "animate-pulse bg-primary" : "bg-muted-foreground"}`}
          />
          <span className="text-sm font-medium">{live.application}</span>
          <Badge variant="secondary">
            {live.active ? "recording now" : "paused (window hidden)"}
          </Badge>
          <span className="ml-auto text-sm text-muted-foreground">
            {minutesLabel(live.seconds)} this session
          </span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="panel p-4">
          <p className="text-xs text-muted-foreground">Total active time</p>
          <p className="mt-1 font-display text-2xl font-semibold">{minutesLabel(total)}</p>
        </div>
        <div className="panel p-4">
          <p className="text-xs text-muted-foreground">Applications used</p>
          <p className="mt-1 font-display text-2xl font-semibold">{apps.length}</p>
        </div>
        <div className="panel p-4">
          <p className="text-xs text-muted-foreground">Most used</p>
          <p className="mt-1 truncate font-display text-2xl font-semibold">
            {apps[0]?.name ?? "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            {apps[0] ? `${Math.round((apps[0].seconds / denominator) * 100)}% of active time` : ""}
          </p>
        </div>
      </div>

      <div className="panel mt-4 divide-y divide-border">
        {apps.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">No application usage recorded yet.</p>
        )}
        {apps.map((a) => {
          const percent = Math.round((a.seconds / denominator) * 100);
          return (
            <div key={a.name} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{a.name}</span>
                  <Badge variant="secondary">{percent}%</Badge>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-surface-2">
                  <div
                    className="h-1.5 rounded-full bg-primary transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
              <span className="w-24 text-right text-sm text-muted-foreground">
                {minutesLabel(a.seconds)}
              </span>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
