/** Fallback key for descriptions that are pure noise (e.g. only a reference number). */
export const UNKNOWN_MERCHANT = "unknown";

/**
 * Ordered rewrite rules for a lowercased description (requirement 2.1). Order matters:
 * dates go before bare digits, card suffixes before punctuation.
 */
export const RULES: readonly { name: string; pattern: RegExp; replace: string }[] = [
  { name: "iso dates", pattern: /\b\d{4}-\d{2}-\d{2}\b/g, replace: " " },
  { name: "short dates", pattern: /\b\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?\b/g, replace: " " },
  { name: "card suffixes", pattern: /\b(?:card|crd)[-\s#]*\d+\b|\bx{2,}\d+\b|\*+\d+/g, replace: " " },
  { name: "references", pattern: /#\S*/g, replace: " " },
  { name: "web domains", pattern: /\.(?:com|net|org|io|co|app)\b/g, replace: " " },
  {
    name: "payment prefixes",
    pattern:
      /^(?:pos|ach|debit card purchase|card purchase|debit purchase|purchase|upi|bkash|nagad|direct debit|recurring payment|sq|paypal)(?:\s+|\s*\/\s*)/,
    replace: "",
  },
  { name: "digit-only tokens", pattern: /\b\d+\b/g, replace: " " },
  { name: "punctuation", pattern: /[^\p{L}\p{M}\p{N}\s]+/gu, replace: " " },
  { name: "whitespace", pattern: /\s+/g, replace: " " },
];

function step(s: string): string {
  return RULES.reduce((acc, r) => acc.replace(r.pattern, r.replace), s).trim();
}

/**
 * Merchant key for grouping (requirement 2.1). Rules are applied until nothing changes,
 * which makes the function idempotent by construction (requirement 2.2).
 */
export function normalize(description: string): string {
  let current = description.toLowerCase().trim();
  for (let i = 0; i < 10; i++) {
    const next = step(current);
    if (next === current) break;
    current = next;
  }
  return current === "" ? UNKNOWN_MERCHANT : current;
}

const ACRONYMS = new Set(["vpn", "tv", "hd", "ai", "isp", "sms", "bd", "uk", "us", "usa", "llc", "ltd", "plc"]);

/** Human-readable name for a merchant key: "phantom shield vpn" -> "Phantom Shield VPN" (requirement 2.3). */
export function displayName(merchantKey: string): string {
  return merchantKey
    .split(" ")
    .map((w) => (ACRONYMS.has(w) ? w.toUpperCase() : w.replace(/^\p{L}/u, (c) => c.toUpperCase())))
    .join(" ");
}
