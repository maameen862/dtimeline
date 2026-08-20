import { createFileRoute } from "@tanstack/react-router";
import { FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDevices, useEvents, useReports, useRowMutation } from "@/lib/api";
import { byApplication, byDevice, productivitySplit, totalScreenSeconds } from "@/lib/analytics";
import { dayKey, minutesLabel, relativeTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Digital Life Timeline" },
      {
        name: "description",
        content:
          "Generate and export daily, weekly or monthly activity reports built from your cloud-stored timeline.",
      },
      { property: "og:title", content: "Reports — Digital Life Timeline" },
      {
        property: "og:description",
        content: "Daily, weekly and monthly activity reports with JSON and CSV export.",
      },
    ],
  }),
  component: Reports,
});

function Reports() {
  const events = useEvents({ days: 90 });
  const devices = useDevices();
  const reports = useReports();
  const mutate = useRowMutation("reports", ["reports"]);

  function build(period: "daily" | "weekly" | "monthly") {
    const days = period === "daily" ? 1 : period === "weekly" ? 7 : 30;
    const since = Date.now() - days * 86400_000;
    const rows = (events.data ?? []).filter((e) => new Date(e.started_at).getTime() >= since);
    if (rows.length === 0) {
      toast.error("No activity in this period");
      return;
    }
    const summary = {
      total_time: minutesLabel(totalScreenSeconds(rows)),
      events: rows.length,
      top_apps: byApplication(rows)
        .slice(0, 5)
        .map((a) => ({ name: a.name, time: minutesLabel(a.seconds) })),
      devices: byDevice(rows, devices.data ?? []).map((d) => ({
        name: d.name,
        time: minutesLabel(d.seconds),
        events: d.events,
      })),
      productivity: productivitySplit(rows).map((p) => ({
        name: p.name,
        time: minutesLabel(p.seconds),
      })),
    };
    mutate.mutate(
      {
        kind: "insert",
        values: {
          title: `${period[0]!.toUpperCase()}${period.slice(1)} activity report`,
          period,
          period_start: dayKey(new Date(since).toISOString()),
          period_end: dayKey(new Date().toISOString()),
          summary,
        },
      },
      { onSuccess: () => toast.success("Report saved to your account") },
    );
  }

  function download(name: string, content: string, mime: string) {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    const rows = events.data ?? [];
    const header = "started_at,event_type,application,category,productivity,duration_seconds\n";
    const body = rows
      .map((e) =>
        [
          e.started_at,
          e.event_type,
          e.application_name ?? "",
          e.category ?? "",
          e.productivity ?? "",
          e.duration_seconds,
        ].join(","),
      )
      .join("\n");
    download("digital-life-timeline.csv", header + body, "text/csv");
  }

  return (
    <AppShell
      title="Reports"
      description="Summaries generated from your cloud activity history"
      actions={
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => build("daily")}>
            Daily
          </Button>
          <Button size="sm" variant="outline" onClick={() => build("weekly")}>
            Weekly
          </Button>
          <Button size="sm" variant="outline" onClick={() => build("monthly")}>
            Monthly
          </Button>
          <Button size="sm" variant="secondary" onClick={exportCsv}>
            Export CSV
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        {(reports.data ?? []).map((r) => (
          <article key={r.id} className="panel p-5">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <Badge variant="secondary">{r.period}</Badge>
              <span className="ml-auto text-xs text-muted-foreground">
                {relativeTime(r.created_at)}
              </span>
            </div>
            <h2 className="mt-3 text-sm font-semibold">{r.title}</h2>
            <p className="text-xs text-muted-foreground">
              {r.period_start} → {r.period_end}
            </p>
            <pre className="mt-3 max-h-56 overflow-auto rounded-lg border border-border bg-surface-2 p-3 font-mono text-xs">
              {JSON.stringify(r.summary, null, 2)}
            </pre>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  download(
                    `${r.period}-report.json`,
                    JSON.stringify(r, null, 2),
                    "application/json",
                  )
                }
              >
                Download JSON
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => mutate.mutate({ kind: "delete", id: r.id })}
              >
                <Trash2 className="size-4" /> Delete
              </Button>
            </div>
          </article>
        ))}
        {(reports.data ?? []).length === 0 && (
          <p className="panel p-6 text-sm text-muted-foreground">
            No reports yet. Generate a daily, weekly or monthly summary.
          </p>
        )}
      </div>
    </AppShell>
  );
}
