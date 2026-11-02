import type { ColumnMapping, DateFormat, Overrides } from "../core";
import type { VerdictMap } from "./verdicts";

const KEY = "zombie-subscriptions";
const VERSION = 1;

export interface Settings {
  currency: string;
  sound: boolean;
  remember: boolean;
}

export interface SavedMapping {
  mapping: ColumnMapping;
  dateFormat?: DateFormat;
}

export interface Saved {
  verdicts: VerdictMap;
  overrides: Overrides;
  /** Column choices keyed by the header row, so the same bank needs mapping once (graveyard-ui 2.3). */
  mappings: Record<string, SavedMapping>;
  settings: Settings;
  /** Only when the user ticked "Remember this statement on this device". */
  statement?: { name: string; text: string };
}

export const DEFAULT_SAVED: Saved = {
  verdicts: {},
  overrides: { merges: {}, splitByAmount: [] },
  mappings: {},
  settings: { currency: "BDT", sound: false, remember: false },
};

/** Reads saved state. Returns defaults when storage is empty, blocked, corrupt or from another version. */
export function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SAVED;
    const parsed = JSON.parse(raw) as { v?: number } & Partial<Saved>;
    if (parsed.v !== VERSION) return DEFAULT_SAVED;
    return {
      verdicts: parsed.verdicts ?? {},
      overrides: { ...DEFAULT_SAVED.overrides, ...parsed.overrides },
      mappings: parsed.mappings ?? {},
      settings: { ...DEFAULT_SAVED.settings, ...parsed.settings },
      statement: parsed.settings?.remember ? parsed.statement : undefined,
    };
  } catch {
    return DEFAULT_SAVED;
  }
}

export function save(state: Saved): void {
  try {
    const { statement, ...rest } = state;
    localStorage.setItem(KEY, JSON.stringify({ v: VERSION, ...rest, ...(state.settings.remember ? { statement } : {}) }));
  } catch {
    // Storage blocked or full: the app keeps working for this visit.
  }
}

/** "Forget everything" (graveyard-ui 6.2). */
export function forget(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing stored, nothing to forget.
  }
}

export function headerSignature(headers: readonly string[]): string {
  return headers.join("␟");
}
