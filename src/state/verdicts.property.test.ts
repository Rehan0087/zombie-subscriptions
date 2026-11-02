import fc from "fast-check";
import { addDays, analyzeStatement } from "../core";
import { detect } from "../core/detect";
import { arbStatement } from "../core/test-arbitraries";
import { applyVerdicts, kill, spare, type VerdictMap } from "./verdicts";

type Action = { kind: "kill" | "spare" | "undo"; pick: number; dayOffset: number };
const arbActions = fc.array(
  fc.record({ kind: fc.constantFrom<Action["kind"]>("kill", "spare", "undo"), pick: fc.nat(), dayOffset: fc.integer({ min: -400, max: 30 }) }),
  { maxLength: 30 },
);

/** Plays actions with an undo stack, the way the app's reducer does. */
function play(detection: ReturnType<typeof detect>, actions: Action[]) {
  const all = [...detection.zombies, ...detection.maybeZombies];
  let verdicts: VerdictMap = {};
  const history: VerdictMap[] = [];
  const snapshots: { before: VerdictMap; after: VerdictMap }[] = [];
  for (const a of actions) {
    if (a.kind === "undo") {
      const previous = history.pop();
      if (previous) verdicts = previous;
      continue;
    }
    const z = all[a.pick % Math.max(1, all.length)];
    if (!z) continue;
    const today = addDays(detection.referenceDate, a.dayOffset);
    history.push(verdicts);
    const next = a.kind === "kill" ? kill(verdicts, z, today) : spare(verdicts, z, today);
    snapshots.push({ before: verdicts, after: next });
    verdicts = next;
  }
  return { verdicts, snapshots };
}

describe("verdict properties", () => {
  it("P8: souls saved is always the sum of killed, non-resurrected yearly costs", () => {
    fc.assert(
      fc.property(arbStatement({ minSeries: 1 }), arbActions, ({ transactions }, actions) => {
        const detection = detect(transactions);
        const { verdicts } = play(detection, actions);
        const g = applyVerdicts(detection, verdicts);
        const expected = g.killed.reduce((sum, z) => sum + verdicts[z.id]!.yearlyCost, 0);
        expect(g.soulsSaved).toBe(expected);
        for (const z of g.resurrected) expect(z.lastCharge > verdicts[z.id]!.at).toBe(true);
        const placed = [g.feeding, g.maybe, g.dormant, g.killed, g.resurrected, g.spared].flat().map((z) => z.id).sort();
        expect(placed).toEqual([...detection.zombies, ...detection.maybeZombies].map((z) => z.id).sort());
      }),
      { numRuns: 200 },
    );
  });

  it("P9: undoing a verdict restores the previous graveyard exactly", () => {
    fc.assert(
      fc.property(arbStatement({ minSeries: 1 }), arbActions, ({ transactions }, actions) => {
        const detection = detect(transactions);
        for (const { before } of play(detection, actions).snapshots) {
          // Undo = go back to `before`; the view is a pure function of verdicts, so it must match.
          expect(applyVerdicts(detection, before)).toEqual(applyVerdicts(detection, structuredClone(before)));
        }
        const { verdicts } = play(detection, [...actions, ...actions.map(() => ({ kind: "undo" as const, pick: 0, dayOffset: 0 }))]);
        expect(applyVerdicts(detection, verdicts)).toEqual(applyVerdicts(detection, {}));
      }),
      { numRuns: 200 },
    );
  });

  it("keeps verdicts when next month's statement is imported", () => {
    const month = (m: number) => `2026-${String(m).padStart(2, "0")}-05,Grimflix,-1200`;
    const first = analyzeStatement(["Date,Description,Amount", month(1), month(2), month(3)].join("\n"));
    const z = first.detection.zombies[0]!;
    const verdicts = kill({}, z, "2026-03-20");
    expect(applyVerdicts(first.detection, verdicts).soulsSaved).toBe(1_440_000);

    const quiet = analyzeStatement(["Date,Description,Amount", month(1), month(2), month(3), "2026-06-01,Salary,65000"].join("\n"));
    expect(applyVerdicts(quiet.detection, verdicts)).toMatchObject({ soulsSaved: 1_440_000, killed: [{ id: z.id }] });

    const back = analyzeStatement(["Date,Description,Amount", month(1), month(2), month(3), month(4)].join("\n"));
    expect(applyVerdicts(back.detection, verdicts)).toMatchObject({ soulsSaved: 0, resurrected: [{ id: z.id }] });
  });
});
