import { useEffect, useMemo, useReducer } from "react";
import { analyzeStatement, type ColumnMapping, type DateFormat, type Zombie } from "./core";
import sampleCsv from "./sample/haunted-statement.csv?raw";
import { checklistCsv, downloadText } from "./state/export";
import { DEFAULT_SAVED, forget, headerSignature, load, save, type Saved, type Settings } from "./state/storage";
import { applyVerdicts, kill, spare, type VerdictMap } from "./state/verdicts";
import { Atmosphere } from "./ui/effects/Atmosphere";
import { play } from "./ui/effects/sound";
import { CURRENCIES, formatMoney, todayIso } from "./ui/format";
import { Graveyard } from "./ui/graveyard/Graveyard";
import { ZombieSheet, type ZombieStatus } from "./ui/graveyard/ZombieSheet";
import { Landing } from "./ui/import/Landing";
import { MappingDialog } from "./ui/import/MappingDialog";

interface Statement {
  name: string;
  text: string;
  mapping?: ColumnMapping;
  dateFormat?: DateFormat;
}

interface Toast {
  id: number;
  message: string;
  tips: boolean;
}

interface State extends Saved {
  current?: Statement;
  /** Verdict maps before each change, for undo (detection requirement 5.3). */
  history: VerdictMap[];
  selectedId?: string;
  toast?: Toast;
}

type Action =
  | { type: "open"; statement: Statement }
  | { type: "close" }
  | { type: "mapped"; mapping: ColumnMapping; dateFormat?: DateFormat; signature: string }
  | { type: "verdict"; verdicts: VerdictMap; toast?: Omit<Toast, "id"> }
  | { type: "undo" }
  | { type: "select"; id?: string }
  | { type: "merge"; from: string; into: string }
  | { type: "toggleSplit"; key: string }
  | { type: "resetGrouping" }
  | { type: "settings"; settings: Partial<Settings> }
  | { type: "dismissToast" }
  | { type: "forget" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "open": {
      const remembered = state.mappings[headerSignature(analyzeStatement(action.statement.text).import.headers)];
      return { ...state, current: { ...remembered, ...action.statement }, selectedId: undefined };
    }
    case "close":
      return { ...state, current: undefined, selectedId: undefined, toast: undefined };
    case "mapped":
      if (!state.current) return state;
      return {
        ...state,
        current: { ...state.current, mapping: action.mapping, dateFormat: action.dateFormat },
        mappings: { ...state.mappings, [action.signature]: { mapping: action.mapping, dateFormat: action.dateFormat } },
      };
    case "verdict":
      return {
        ...state,
        history: [...state.history, state.verdicts].slice(-50),
        verdicts: action.verdicts,
        selectedId: undefined,
        toast: action.toast ? { ...action.toast, id: Date.now() } : undefined,
      };
    case "undo": {
      const previous = state.history[state.history.length - 1];
      if (!previous) return state;
      return { ...state, verdicts: previous, history: state.history.slice(0, -1), toast: undefined };
    }
    case "select":
      return { ...state, selectedId: action.id };
    case "merge":
      return { ...state, overrides: { ...state.overrides, merges: { ...state.overrides.merges, [action.from]: action.into } }, selectedId: undefined };
    case "toggleSplit": {
      const split = state.overrides.splitByAmount;
      const next = split.includes(action.key) ? split.filter((k) => k !== action.key) : [...split, action.key];
      return { ...state, overrides: { ...state.overrides, splitByAmount: next }, selectedId: undefined };
    }
    case "resetGrouping":
      return { ...state, overrides: DEFAULT_SAVED.overrides };
    case "settings":
      return { ...state, settings: { ...state.settings, ...action.settings } };
    case "dismissToast":
      return { ...state, toast: undefined };
    case "forget":
      return { ...DEFAULT_SAVED, history: [] };
  }
}

function init(): State {
  const saved = load();
  return { ...saved, history: [], current: saved.statement ? { ...saved.statement } : undefined };
}

