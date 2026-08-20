import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDevices, useEvents, useGoals, useRowMutation } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  byApplication,
  byDay,
  byDevice,
  byHour,
  compareWeeks,
  totalScreenSeconds,
} from "@/lib/analytics";
import { minutesLabel } from "@/lib/format";
import { RANGE_OPTIONS } from "@/lib/ranges";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Digital Life Timeline" },
      {
        name: "description",
        content:
          "Screen-time trends, hourly patterns, per-device comparisons and goal tracking computed from your cloud activity history.",
      },
      { property: "og:title", content: "Analytics — Digital Life Timeline" },
      {
        property: "og:description",
        content: "Trends, peak hours and per-device comparisons for your digital activity.",
      },
    ],
  }),
  component: Analytics,
});

const AXIS = { stroke: "var(--color-muted-foreground)", fontSize: 11 };
const TOOLTIP = {
  background: "var(--color-surface-2)",
  border: "1px solid var(--color-border)",
  borderRadius: 10,
  fontSize: 12,
};

function Analytics() {
  const [days, setDays] = useState("30");
  const events = useEvents({ days: Number(days) });
  const devices = useDevices();
  const goals = useGoals();
  const goalMutation = useRowMutation("user_goals", ["goals"]);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("120");

  const rows = events.data ?? [];
  const daily = byDay(rows, Number(days));
  const hourly = byHour(rows);
  const perDevice = byDevice(rows, devices.data ?? []);
  const apps = byApplication(rows).slice(0, 8);
  const week = compareWeeks(rows);
  const peak = hourly.reduce((best, h) => (h.minutes > best.minutes ? h : best), hourly[0]!);

  return (
    <AppShell
      title="Analytics"
      description="Patterns and trends across your authorized devices"
      actions={
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="h-9 w-36">
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
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="panel p-4">
          <p className="text-xs text-muted-foreground">Total tracked time</p>
          <p className="mt-1 font-display text-2xl font-semibold">
            {minutesLabel(totalScreenSeconds(rows))}
          </p>
        </div>
        <div className="panel p-4">
          <p className="text-xs text-muted-foreground">Week over week</p>
          <p className="mt-1 font-display text-2xl font-semibold">
            {week.changePercent > 0 ? "+" : ""}
            {week.changePercent}%
          </p>
        </div>
        <div className="panel p-4">
          <p className="text-xs text-muted-foreground">Peak hour</p>
          <p className="mt-1 font-display text-2xl font-semibold">{peak?.hour ?? "—"}</p>
        </div>
      </div>

      <section className="panel mt-4 p-5">
        <h2 className="text-sm font-semibold">Daily screen time</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={daily}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="day" {...AXIS} />
              <YAxis {...AXIS} unit="h" />
              <Tooltip contentStyle={TOOLTIP} />
              <Line
                type="monotone"
                dataKey="hours"
                stroke="var(--color-chart-1)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="text-sm font-semibold">Activity by hour of day</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourly}>
                <XAxis dataKey="hour" {...AXIS} interval={3} />
                <YAxis {...AXIS} unit="m" />
                <Tooltip contentStyle={TOOLTIP} />
                <Bar dataKey="minutes" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="text-sm font-semibold">Top applications</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={apps.map((a) => ({ name: a.name, minutes: Math.round(a.seconds / 60) }))}
                layout="vertical"
              >
                <XAxis type="number" {...AXIS} unit="m" />
                <YAxis type="category" dataKey="name" width={120} {...AXIS} />
                <Tooltip contentStyle={TOOLTIP} />
                <Bar dataKey="minutes" fill="var(--color-chart-4)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="panel mt-4 p-5">
        <h2 className="text-sm font-semibold">Device comparison</h2>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={perDevice.map((d) => ({
                name: d.name,
                minutes: Math.round(d.seconds / 60),
                events: d.events,
              }))}
            >
              <XAxis dataKey="name" {...AXIS} />
              <YAxis {...AXIS} />
              <Tooltip contentStyle={TOOLTIP} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="minutes" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="events" fill="var(--color-chart-3)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel mt-4 p-5">
        <h2 className="text-sm font-semibold">Goals</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(goals.data ?? []).map((g) => {
            const used =
              byApplication(rows).find((a) => a.name === g.application_name)?.seconds ?? 0;
            const pct = Math.min(100, Math.round((used / 60 / g.target_minutes) * 100));
            return (
              <li key={g.id}>
                <div className="flex justify-between">
                  <span>{g.title}</span>
                  <span className="text-muted-foreground">
                    {minutesLabel(used)} / {g.target_minutes}m ({g.direction})
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-surface-2">
                  <div className="h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
          {(goals.data ?? []).length === 0 && (
            <li className="text-muted-foreground">No goals yet — add one below.</li>
          )}
        </ul>
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title) return;
            goalMutation.mutate(
              {
                kind: "insert",
                values: { title, metric: "screen_time", target_minutes: Number(target) },
              },
              {
                onSuccess: () => {
                  setTitle("");
                  toast.success("Goal saved to your account");
                },
              },
            );
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="goal">New goal</Label>
            <Input
              id="goal"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Keep screen time under 4h"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="target">Target minutes</Label>
            <Input
              id="target"
              type="number"
              className="w-32"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </div>
          <Button type="submit">Add goal</Button>
        </form>
      </section>
    </AppShell>
  );
}
