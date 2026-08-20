import { createFileRoute } from "@tanstack/react-router";
import { BrainCircuit, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEvents, useInsights, useRowMutation } from "@/lib/api";
import {
  byApplication,
  byHour,
  compareWeeks,
  productivitySplit,
  totalScreenSeconds,
} from "@/lib/analytics";
import { minutesLabel, relativeTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/insights")({
  head: () => ({
    meta: [
      { title: "AI Insights — Digital Life Timeline" },
      {
        name: "description",
        content:
          "Automatically generated observations about your habits, focus windows and distraction patterns, stored with your account.",
      },
      { property: "og:title", content: "AI Insights — Digital Life Timeline" },
      {
        property: "og:description",
        content: "Habit observations and focus patterns derived from your activity history.",
      },
    ],
  }),
  component: Insights,
});

function Insights() {
  const events = useEvents({ days: 30 });
  const insights = useInsights();
  const mutate = useRowMutation("insights", ["insights"]);
  const rows = events.data ?? [];

  function generate() {
    if (rows.length === 0) {
      toast.error("No activity to analyze yet");
      return;
    }
    const apps = byApplication(rows);
    const hours = byHour(rows);
    const peak = hours.reduce((b, h) => (h.minutes > b.minutes ? h : b), hours[0]!);
    const split = productivitySplit(rows);
    const week = compareWeeks(rows);
    const distracting = split.find((s) => s.name === "Distracting")?.seconds ?? 0;
    const total = totalScreenSeconds(rows) || 1;

    const generated = [
      {
        title: `Your focus window is around ${peak.hour}`,
        body: `You are most active at ${peak.hour} with about ${peak.minutes} minutes of tracked activity in that hour across the last 30 days. Schedule deep work here.`,
        kind: "pattern",
      },
      {
        title: `${apps[0]?.name ?? "Your top app"} dominates your time`,
        body: `${apps[0]?.name ?? "This app"} accounts for ${minutesLabel(apps[0]?.seconds ?? 0)} — roughly ${Math.round(((apps[0]?.seconds ?? 0) / total) * 100)}% of tracked activity.`,
        kind: "usage",
      },
      {
        title:
          week.changePercent >= 0
            ? `Screen time rose ${week.changePercent}% this week`
            : `Screen time fell ${Math.abs(week.changePercent)}% this week`,
        body: `${minutesLabel(week.thisWeek)} this week versus ${minutesLabel(week.lastWeek)} last week across all authorized devices.`,
        kind: "trend",
      },
      {
        title: `${Math.round((distracting / total) * 100)}% of your time is classified distracting`,
        body: `That is ${minutesLabel(distracting)} over 30 days. Reclassify apps on the Applications page to sharpen this number.`,
        kind: "wellbeing",
      },
    ];

    generated.forEach((values) => mutate.mutate({ kind: "insert", values }));
    toast.success("New insights generated");
  }

  return (
    <AppShell
      title="AI Insights"
      description="Observations derived from your cloud activity history"
      actions={
        <Button size="sm" onClick={generate}>
          <Sparkles className="size-4" /> Generate insights
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        {(insights.data ?? []).map((i) => (
          <article key={i.id} className="panel p-5">
            <div className="flex items-center gap-2">
              <BrainCircuit className="size-4 text-primary" />
              <Badge variant="secondary">{i.kind}</Badge>
              <span className="ml-auto text-xs text-muted-foreground">
                {relativeTime(i.created_at)}
              </span>
            </div>
            <h2 className="mt-3 text-sm font-semibold">{i.title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{i.body}</p>
            <Button
              size="sm"
              variant="ghost"
              className="mt-3 text-destructive"
              onClick={() => mutate.mutate({ kind: "delete", id: i.id })}
            >
              Dismiss
            </Button>
          </article>
        ))}
        {(insights.data ?? []).length === 0 && (
          <p className="panel p-6 text-sm text-muted-foreground">
            No insights yet. Generate them from your recorded activity.
          </p>
        )}
      </div>
    </AppShell>
  );
}
