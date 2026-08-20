import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type Row = Record<string, unknown>;

export interface DatasetSpec {
  key: string;
  label: string;
  table: string;
  dateColumn?: string;
  hint: string;
}

export const DATASETS: DatasetSpec[] = [
  {
    key: "activity",
    label: "Activity timeline",
    table: "activity_events",
    dateColumn: "started_at",
    hint: "Every app-usage and device event with duration, category and tags.",
  },
  {
    key: "devices",
    label: "Devices",
    table: "devices",
    hint: "Registered devices and their status.",
  },
  {
    key: "authorizations",
    label: "Device authorization history",
    table: "device_authorizations",
    dateColumn: "created_at",
    hint: "Approvals, revocations and security decisions.",
  },
  {
    key: "sync",
    label: "Sync log",
    table: "sync_log",
    dateColumn: "created_at",
    hint: "Every synchronization attempt and its result.",
  },
  {
    key: "applications",
    label: "Application categories",
    table: "application_categories",
    hint: "Your app classification and productivity mapping.",
  },
  {
    key: "insights",
    label: "AI insights",
    table: "insights",
    dateColumn: "created_at",
    hint: "Generated observations.",
  },
  {
    key: "reports",
    label: "Reports",
    table: "reports",
    dateColumn: "created_at",
    hint: "Saved periodic reports.",
  },
  { key: "goals", label: "Goals", table: "user_goals", hint: "Screen-time and focus goals." },
  {
    key: "alerts",
    label: "Alert rules",
    table: "alert_rules",
    hint: "Usage thresholds that trigger alerts.",
  },
  {
    key: "notifications",
    label: "Notifications",
    table: "notifications",
    dateColumn: "created_at",
    hint: "Security and usage notifications.",
  },
  {
    key: "profile",
    label: "Profile & preferences",
    table: "profiles",
    hint: "Account identity, timezone and display settings.",
  },
  {
    key: "privacy",
    label: "Privacy settings",
    table: "privacy_settings",
    hint: "Your collection and retention choices.",
  },
];

function flatten(row: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = Array.isArray(v) ? v.join(" | ") : v && typeof v === "object" ? JSON.stringify(v) : v;
  }
  return out;
}

export async function fetchDatasets(
  keys: string[],
  range?: { from?: string | undefined; to?: string | undefined },
): Promise<Record<string, Row[]>> {
  const result: Record<string, Row[]> = {};
  for (const key of keys) {
    const spec = DATASETS.find((d) => d.key === key);
    if (!spec) continue;
    let query = db.from(spec.table).select("*");
    if (spec.dateColumn && range?.from)
      query = query.gte(spec.dateColumn, `${range.from}T00:00:00.000Z`);
    if (spec.dateColumn && range?.to)
      query = query.lte(spec.dateColumn, `${range.to}T23:59:59.999Z`);
    if (spec.dateColumn) query = query.order(spec.dateColumn, { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    result[spec.label] = ((data ?? []) as Row[]).map(flatten);
  }
  return result;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const stamp = () => new Date().toISOString().slice(0, 10);

function toCsv(rows: Row[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]!);
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [cols.join(","), ...rows.map((r) => cols.map((c) => escape(r[c])).join(","))].join("\n");
}

export async function exportExcel(sets: Record<string, Row[]>) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  for (const [label, rows] of Object.entries(sets)) {
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ note: "No records in range" }]);
    XLSX.utils.book_append_sheet(wb, ws, label.slice(0, 30));
  }
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  download(
    new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `digital-life-timeline-${stamp()}.xlsx`,
  );
}

export async function exportCsv(sets: Record<string, Row[]>) {
  const parts = Object.entries(sets).map(([label, rows]) => `# ${label}\n${toCsv(rows)}`);
  download(
    new Blob([parts.join("\n\n")], { type: "text/csv;charset=utf-8" }),
    `digital-life-timeline-${stamp()}.csv`,
  );
}

export function exportJson(sets: Record<string, Row[]>) {
  download(
    new Blob([JSON.stringify(sets, null, 2)], { type: "application/json" }),
    `digital-life-timeline-${stamp()}.json`,
  );
}

export async function exportPdf(
  sets: Record<string, Row[]>,
  meta: { email?: string | undefined; range: string },
) {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new JsPDF({ orientation: "landscape", unit: "pt" });
  doc.setFontSize(18);
  doc.text("Digital Life Timeline — data export", 40, 44);
  doc.setFontSize(10);
  doc.text(
    `Account: ${meta.email ?? "—"}    Range: ${meta.range}    Generated: ${new Date().toLocaleString()}`,
    40,
    62,
  );

  let cursor = 88;
  for (const [label, rows] of Object.entries(sets)) {
    doc.setFontSize(12);
    doc.text(`${label} (${rows.length})`, 40, cursor);
    const cols = rows.length
      ? Object.keys(rows[0]!)
          .filter((c) => c !== "user_id")
          .slice(0, 8)
      : ["note"];
    const body = rows.length
      ? rows.slice(0, 500).map((r) => cols.map((c) => String(r[c] ?? "").slice(0, 40)))
      : [["No records in range"]];
    autoTable(doc, {
      startY: cursor + 10,
      head: [cols],
      body,
      styles: { fontSize: 7, cellPadding: 3 },
      headStyles: { fillColor: [30, 41, 59] },
      margin: { left: 40, right: 40 },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cursor = ((doc as any).lastAutoTable?.finalY ?? cursor) + 34;
    if (cursor > 480) {
      doc.addPage();
      cursor = 60;
    }
  }
  doc.save(`digital-life-timeline-${stamp()}.pdf`);
}
