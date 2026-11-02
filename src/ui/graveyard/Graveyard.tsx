import type { Zombie } from "../../core";
import type { Graveyard as GraveyardModel, VerdictMap } from "../../state/verdicts";
import { useCountUp } from "../effects/motion";
import { CADENCE_WORDS, formatDate, formatMoney, formatShortMonth, plural } from "../format";
import { monthsFeeding, weights } from "./encoding";
import { ZombieCard } from "./ZombieCard";

interface Props {
  graveyard: GraveyardModel;
  verdicts: VerdictMap;
  referenceDate: string;
  statementName: string;
  transactionCount: number;
  skipped: number;
  currency: string;
  onOpen: (id: string) => void;
}

function Figure({ label, value, currency, kind }: { label: string; value: number; currency: string; kind: "feeding" | "saved" }) {
  const shown = useCountUp(value);
  return (
    <div className={`ledger-figure ledger-${kind}`}>
      <span className="label">{label}</span>
      <span className="value num" aria-live="polite">
        {formatMoney(shown, currency)}
        <small>a year</small>
      </span>
    </div>
  );
}

function LedgerRow({ z, currency, note, onOpen }: { z: Zombie; currency: string; note: string; onOpen: () => void }) {
  return (
    <li>
      <button type="button" onClick={onOpen}>
        <span>
          <b>{z.displayName}</b> <span className="dim">· {CADENCE_WORDS[z.cadence].adjective.toLowerCase()}</span>
        </span>
        <span className="mono num">{formatMoney(z.currentAmount, currency)}</span>
        <span className="mono dim">{note}</span>
      </button>
    </li>
  );
}

/** The main screen (graveyard-ui requirement 3). */
export function Graveyard({ graveyard: g, verdicts, referenceDate, statementName, transactionCount, skipped, currency, onOpen }: Props) {
  const field = [...g.resurrected, ...g.feeding];
  const w = weights(field);
  const money = (m: number) => formatMoney(m, currency);
  const total = g.soulsSaved + g.stillFeeding;
  const share = total > 0 ? Math.round((g.soulsSaved / total) * 100) : 0;

  return (
    <main>
      <section className="ledger" aria-label="Totals">
        <Figure kind="feeding" label="Still feeding" value={g.stillFeeding} currency={currency} />
        <Figure kind="saved" label="Saved by burying" value={g.soulsSaved} currency={currency} />
        <div className="meter">
          <div className="meter-track" role="img" aria-label={`${share}% of recurring costs buried`}>
            <div className="meter-fill" style={{ width: `${share}%` }} />
          </div>
          <p>
            {share === 0 ? "Nothing buried yet. Open a headstone to decide." : `${share}% of the recurring cost found here is buried.`}
          </p>
        </div>
      </section>
      <p className="statement-line">
        {statementName} · {plural(transactionCount, "transaction")} · up to {formatDate(referenceDate)}
        {skipped > 0 && ` · ${plural(skipped, "row")} skipped`}
      </p>

      <div className="section-head">
        <h2>
          Still feeding<span className="count">{field.length}</span>
        </h2>
        <p>Largest yearly cost first. Bigger stones cost more.</p>
      </div>
      {field.length === 0 ? (
        <p className="empty">
          {g.killed.length + g.spared.length > 0
            ? "Every subscription has a verdict. Export the checklist below to cancel the buried ones."
            : "No recurring charges in this statement. Try a longer date range from your bank."}
        </p>
      ) : (
        <ul className="field">
          {field.map((z, i) => (
            <ZombieCard
              key={z.id}
              zombie={z}
              index={i}
              weight={w.get(z.id) ?? 0}
              months={monthsFeeding(z, referenceDate)}
              currency={currency}
              resurrected={g.resurrected.includes(z)}
              onOpen={() => onOpen(z.id)}
            />
          ))}
        </ul>
      )}

      {g.killed.length > 0 && (
        <>
          <div className="section-head">
            <h2>
              Laid to rest<span className="count">{g.killed.length}</span>
            </h2>
            <p className="num">{money(g.soulsSaved)} a year saved once cancelled</p>
          </div>
          <ul className="row">
            {g.killed.map((z) => {
              const v = verdicts[z.id]!;
              return (
                <li key={z.id}>
                  <button type="button" className="resting" onClick={() => onOpen(z.id)} aria-label={`${z.displayName}, buried on ${formatDate(v.at)}, saves ${money(v.yearlyCost)} a year`}>
                    <span className="epitaph-kicker carved">Here lies</span>
                    <span className="tomb-name carved">{z.displayName}</span>
                    <span className="tomb-dates carved num">
                      {formatShortMonth(z.firstCharge)} — {formatShortMonth(v.at)}
                    </span>
                    <span className="saved num">+{money(v.yearlyCost)} a year</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {g.spared.length > 0 && (
        <>
          <div className="section-head">
            <h2>
              Spared<span className="count">{g.spared.length}</span>
            </h2>
            <p>Subscriptions you still use. They stay out of the total.</p>
          </div>
          <ul className="row">
            {g.spared.map((z) => (
              <li key={z.id}>
                <button type="button" className="ghost" onClick={() => onOpen(z.id)}>
                  <span className="tomb-name">{z.displayName}</span>
                  <span className="mono num">{money(z.yearlyCost)} a year</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {g.maybe.length > 0 && (
        <details className="ledger-more">
          <summary>
            <h3>Maybe zombies</h3>
            <span className="dim">{plural(g.maybe.length, "subscription")} with irregular charges. Not in the total until you decide.</span>
          </summary>
          <ul className="ledger-rows">
            {g.maybe.map((z) => (
              <LedgerRow key={z.id} z={z} currency={currency} note={`${money(z.yearlyCost)} a year`} onOpen={() => onOpen(z.id)} />
            ))}
          </ul>
        </details>
      )}

      {g.dormant.length > 0 && (
        <details className="ledger-more">
          <summary>
            <h3>Dormant</h3>
            <span className="dim">{plural(g.dormant.length, "subscription")} that stopped charging. Not in the total.</span>
          </summary>
          <ul className="ledger-rows">
            {g.dormant.map((z) => (
              <LedgerRow key={z.id} z={z} currency={currency} note={`last ${formatDate(z.lastCharge)}`} onOpen={() => onOpen(z.id)} />
            ))}
          </ul>
        </details>
      )}
    </main>
  );
}
