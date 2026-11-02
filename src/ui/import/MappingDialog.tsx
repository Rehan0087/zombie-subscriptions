import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { analyzeStatement, type ColumnMapping, type DateFormat, type ImportResult } from "../../core";

interface Props {
  /** The statement text, to check the chosen columns before submitting. */
  text: string;
  result: ImportResult;
  onSubmit: (mapping: ColumnMapping, dateFormat: DateFormat | undefined) => void;
  onCancel: () => void;
}

type AmountMode = "single" | "split";

/** Lets the user fix columns or day/month order when the engine can't tell (graveyard-ui requirement 2). */
export function MappingDialog({ text, result, onSubmit, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [mapping, setMapping] = useState<ColumnMapping>(result.mapping);
  const [mode, setMode] = useState<AmountMode>(result.mapping.debit || result.mapping.credit ? "split" : "single");
  const [order, setOrder] = useState<"dmy" | "mdy">("dmy");

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const label = (h: string) => {
    const examples = result.samples[h] ?? [];
    return examples.length ? `${h} (e.g. ${examples.join(", ")})` : h;
  };

  const select = (role: keyof ColumnMapping, text: string, optional = false) => (
    <div className="field-row">
      <label htmlFor={`map-${role}`}>{text}</label>
      <select
        id={`map-${role}`}
        value={mapping[role] ?? ""}
        required={!optional}
        onChange={(e) => setMapping({ ...mapping, [role]: e.target.value || undefined })}
      >
        <option value="">{optional ? "None" : "Choose a column…"}</option>
        {result.headers.map((h) => (
          <option key={h} value={h}>
            {label(h)}
          </option>
        ))}
      </select>
    </div>
  );

  const chosen: ColumnMapping =
    mode === "single"
      ? { date: mapping.date, description: mapping.description, amount: mapping.amount, type: mapping.type }
      : { date: mapping.date, description: mapping.description, debit: mapping.debit, credit: mapping.credit };
  // Re-check with the columns picked so far, so the date-order question appears in this same step.
  const needsOrder = useMemo(
    () => result.needs.includes("dayMonthOrder") || (!!chosen.date && analyzeStatement(text, { mapping: chosen }).import.needs.includes("dayMonthOrder")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [text, result, chosen.date, chosen.description, chosen.amount, chosen.debit, chosen.credit, chosen.type],
  );

  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit(chosen, needsOrder ? order : result.dateFormat);
  }

  const missingAmount = mode === "single" ? !mapping.amount : !mapping.debit && !mapping.credit;

  return (
    <dialog ref={ref} aria-labelledby="map-title" onCancel={onCancel}>
      <form className="dialog-body" onSubmit={submit}>
        <h2 id="map-title">Help us read this statement</h2>
        <p className="hint">
          {needsOrder && result.needs.length === 1
            ? "Every date in this file could be read two ways. Which order does your bank use?"
            : "We couldn't find every column we need. Pick them below. We'll remember your choice for this bank."}
        </p>

        {select("date", "Date column")}
        {select("description", "Description column")}

        <fieldset>
          <legend>How are amounts shown?</legend>
          <label className="radio">
            <input type="radio" name="mode" checked={mode === "single"} onChange={() => setMode("single")} /> One amount
            column (spending is negative, or marked DR/CR)
          </label>
          <label className="radio">
            <input type="radio" name="mode" checked={mode === "split"} onChange={() => setMode("split")} /> Separate
            withdrawal and deposit columns
          </label>
          {mode === "single" ? (
            <>
              {select("amount", "Amount column")}
              {select("type", "DR/CR column", true)}
            </>
          ) : (
            <>
              {select("debit", "Withdrawal (money out) column", true)}
              {select("credit", "Deposit (money in) column", true)}
            </>
          )}
        </fieldset>

        {needsOrder && (
          <fieldset>
            <legend>Date order</legend>
            <label className="radio">
              <input type="radio" name="order" checked={order === "dmy"} onChange={() => setOrder("dmy")} /> Day first
              (14/03/2026)
            </label>
            <label className="radio">
              <input type="radio" name="order" checked={order === "mdy"} onChange={() => setOrder("mdy")} /> Month first
              (03/14/2026)
            </label>
          </fieldset>
        )}

        <div className="dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!mapping.date || !mapping.description || missingAmount}>
            Summon the zombies
          </button>
        </div>
      </form>
    </dialog>
  );
}