export function App() {
  const [state, dispatch] = useReducer(reducer, undefined, init);
  const { current, settings, verdicts, overrides } = state;
  const currency = settings.currency;

  useEffect(() => {
    save({
      verdicts: state.verdicts,
      overrides: state.overrides,
      mappings: state.mappings,
      settings: state.settings,
      statement: current ? { name: current.name, text: current.text } : undefined,
    });
  }, [state.verdicts, state.overrides, state.mappings, state.settings, current]);

  const analysis = useMemo(
    () => (current ? analyzeStatement(current.text, { mapping: current.mapping, dateFormat: current.dateFormat, overrides }) : undefined),
    [current, overrides],
  );
  const graveyard = useMemo(() => (analysis ? applyVerdicts(analysis.detection, verdicts) : undefined), [analysis, verdicts]);

  useEffect(() => {
    if (!state.toast) return;
    const timer = setTimeout(() => dispatch({ type: "dismissToast" }), 10_000);
    return () => clearTimeout(timer);
  }, [state.toast]);

  const statusOf = (z: Zombie): ZombieStatus => {
    if (!graveyard) return "feeding";
    for (const s of ["resurrected", "killed", "spared", "dormant", "maybe"] as const) if (graveyard[s].includes(z)) return s;
    return "feeding";
  };

  const allZombies = analysis ? [...analysis.detection.zombies, ...analysis.detection.maybeZombies] : [];
  const selected = allZombies.find((z) => z.id === state.selectedId);

  function open(id: string) {
    const z = allZombies.find((x) => x.id === id);
    if (z?.priceChange && z.priceChange.to > z.priceChange.from) play("groan", settings.sound);
    dispatch({ type: "select", id });
  }

  function killZombie(z: Zombie) {
    play("shovel", settings.sound);
    dispatch({
      type: "verdict",
      verdicts: kill(verdicts, z, todayIso()),
      toast: { message: `Buried ${z.displayName}. ${formatMoney(z.yearlyCost, currency)} a year saved, once you cancel it.`, tips: true },
    });
  }

  function spareZombie(z: Zombie) {
    play("wind", settings.sound);
    dispatch({ type: "verdict", verdicts: spare(verdicts, z, todayIso()), toast: { message: `Spared ${z.displayName}. It's a friendly ghost now.`, tips: false } });
  }

  function revive(z: Zombie) {
    const next = { ...verdicts };
    delete next[z.id];
    dispatch({ type: "verdict", verdicts: next, toast: { message: `${z.displayName} is back in the graveyard.`, tips: false } });
  }

  const needs = analysis?.import.needs ?? [];

  return (
    <>
      <Atmosphere />
      <div className="app">
        {!current || !analysis || !graveyard ? (
          <Landing onFile={(name, text) => dispatch({ type: "open", statement: { name, text } })} onSample={() => dispatch({ type: "open", statement: { name: "Sample graveyard", text: sampleCsv } })} />
        ) : (
          <>
            <header className="topbar">
              <p className="brand">Zombie Subscriptions</p>
              <button type="button" className="btn btn-small" onClick={() => dispatch({ type: "close" })}>
                Load another statement
              </button>
            </header>
            {needs.length === 0 && (
              <Graveyard
                graveyard={graveyard}
                verdicts={verdicts}
                referenceDate={analysis.detection.referenceDate}
                statementName={current.name}
                transactionCount={analysis.import.transactions.length}
                skipped={analysis.import.skipped.length}
                currency={currency}
                onOpen={open}
              />
            )}
            <footer className="footer">
              <label>
                Currency
                <select value={currency} onChange={(e) => dispatch({ type: "settings", settings: { currency: e.target.value } })}>
                  {CURRENCIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                <input type="checkbox" checked={settings.sound} onChange={(e) => dispatch({ type: "settings", settings: { sound: e.target.checked } })} />
                Sound effects
              </label>
              <label>
                <input type="checkbox" checked={settings.remember} onChange={(e) => dispatch({ type: "settings", settings: { remember: e.target.checked } })} />
                Remember this statement on this device
              </label>
              <button type="button" className="btn btn-small" onClick={() => downloadText("cancel-these.csv", checklistCsv(graveyard, verdicts))} disabled={graveyard.killed.length + graveyard.spared.length + graveyard.resurrected.length === 0}>
                Export checklist
              </button>
              {(Object.keys(overrides.merges).length > 0 || overrides.splitByAmount.length > 0) && (
                <button type="button" className="btn btn-small" onClick={() => dispatch({ type: "resetGrouping" })}>
                  Reset grouping
                </button>
              )}
              <button
                type="button"
                className="btn btn-small btn-ghost"
                onClick={() => {
                  if (window.confirm("Forget everything? This clears your verdicts, settings and any remembered statement from this device.")) {
                    forget();
                    dispatch({ type: "forget" });
                  }
                }}
              >
                Forget everything
              </button>
            </footer>
          </>
        )}
      </div>

      {current && analysis && needs.length > 0 && (
        <MappingDialog
          key={current.name + needs.join()}
          text={current.text}
          result={analysis.import}
          onSubmit={(mapping, dateFormat) => dispatch({ type: "mapped", mapping, dateFormat, signature: headerSignature(analysis.import.headers) })}
          onCancel={() => dispatch({ type: "close" })}
        />
      )}

      {selected && analysis && (
        <ZombieSheet
          key={selected.id}
          zombie={selected}
          status={statusOf(selected)}
          verdict={verdicts[selected.id]}
          referenceDate={analysis.detection.referenceDate}
          currency={currency}
          mergeTargets={[...new Map(allZombies.filter((z) => z.merchantKey !== selected.merchantKey).map((z) => [z.merchantKey, { key: z.merchantKey, name: z.displayName }])).values()]}
          isSplit={overrides.splitByAmount.includes(selected.merchantKey)}
          onKill={() => killZombie(selected)}
          onSpare={() => spareZombie(selected)}
          onRevive={() => revive(selected)}
          onMerge={(into) => dispatch({ type: "merge", from: selected.merchantKey, into })}
          onToggleSplit={() => dispatch({ type: "toggleSplit", key: selected.merchantKey })}
          onClose={() => dispatch({ type: "select" })}
        />
      )}

      {state.toast && (
        <div className="toast" role="status" key={state.toast.id}>
          <div className="toast-row">
            <span>{state.toast.message}</span>
            {state.history.length > 0 && (
              <button type="button" className="btn btn-small" onClick={() => dispatch({ type: "undo" })}>
                Undo
              </button>
            )}
          </div>
          {state.toast.tips && (
            <ul className="tips">
              <li>Bought in an app? Cancel in your phone's app store subscriptions page.</li>
              <li>Otherwise, look for "Cancel" or "Membership" in the service's account settings.</li>
              <li>Still charging? Ask your bank or wallet to stop the recurring payment.</li>
            </ul>
          )}
        </div>
      )}
    </>
  );
}
