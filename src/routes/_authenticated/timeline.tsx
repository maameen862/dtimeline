import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bookmark, Filter } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDevices, useEvents, useToggleBookmark } from "@/lib/api";
import { clockTime, dayKey, dayLabel, eventLabel, minutesLabel } from "@/lib/format";
import { RANGE_OPTIONS } from "@/lib/ranges";

import { cn } from "@/lib/utils";
import { useParentalGate } from "@/components/parental-gate";
import { isGuarded } from "@/lib/parental";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/timeline")({
  head: () => ({
    meta: [
      { title: "Timeline — Digital Life Timeline" },
      {
        name: "description",
        content:
          "Chronological, searchable feed of every tracked event across your devices, grouped by day and stored in the cloud.",
      },
      { property: "og:title", content: "Timeline — Digital Life Timeline" },
      {
        property: "og:description",
        content:
          "Chronological cross-device activity feed with search, filters and per-event deletion.",
      },
    ],
  }),
  component: Timeline,
});

function Timeline() {
  const devices = useDevices();
  const [days, setDays] = useState("7");
  const [deviceId, setDeviceId] = useState("all");
  const [type, setType] = useState("all");
  const [query, setQuery] = useState("");
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const events = useEvents({
    days: Number(days),
    ...(deviceId === "all" ? {} : { deviceId }),
  });
  const { guard, gate, lock } = useParentalGate();
  const [unlocked, setUnlocked] = useState(false);
  const needsPin = isGuarded(lock, "access") && !unlocked;
  const bookmark = useToggleBookmark();

  const deviceNames = useMemo(
    () => new Map((devices.data ?? []).map((d) => [d.id, d.name])),
    [devices.data],
  );

  const filtered = (events.data ?? []).filter((e) => {
    if (type !== "all" && e.event_type !== type) return false;
    if (onlyBookmarked && !e.bookmarked) return false;
    if (query) {
      const haystack =
        `${e.application_name ?? ""} ${e.event_type} ${e.category ?? ""}`.toLowerCase();
      if (!haystack.includes(query.toLowerCase())) return false;
    }
    return true;
  });

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const e of filtered) {
      const key = dayKey(e.started_at);
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return [...map.entries()];
  }, [filtered]);

  const types = [...new Set((events.data ?? []).map((e) => e.event_type))];

  if (needsPin) {
    return (
      <AppShell title="Timeline" description="Protected by the parental lock">
        {gate}
        <section className="panel mx-auto max-w-md p-8 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10">
            <Lock className="size-5 text-primary" />
          </span>
          <h2 className="mt-4 text-sm font-semibold">Detailed activity is locked</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the parental PIN or a recovery code to view the full timeline for this session.
          </p>
          <Button className="mt-5" onClick={() => guard("access", () => setUnlocked(true))}>
            Unlock timeline
          </Button>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Timeline"
      description="Every tracked event, newest first — grouped by day"
      actions={
        <Button
          size="sm"
          variant={onlyBookmarked ? "default" : "outline"}
          onClick={() => setOnlyBookmarked((v) => !v)}
        >
          <Bookmark className="size-4" /> Bookmarked
        </Button>
      }
    >
      {gate}
      <div className="panel mb-4 flex flex-wrap items-center gap-3 p-4">
        <Filter className="size-4 text-muted-foreground" />
        <Input
          placeholder="Search app, category or event…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Today</SelectItem>
            {RANGE_OPTIONS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={deviceId} onValueChange={setDeviceId}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All devices" />
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
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All events" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All event types</SelectItem>
            {types.map((t) => (
              <SelectItem key={t} value={t}>
                {eventLabel(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} events</span>
      </div>

      {events.isPending && <p className="text-sm text-muted-foreground">Loading your timeline…</p>}
      {!events.isPending && grouped.length === 0 && (
        <p className="panel p-6 text-sm text-muted-foreground">
          No events match these filters. Try widening the date range.
        </p>
      )}

      <div className="space-y-5">
        {grouped.map(([day, rows]) => (
          <section key={day} className="panel p-5">
            <header className="mb-3 flex flex-wrap items-center gap-3">
              <h2 className="text-sm font-semibold">{dayLabel(rows[0]!.started_at)}</h2>
              <span className="text-xs text-muted-foreground">
                {rows.length} events ·{" "}
                {minutesLabel(rows.reduce((s, e) => s + (e.duration_seconds || 0), 0))}
              </span>
            </header>
            <ol className="relative space-y-3 border-l border-border pl-4">
              {rows.map((e) => (
                <li key={e.event_id} className="relative">
                  <span className="absolute top-2 -left-[21px] size-2 rounded-full bg-primary" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {clockTime(e.started_at)}
                    </span>
                    <span className="text-sm">{eventLabel(e.event_type, e.application_name)}</span>
                    {e.duration_seconds > 0 && (
                      <Badge variant="secondary">{minutesLabel(e.duration_seconds)}</Badge>
                    )}
                    {e.productivity && (
                      <Badge
                        variant="outline"
                        className={cn(
                          e.productivity === "productive" && "text-success",
                          e.productivity === "distracting" && "text-destructive",
                        )}
                      >
                        {e.productivity}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {deviceNames.get(e.device_id ?? "") ?? "Unknown device"}
                    </span>
                    <div className="ml-auto flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => bookmark.mutate({ id: e.event_id, value: !e.bookmarked })}
                      >
                        <Bookmark
                          className={cn("size-4", e.bookmarked && "fill-primary text-primary")}
                        />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
