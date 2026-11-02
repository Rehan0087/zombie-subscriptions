import { useEffect, useRef, useState } from "react";
import { costBreakdown, type Verdict, type Zombie } from "../../core";
import { CADENCE_WORDS, formatDate, formatMoney, formatMonth, plural } from "../format";
import { hasHike, monthsFeeding } from "./encoding";
import { Timeline } from "./Timeline";

export type ZombieStatus = "feeding" | "maybe" | "dormant" | "killed" | "resurrected" | "spared";

interface Props {
  zombie: Zombie;
  status: ZombieStatus;
  verdict?: Verdict;
  referenceDate: string;
  currency: string;
  /** Other merchants this one could be merged into. */
  mergeTargets: { key: string; name: string }[];
  isSplit: boolean;
  onKill: () => void;
  onSpare: () => void;
  onRevive: () => void;
  onMerge: (intoKey: string) => void;
  onToggleSplit: () => void;
  onClose: () => void;
}

/** Everything about one zombie, and the verdict buttons (graveyard-ui requirement 4). */
export function ZombieSheet(props: Props) {
  const { zombie: z, status, verdict, currency, referenceDate } = props;
  const ref = useRef<HTMLDialogElement>(null);
  const [mergeInto, setMergeInto] = useState("");
  const money = (m: number) => formatMoney(m, currency);
  const words = CADENCE_WORDS[z.cadence];
  const months = monthsFeeding(z, referenceDate);
  const breakdown = costBreakdown(z);
  const hike = hasHike(z);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const lede = z.dormant
    ? `This one went quiet. No charge since ${formatDate(z.lastCharge)}.`
    : `This one's been feeding for ${plural(months, "month")}. ${money(z.totalPaid)} so far.`;

  return (
    <dialog ref={ref} className="sheet" aria-labelledby="sheet-title" onCancel={props.onClose} onClose={props.onClose}>
      <div className="dialog-body">
        <button type="button" className="btn btn-ghost btn-small sheet-close" onClick={props.onClose}>
          Close
        </button>
        <div>
          <h2 id="sheet-title" className="brand" style={{ fontSize: "2rem" }}>
            {z.displayName}
          </h2>
          <p className="hint">
            {words.adjective} · {plural(z.charges.length, "charge")}
            {status === "maybe" && " · Maybe a zombie: the charges are a little irregular"}
          </p>
        </div>

        {status === "resurrected" && verdict && (
          <p className="warn" role="status">
            It came back! You killed this on {formatDate(verdict.at)}, but it charged you again on {formatDate(z.lastCharge)}.
            Check that the cancellation went through.
          </p>
        )}

        <p className="lede">{lede}</p>
        {hike && z.priceChange && (
          <p className="warn">
            It grew stronger: {money(z.priceChange.from)} → {money(z.priceChange.to)} in {formatMonth(z.priceChange.on)}.
          </p>
        )}

        <Timeline zombie={z} currency={currency} />

        <dl className="facts num">
          <dt>Current charge</dt>
          <dd>
            {money(z.currentAmount)} per {words.per}
          </dd>
          <dt>First charge</dt>
          <dd>{formatDate(z.firstCharge)}</dd>
          <dt>Latest charge</dt>
          <dd>{formatDate(z.lastCharge)}</dd>
          <dt>Total paid</dt>
          <dd>{money(z.totalPaid)}</dd>
          <dt>Yearly cost</dt>
          <dd>{money(z.yearlyCost)}</dd>
        </dl>
        <p className="math num">
          {breakdown.dormant
            ? `No charge within 1.5 ${words.per}s of ${formatDate(referenceDate)}, so it counts as ${money(0)} a year.`
            : `${money(breakdown.amount)} × ${breakdown.perYear} charges/yr = ${money(breakdown.yearly)}`}
        </p>

        <div className="dialog-actions" style={{ justifyContent: "flex-start" }}>
          {status === "killed" || status === "spared" ? (
            <button type="button" className="btn" onClick={props.onRevive}>
              {status === "killed" ? "Dig it back up" : "Stop sparing it"}
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-kill" onClick={props.onKill}>
                {status === "resurrected" ? "Kill it again" : "Kill it — I'm cancelling"}
              </button>
              <button type="button" className="btn" onClick={props.onSpare}>
                Spare it — I still use it
              </button>
            </>
          )}
        </div>

        <details>
          <summary>Wrong grouping?</summary>
          <div className="dialog-body" style={{ padding: "12px 0 0" }}>
            {props.mergeTargets.length > 0 && (
              <div className="field-row">
                <label htmlFor="merge">These charges are the same subscription as…</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <select id="merge" value={mergeInto} onChange={(e) => setMergeInto(e.target.value)}>
                    <option value="">Choose…</option>
                    {props.mergeTargets.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="btn btn-small" disabled={!mergeInto} onClick={() => props.onMerge(mergeInto)}>
                    Merge
                  </button>
                </div>
              </div>
            )}
            <button type="button" className="btn btn-small" onClick={props.onToggleSplit}>
              {props.isSplit ? "Treat as one plan again" : "These are different plans: split by price"}
            </button>
          </div>
        </details>
      </div>
    </dialog>
  );
}
