import type { CSSProperties } from "react";
import type { Zombie } from "../../core";
import { CADENCE_WORDS, formatMoney, plural } from "../format";
import { cracks, hasHike } from "./encoding";

/** Crack paths, drawn in order: more months feeding, more cracks. */
const CRACKS = [
  "M30 38 l8 14 l-5 10 l9 12",
  "M168 60 l-10 12 l6 9 l-8 14",
  "M14 128 l10 10 l-4 12 l12 14",
  "M186 100 l-8 12 l6 10 l-6 16",
];

interface Props {
  zombie: Zombie;
  weight: number;
  months: number;
  index: number;
  currency: string;
  resurrected?: boolean;
  onOpen: () => void;
}

export function ZombieCard({ zombie, weight, months, index, currency, resurrected, onOpen }: Props) {
  const hike = hasHike(zombie);
  const yearly = formatMoney(zombie.yearlyCost, currency);
  const amount = formatMoney(zombie.currentAmount, currency);
  const words = CADENCE_WORDS[zombie.cadence];
  const label =
    `${zombie.displayName}, ${amount} per ${words.per}, ${yearly} per year, feeding for ${plural(months, "month")}.` +
    (hike ? " Price went up." : "") +
    (resurrected ? " It came back after you killed it." : "") +
    " Open to kill or spare.";

  return (
    <li className="grave" style={{ "--weight": weight, "--i": index } as CSSProperties}>
      <button type="button" className="zombie" data-hike={hike} aria-label={label} onClick={onOpen}>
        {resurrected && <span className="badge badge-back">It came back!</span>}
        <span className="eyes" aria-hidden="true">
          <i />
          <i />
        </span>
        <svg className="cracks" viewBox="0 0 200 200" preserveAspectRatio="none" aria-hidden="true">
          {CRACKS.slice(0, cracks(months)).map((d) => (
            <path key={d} d={d} />
          ))}
        </svg>
        <span className="tomb-name">{zombie.displayName}</span>
        <span className="tomb-yearly num">
          {yearly}
          <span className="visually-hidden"> per year</span>
          <span aria-hidden="true">/yr</span>
        </span>
        <span className="tomb-meta num">
          {amount} {words.adjective.toLowerCase()} · {plural(months, "month")}
        </span>
        {hike && <span className="badge badge-hike">Grew stronger</span>}
      </button>
    </li>
  );
}
