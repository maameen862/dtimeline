import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, FileText, Braces, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useParentalGate } from "@/components/parental-gate";
import {
  DATASETS,
  exportCsv,
  exportExcel,
  exportJson,
  exportPdf,
  fetchDatasets,
} from "@/lib/export";

export const Route = createFileRoute("/_authenticated/export")({
  head: () => ({
    meta: [
      { title: "Download your data — Digital Life Timeline" },
      {
        name: "description",
        content:
          "Select exactly which parts of your digital activity history to download as Excel, PDF, CSV or JSON — timeline, devices, insights, reports and settings.",
      },
      { property: "og:title", content: "Download your data — Digital Life Timeline" },
      {
        property: "og:description",
        content: "Pick datasets and a date range, then export to Excel, PDF, CSV or JSON.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExportPage,
});

const PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 12 months", days: 365 },
  { label: "Everything", days: 0 },
];

function ExportPage() {
  const { user } = useAuth();
  const { guard, gate, lock } = useParentalGate();
  const [selected, setSelected] = useState<string[]>(["activity", "devices"]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const allSelected = selected.length === DATASETS.length;
  const rangeLabel = useMemo(
    () => (from || to ? `${from || "start"} → ${to || "today"}` : "All time"),
    [from, to],
  );

  function toggle(key: string) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function applyPreset(days: number) {
    if (!days) {
      setFrom("");
      setTo("");
      return;
    }
    setFrom(new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10));
    setTo(new Date().toISOString().slice(0, 10));
  }

  function run(format: "xlsx" | "pdf" | "csv" | "json") {
    if (!selected.length) {
      toast.error("Select at least one dataset");
      return;
    }
    guard("export", async () => {
      setBusy(format);
      try {
        const sets = await fetchDatasets(selected, {
          from: from || undefined,
          to: to || undefined,
        });
        const total = Object.values(sets).reduce((n, rows) => n + rows.length, 0);
        if (format === "xlsx") await exportExcel(sets);
        if (format === "csv") await exportCsv(sets);
        if (format === "json") exportJson(sets);
        if (format === "pdf") await exportPdf(sets, { email: user?.email, range: rangeLabel });
        toast.success(`Exported ${total} record(s) across ${Object.keys(sets).length} dataset(s)`);
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setBusy(null);
      }
    });
  }

  return (
    <AppShell
      title="Download your data"
      description="Select what you need and export it in seconds"
      actions={
        lock?.enabled && lock.lock_export ? (
          <Badge variant="outline" className="gap-1">
            <Lock className="size-3" /> PIN protected
          </Badge>
        ) : null
      }
    >
      {gate}
      <section className="panel p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="flex-1 text-sm font-semibold">Choose information</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelected(allSelected ? [] : DATASETS.map((d) => d.key))}
          >
            {allSelected ? "Clear all" : "Select everything"}
          </Button>
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {DATASETS.map((d) => {
            const active = selected.includes(d.key);
            return (
              <li key={d.key}>
                <label
                  className={`flex h-full cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all duration-200 hover:border-primary/50 hover:bg-secondary/40 ${
                    active ? "border-primary/60 bg-primary/5" : "border-border"
                  }`}
                >
                  <Checkbox
                    checked={active}
                    onCheckedChange={() => toggle(d.key)}
                    className="mt-0.5"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{d.label}</span>
                    <span className="block text-xs text-muted-foreground">{d.hint}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel mt-4 p-5">
        <h2 className="text-sm font-semibold">Date range</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button key={p.label} size="sm" variant="secondary" onClick={() => applyPreset(p.days)}>
              {p.label}
            </Button>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="from">From</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to">To</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Range applies to time-based datasets only. Current selection: {rangeLabel}.
        </p>
      </section>

      <section className="panel mt-4 p-5">
        <h2 className="text-sm font-semibold">Export format</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {selected.length} dataset(s) selected. Exports are generated on this device from your
          cloud data — nothing is sent anywhere else.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => run("xlsx")} disabled={Boolean(busy)}>
            {busy === "xlsx" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="size-4" />
            )}
            Excel (.xlsx)
          </Button>
          <Button variant="secondary" onClick={() => run("pdf")} disabled={Boolean(busy)}>
            {busy === "pdf" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileText className="size-4" />
            )}
            PDF report
          </Button>
          <Button variant="outline" onClick={() => run("csv")} disabled={Boolean(busy)}>
            {busy === "csv" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            CSV
          </Button>
          <Button variant="ghost" onClick={() => run("json")} disabled={Boolean(busy)}>
            {busy === "json" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Braces className="size-4" />
            )}
            JSON archive
          </Button>
        </div>
      </section>
    </AppShell>
  );
}
