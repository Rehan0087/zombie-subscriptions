import type { Detection, IsoDate, Minor, Verdict, Zombie } from "../core";

/** Verdicts keyed by zombie id (merchant key, cadence and plan), so they carry over between statements. */
export type VerdictMap = Readonly<Record<string, Verdict>>;

export interface Graveyard {
  /** Active, undecided, confident. */
  feeding: Zombie[];
  /** Active, undecided, low confidence. */
  maybe: Zombie[];
  /** Undecided and no longer charging. */
  dormant: Zombie[];
  /** Killed and haven't charged since. */
  killed: Zombie[];
  /** Killed but charged again after the kill (requirement 5.5). */
  resurrected: Zombie[];
  spared: Zombie[];
  /** Yearly cost of killed, non-resurrected zombies, as it was when each was killed (requirement 5.6). */
  soulsSaved: Minor;
  /** Yearly cost of feeding and resurrected zombies. "Maybe" zombies are not counted until confirmed. */
  stillFeeding: Minor;
}

export function kill(verdicts: VerdictMap, zombie: Zombie, today: IsoDate): VerdictMap {
  return { ...verdicts, [zombie.id]: { kind: "kill", at: today, yearlyCost: zombie.yearlyCost } };
}

export function spare(verdicts: VerdictMap, zombie: Zombie, today: IsoDate): VerdictMap {
  return { ...verdicts, [zombie.id]: { kind: "spare", at: today, yearlyCost: zombie.yearlyCost } };
}

/** Sorts every detected zombie into its place in the graveyard (requirement 5). */
export function applyVerdicts(detection: Detection, verdicts: VerdictMap): Graveyard {
  const g: Graveyard = { feeding: [], maybe: [], dormant: [], killed: [], resurrected: [], spared: [], soulsSaved: 0, stillFeeding: 0 };
  const confident = new Set(detection.zombies.map((z) => z.id));
  for (const z of [...detection.zombies, ...detection.maybeZombies]) {
    const v = verdicts[z.id];
    if (v?.kind === "spare") g.spared.push(z);
    else if (v?.kind === "kill") {
      if (z.lastCharge > v.at) g.resurrected.push(z);
      else {
        g.killed.push(z);
        g.soulsSaved += v.yearlyCost;
      }
    } else if (z.dormant) g.dormant.push(z);
    else if (confident.has(z.id)) g.feeding.push(z);
    else g.maybe.push(z);
  }
  g.stillFeeding = [...g.feeding, ...g.resurrected].reduce((sum, z) => sum + z.yearlyCost, 0);
  return g;
}
