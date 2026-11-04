// Excel (CSV) and PDF exports of the View History page. Client-side only: the PDF library is loaded when asked for.

import { snapshotChanges, type BalanceSnapshot, type SnapshotChange } from "@/lib/admin/apiBalance";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** One snapshot with what moved since the one before it (the next, older, entry in the list). */
export type HistoryRow = { snapshot: BalanceSnapshot; diffMoved: number | null; changes: SnapshotChange[] };

export function historyRows(snapshots: BalanceSnapshot[]): HistoryRow[] {
  return snapshots.map((snapshot, i) => {
    const older = snapshots[i + 1];
    const diffMoved = older && snapshot.diff !== null && older.diff !== null ? round2(snapshot.diff - older.diff) : null;
    return { snapshot, diffMoved, changes: older ? snapshotChanges(snapshot, older) : [] };
  });
}

/** "2026-11-04T10:25:04.47" → "2026-11-04 10:25:04" (the vendor's India wall-clock time, as written). */
const stamp = (at: string) => at.slice(0, 19).replace("T", " ");

const plain = (n: number) => n.toFixed(2);
const signedPlain = (n: number) => `${n > 0 ? "+" : "-"}${Math.abs(n).toFixed(2)}`;
const movedText = (changes: SnapshotChange[]) => changes.map((c) => `${c.label} ${signedPlain(c.delta)}`).join("; ");

const csvCell = (value: string) => (/[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

/**
 * The history as CSV that Excel opens correctly (the caller adds the UTF-8 byte order mark): one row per
 * snapshot, plain numbers Excel can sum or chart — the difference, how much it moved, the API wallet and one
 * column per balance — then a text column saying what moved.
 */
export function toHistoryCsv(snapshots: BalanceSnapshot[], oldestFirst = false): string {
  const rows = historyRows(snapshots);
  const accounts: { key: string; label: string }[] = [];
  for (const { snapshot } of rows) {
    for (const a of snapshot.accounts) if (!accounts.some((x) => x.key === a.key)) accounts.push({ key: a.key, label: a.label });
  }
  const header = ["Snapshot ID", "Date & time", "Difference", "Change since previous", "API wallet", ...accounts.map((a) => a.label), "What moved"];
  const lines = (oldestFirst ? [...rows].reverse() : rows).map(({ snapshot, diffMoved, changes }) => {
    const byKey = new Map(snapshot.accounts.map((a) => [a.key, a.amount]));
    return [
      String(snapshot.id),
      stamp(snapshot.at),
      snapshot.diff !== null ? plain(snapshot.diff) : "",
      diffMoved !== null ? plain(diffMoved) : "",
      plain(snapshot.wallet),
      ...accounts.map((a) => (byKey.has(a.key) ? plain(byKey.get(a.key) as number) : "")),
      movedText(changes),
    ];
  });
  return [header, ...lines].map((line) => line.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

/** Indian grouping without the ₹ sign (the PDF's standard font has no rupee glyph): "-15,42,289.57". */
const rupees = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const signedRupees = (n: number) => `${n > 0 ? "+" : "-"}${rupees(Math.abs(n))}`;

/** Downloads the history as a landscape A4 PDF table. */
export async function downloadHistoryPdf(snapshots: BalanceSnapshot[], range: { from: string; to: string }, fileName: string, oldestFirst = false) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("Difference history", 40, 40);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90);
  doc.text(`NammaAPI - saved balance snapshots from ${range.from} to ${range.to} (${oldestFirst ? "oldest" : "newest"} first, ${snapshots.length} shown). Amounts in Rs.`, 40, 56);

  const rows = historyRows(snapshots);
  autoTable(doc, {
    startY: 70,
    head: [["Time", "Difference", "Change", "What moved since the snapshot before"]],
    body: (oldestFirst ? [...rows].reverse() : rows).map(({ snapshot, diffMoved, changes }) => [
      stamp(snapshot.at),
      snapshot.diff !== null ? rupees(snapshot.diff) : "-",
      diffMoved ? signedRupees(diffMoved) : "none",
      changes.length > 0 ? changes.map((c) => `${c.label} ${signedRupees(c.delta)}`).join(",  ") : "No balance moved",
    ]),
    styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak", valign: "middle" },
    headStyles: { fillColor: [10, 38, 71], textColor: 255 },
    alternateRowStyles: { fillColor: [239, 248, 252] },
    columnStyles: { 0: { cellWidth: 95 }, 1: { cellWidth: 90, halign: "right" }, 2: { cellWidth: 75, halign: "right" } },
    margin: { left: 40, right: 40, bottom: 36 },
    didDrawPage: () => {
      const page = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(`Page ${page}`, doc.internal.pageSize.getWidth() - 40, doc.internal.pageSize.getHeight() - 20, { align: "right" });
    },
  });
  doc.save(fileName);
}
