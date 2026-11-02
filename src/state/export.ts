import type { Zombie } from "../core";
import type { Graveyard, VerdictMap } from "./verdicts";

const cell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** "Cancel these" checklist as CSV (graveyard-ui requirement 6.3). Amounts in major units. */
export function checklistCsv(g: Graveyard, verdicts: VerdictMap): string {
  const rows: (string | number)[][] = [["Subscription", "Cadence", "Current amount", "Yearly cost", "Verdict", "Decided on", "Note"]];
  const add = (z: Zombie, note: string) => {
    const v = verdicts[z.id];
    rows.push([z.displayName, z.cadence, (z.currentAmount / 100).toFixed(2), ((v?.yearlyCost ?? z.yearlyCost) / 100).toFixed(2), v?.kind ?? "", v?.at ?? "", note]);
  };
  g.resurrected.forEach((z) => add(z, "Charged again after you killed it: check the cancellation"));
  g.killed.forEach((z) => add(z, "Cancel this"));
  g.spared.forEach((z) => add(z, "Keeping"));
  return rows.map((r) => r.map(cell).join(",")).join("\n") + "\n";
}

/** Saves text as a file without any network request. */
export function downloadText(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
