import type { Zombie } from "../../core";
import type { Graveyard as GraveyardModel, VerdictMap } from "../../state/verdicts";
import { useCountUp } from "../effects/motion";
import { CADENCE_WORDS, formatDate, formatMoney, plural } from "../format";
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

function Tally({ label, value, currency, kind }: { label: string; value: number; currency: string; kind: "feeding" | "saved" }) {
  const shown = useCountUp(value);
  return (
    <div className={`tally-box tally-${kind}`}>
      <div className="label">{label}</div>
      <div className="value num" aria-live="polite">
        {formatMoney(shown, currency)}
        <span style={{ fontSize: "0.5em", fontWeight: 600 }}>/yr</span>
      </div>
    </div>
  );
}

function ListRow({ z, currency, note, onOpen }: { z: Zombie; currency: string; note: string; onOpen: () => void }) {
  return (
    <li>
      <button type="button" onClick={onOpen}>
        <span>
          <b>{z.displayName}</b> <span className="dim">· {CADENCE_WORDS[z.cadence].adjective}</span>
        </span>
        <span className="dim num">
          {formatMoney(z.currentAmount, currency)} · {note}
        </span>
      </button>
    </li>
  );
}

/** The main screen (graveyard-ui requirement 3). */
export function Graveyard({ graveyard: g, verdicts, referenceDate, statementName, transactionCount, skipped, currency, onOpen }: Props) {
  const field = [...g.resurrected, ...g.feeding];
  const w = weights(field);
  const money = (m: number) => formatMoney(m, currency);

  return (
    <main>
      <section className="tally" aria-label="Totals">
        <Tally kind="feeding" label="Still feeding on you" value={g.stillFeeding} currency={currency} />
        <Tally kind="saved" label="Souls saved" value={g.soulsSaved} currency={currency} />
      </section>
      <p className="statement-line">
        {statementName}: {plural(transactionCount, "transaction")} up to {formatDate(referenceDate)}
        {skipped > 0 && ` · ${plural(skipped, "row")} skipped`}
      </p>

      <h2 className="section-title">
        The risen <small>{plural(field.length, "zombie")}, costliest first</small>
      </h2>
      {field.length === 0 ? (
        <p className="empty">
          {g.killed.length + g.spared.length > 0
            ? "The graveyard is quiet. Every zombie has been judged."
            : "No recurring charges found. Your money is safe… for now."}
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
          <h2 className="section-title">
            Buried <small>{money(g.soulsSaved)}/yr saved</small>
          </h2>
          <ul className="row">
            {g.killed.map((z) => (
              <li key={z.id}>
                <button type="button" className="buried" onClick={() => onOpen(z.id)} aria-label={`${z.displayName}, killed on ${formatDate(verdicts[z.id]!.at)}`}>
                  <span className="rip" aria-hidden="true">
                    R.I.P.
                  </span>
                  <b>{z.displayName}</b>
                  <span className="tomb-yearly num">+{money(verdicts[z.id]!.yearlyCost)}/yr</span>
                  <span className="tomb-meta">{formatDate(verdicts[z.id]!.at)}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {g.spared.length > 0 && (
        <>
          <h2 className="section-title">
            Spared <small>friendly ghosts you still use</small>
          </h2>
          <ul className="row">
            {g.spared.map((z) => (
              <li key={z.id}>
                <button type="button" className="ghost" onClick={() => onOpen(z.id)}>
                  <b>{z.displayName}</b>
                  <span className="tomb-yearly num">{money(z.yearlyCost)}/yr</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {g.maybe.length > 0 && (
        <details className="more">
          <summary>
            Maybe zombies <small>({g.maybe.length}): irregular charges that might be subscriptions</small>
          </summary>
          <ul className="plain-list">
            {g.maybe.map((z) => (
              <ListRow key={z.id} z={z} currency={currency} note={`${money(z.yearlyCost)}/yr if it is`} onOpen={() => onOpen(z.id)} />
            ))}
          </ul>
        </details>
      )}

      {g.dormant.length > 0 && (
        <details className="more">
          <summary>
            Dormant <small>({g.dormant.length}): stopped charging, not counted</small>
          </summary>
          <ul className="plain-list">
            {g.dormant.map((z) => (
              <ListRow key={z.id} z={z} currency={currency} note={`last charged ${formatDate(z.lastCharge)}`} onOpen={() => onOpen(z.id)} />
            ))}
          </ul>
        </details>
      )}
    </main>
  );
}
