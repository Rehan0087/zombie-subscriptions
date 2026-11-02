import type { CSSProperties } from "react";
import type { Zombie } from "../../core";
import { CADENCE_WORDS, formatMoney, formatShortMonth, plural } from "../format";
import { cracks, hasHike } from "./encoding";

/** Hairline cracks near the stone's edges, drawn in order: more months feeding, more cracks. */
const CRACKS = [
  "M10 82 l7 11 l-3 9 l6 12",
  "M190 104 l-6 10 l4 8 l-5 12",
  "M7 168 l7 8 l-2 10 l6 12",
  "M193 182 l-5 10 l4 9 l-4 13",
];

interface Props {
  zombie: Zombie;
  weight: number;
  months: number;
  index: number;
  currency: string;
  resurrected?: boolean;
  /** Without it the stone is a static illustration (the landing page hero). */
  onOpen?: () => void;
}

/**
 * A headstone inscribed like an epitaph. The dates stay open ("Sep 2025 —") because the
 * subscription is still charging; burying it is what closes them.
 */
export function ZombieCard({ zombie, weight, months, index, currency, resurrected, onOpen }: Props) {
  const hike = hasHike(zombie);
  const yearly = formatMoney(zombie.yearlyCost, currency);
  const amount = formatMoney(zombie.currentAmount, currency);
  const words = CADENCE_WORDS[zombie.cadence];
  const label =
    `${zombie.displayName}: ${amount} per ${words.per}, ${yearly} a year, charging for ${plural(months, "month")}.` +
    (hike && zombie.priceChange ? ` Price rose from ${formatMoney(zombie.priceChange.from, currency)}.` : "") +
    (resurrected ? " Charged again after you buried it." : "") +
    " Open to bury or spare.";

  const inscription = (
    <>
      {resurrected && <span className="tomb-back">Charged again</span>}
      <span className="eyes" aria-hidden="true">
        <i />
        <i />
      </span>
      <svg className="cracks" viewBox="0 0 200 240" preserveAspectRatio="none" aria-hidden="true">
        {CRACKS.slice(0, cracks(months)).map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
      <span className="epitaph-kicker carved" aria-hidden="true">
        {resurrected ? "Risen again" : "Here lurks"}
      </span>
      <span className="tomb-name carved">{zombie.displayName}</span>
      <span className="tomb-dates carved num">{formatShortMonth(zombie.firstCharge)} —</span>
      <span className="tomb-rule" aria-hidden="true" />
      <span className="tomb-yearly carved num">
        {yearly}
        <small>a year</small>
      </span>
      <span className="tomb-meta carved num">
        {amount} {words.adjective.toLowerCase()} · {plural(months, "month")}
      </span>
      {hike && zombie.priceChange && (
        <span className="tomb-hike num">
          Rose {formatMoney(zombie.priceChange.from, currency)} → {formatMoney(zombie.priceChange.to, currency)}
        </span>
      )}
    </>
  );

  const style = { "--weight": weight, "--i": index } as CSSProperties;
  if (!onOpen) {
    return (
      <div className="headstone" data-hike={hike} style={style} role="img" aria-label={label}>
        {inscription}
      </div>
    );
  }
  return (
    <li className="plot" style={style}>
      <button type="button" className="headstone" data-hike={hike} aria-label={label} onClick={onOpen}>
        {inscription}
      </button>
    </li>
  );
}
