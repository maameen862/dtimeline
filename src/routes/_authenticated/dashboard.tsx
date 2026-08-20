import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Bell,
  Clock,
  Database,
  MonitorSmartphone,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { useCurrentDevice } from "@/hooks/use-current-device";
import { useDevices, useEvents, useInsights } from "@/lib/api";
import {
  byApplication,
  byDay,
  byDevice,
  compareWeeks,
  countEvents,
  filterToday,
  totalScreenSeconds,
} from "@/lib/analytics";
import { clockTime, eventLabel, greeting, minutesLabel, relativeTime } from "@/lib/format";
import { seedDemoData } from "@/lib/demo";
import { useScreenTimeDigest } from "@/hooks/use-screen-time-digest";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Digital Life Timeline" },
      {
        name: "description",
        content:
          "Today's cross-device screen time, live activity feed, device status and app share, restored from cloud storage.",
      },
      { property: "og:title", content: "Dashboard — Digital Life Timeline" },
      {
        property: "og:description",
        content: "Live cross-device activity overview with cloud-synced history.",
      },
    ],
  }),
  component: Dashboard,
});

const APP_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const { device } = useCurrentDevice();
  const devices = useDevices();
  const events = useEvents({ days: 14 });
  const insights = useInsights();
  const [seeding, setSeeding] = useState(false);

  const all = events.data ?? [];
  const today = filterToday(all);
  const week = compareWeeks(all);
  const apps = byApplication(today).slice(0, 5);
  const daily = byDay(all, 14);
  const perDevice = byDevice(all, devices.data ?? []);
  const appUsage = byApplication(all)
    .slice(0, 8)
    .map((a) => ({ name: a.name, minutes: Math.max(1, Math.round(a.seconds / 60)) }));
  const todaySeconds = totalScreenSeconds(today);
  const todayApps = byApplication(today).slice(0, 6);
  const digest = useScreenTimeDigest({ totalSeconds: todaySeconds, topApp: todayApps[0]?.name });
  const authorized = (devices.data ?? []).filter((d) => d.status === "authorized");
  const pending = (devices.data ?? []).filter((d) => d.status === "pending");
  const empty = !events.isPending && all.length < 3;

  async function seed() {
    if (!user || !device) return;
    setSeeding(true);
    try {
      await seedDemoData(user.id, device.id);
      await events.refetch();
      await devices.refetch();
      toast.success("Sample cross-device history added to your cloud account");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSeeding(false);
    }
  }

  return (
    <AppShell
      title={`${greeting()}${user?.email ? "" : ""}`}
      description="Your unified activity across every authorized device"
      actions={
        empty ? (
          <Button size="sm" variant="outline" onClick={seed} disabled={seeding}>
            <Database className="size-4" /> Add sample history
          </Button>
        ) : null
      }
    >
      {pending.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4">
          <p className="flex-1 text-sm">
            {pending.length} device {pending.length === 1 ? "is" : "are"} waiting for authorization.
          </p>
          <Button asChild size="sm" variant="secondary">
            <Link to="/devices">Review devices</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={Clock}
          label="Screen time today"
          value={minutesLabel(totalScreenSeconds(today))}
          hint={`${today.length} events recorded`}
        />
        <Stat
          icon={week.changePercent >= 0 ? TrendingUp : TrendingDown}
          label="This week vs last"
          value={`${week.changePercent > 0 ? "+" : ""}${week.changePercent}%`}
          hint={`${minutesLabel(week.thisWeek)} this week`}
        />
        <Stat
          icon={MonitorSmartphone}
          label="Authorized devices"
          value={String(authorized.length)}
          hint={`Last sync ${relativeTime(device?.last_sync_at)}`}
        />
        <Stat
          icon={Zap}
          label="Unlocks today"
          value={String(countEvents(today, "device_unlock"))}
          hint={`${countEvents(today, "app_usage")} app sessions`}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="panel p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold">Daily activity — last 14 days</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily}>
                <defs>
                  <linearGradient id="act" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} unit="h" />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface-2)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="var(--color-chart-1)"
                  fill="url(#act)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">Screen time today</h2>
              <p className="text-xs text-muted-foreground">Share of your total active time</p>
            </div>
            <Bell className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-3 font-display text-3xl font-semibold">{minutesLabel(todaySeconds)}</p>
          <ul className="mt-3 space-y-2 text-sm">
            {todayApps.length === 0 && (
              <li className="text-muted-foreground">Nothing tracked yet today.</li>
            )}
            {todayApps.map((a) => {
              const percent = Math.round((a.seconds / (todaySeconds || 1)) * 100);
              return (
                <li key={a.name}>
                  <div className="flex justify-between gap-2">
                    <span className="truncate">{a.name}</span>
                    <span className="text-muted-foreground">
                      {percent}% · {minutesLabel(a.seconds)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-surface-2">
                    <div
                      className="h-1.5 rounded-full bg-primary transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          {digest.permission !== "unsupported" && (
            <Button
              size="sm"
              variant={digest.optedIn ? "secondary" : "outline"}
              className="mt-4 w-full"
              onClick={() => (digest.optedIn ? digest.disable() : void digest.enable())}
            >
              <Bell className="size-4" />
              {digest.optedIn ? "Daily screen-time alerts on" : "Notify me of my screen time"}
            </Button>
          )}
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="panel p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold">Time per application — last 14 days</h2>
          {appUsage.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No application usage recorded yet. Keep this window open — usage is recorded live.
            </p>
          ) : (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={appUsage} layout="vertical">
                  <XAxis
                    type="number"
                    stroke="var(--color-muted-foreground)"
                    fontSize={11}
                    unit="m"
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    stroke="var(--color-muted-foreground)"
                    fontSize={11}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-surface-2)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 10,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="minutes" radius={[0, 4, 4, 0]}>
                    {appUsage.map((_, i) => (
                      <Cell key={i} fill={APP_COLORS[i % APP_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="panel p-5">
          <h2 className="text-sm font-semibold">Application share</h2>
          {appUsage.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Nothing to compare yet.</p>
          ) : (
            <>
              <div className="mt-2 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={appUsage}
                      dataKey="minutes"
                      nameKey="name"
                      innerRadius={40}
                      outerRadius={64}
                      paddingAngle={2}
                    >
                      {appUsage.map((_, i) => (
                        <Cell key={i} fill={APP_COLORS[i % APP_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-surface-2)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 10,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1.5 text-sm">
                {appUsage.slice(0, 5).map((a, i) => (
                  <li key={a.name} className="flex items-center gap-2">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: APP_COLORS[i % APP_COLORS.length] }}
                    />
                    <span className="flex-1 truncate">{a.name}</span>
                    <span className="text-muted-foreground">{a.minutes}m</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="panel p-5">
          <h2 className="text-sm font-semibold">Top apps today</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {apps.length === 0 && (
              <li className="text-muted-foreground">Nothing tracked yet today.</li>
            )}
            {apps.map((a) => (
              <li key={a.name}>
                <div className="flex justify-between">
                  <span className="truncate">{a.name}</span>
                  <span className="text-muted-foreground">{minutesLabel(a.seconds)}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-surface-2">
                  <div
                    className="h-1.5 rounded-full bg-primary"
                    style={{ width: `${(a.seconds / (apps[0]?.seconds || 1)) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel p-5">
          <h2 className="text-sm font-semibold">Per device (14 days)</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {perDevice.length === 0 && (
              <li className="text-muted-foreground">No device activity.</li>
            )}
            {perDevice.map((d) => (
              <li key={d.name} className="flex justify-between">
                <span className="truncate">{d.name}</span>
                <span className="text-muted-foreground">
                  {minutesLabel(d.seconds)} · {d.events} events
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Live activity</h2>
            <Link to="/timeline" className="text-xs text-primary hover:underline">
              Full timeline
            </Link>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {all.slice(0, 7).map((e) => (
              <li key={e.event_id} className="flex items-start gap-2">
                <span className="font-mono text-xs text-muted-foreground">
                  {clockTime(e.started_at)}
                </span>
                <span className="flex-1 truncate">
                  {eventLabel(e.event_type, e.application_name)}
                </span>
              </li>
            ))}
            {all.length === 0 && <li className="text-muted-foreground">No events yet.</li>}
          </ul>
        </section>
      </div>

      {(insights.data ?? []).length > 0 && (
        <section className="panel mt-4 p-5">
          <h2 className="text-sm font-semibold">Latest insights</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(insights.data ?? []).slice(0, 3).map((i) => (
              <article key={i.id} className="rounded-lg border border-border bg-surface-2 p-3">
                <Badge variant="secondary" className="mb-2">
                  {i.kind}
                </Badge>
                <h3 className="text-sm font-medium">{i.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{i.body}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}
