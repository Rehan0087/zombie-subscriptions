// Generates src/sample/haunted-statement.csv: an invented 14-month statement for the
// "Load sample graveyard" button. Every merchant is made up. Run: node scripts/make-sample.mjs
import { writeFileSync } from "node:fs";

let seed = 31_10_2026;
const rand = () => ((seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31) / 2 ** 31);
const int = (min, max) => min + Math.floor(rand() * (max - min + 1));
const pick = (xs) => xs[int(0, xs.length - 1)];

const START = "2025-09-01";
const END = "2026-10-28";
const day = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 864e5;
const iso = (d) => new Date(d * 864e5).toISOString().slice(0, 10);
const addMonths = (s, n) => {
  const [y, m, d] = s.split("-").map(Number);
  const i = y * 12 + m - 1 + n;
  const last = new Date(Date.UTC(Math.floor(i / 12), (i % 12) + 1, 0)).getUTCDate();
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
};

const rows = []; // { date, description, amount (minor, signed) }
const add = (date, description, amount) => {
  if (day(date) >= day(START) && day(date) <= day(END)) rows.push({ date, description, amount });
};
const digits = (n) => String(int(10 ** (n - 1), 10 ** n - 1));

function monthly(firstDate, description, amount, { until = END, delay = 1 } = {}) {
  for (let k = 0; ; k++) {
    const d = addMonths(firstDate, k);
    if (day(d) > day(until)) break;
    add(iso(day(d) + int(0, delay)), description(), typeof amount === "function" ? amount(d) : amount);
  }
}

// --- subscriptions (all invented) ---
monthly("2025-09-05", () => `POS GRIMFLIX.COM ${digits(4)} CARD-4421`, -120_000);
monthly("2025-09-12", () => `UPI/BAT BEATS`, -29_900);
monthly("2025-09-20", () => `Coffin Cloud Storage ${digits(6)}`, -15_000);
monthly("2025-09-01", () => `ACH WRAITH GYM MEMBERSHIP`, -250_000);
monthly("2025-09-10", () => `HEX DAILY NEWS #${digits(5)}`, (d) => (d < "2026-03-01" ? -39_900 : -49_900));
monthly("2025-09-08", () => `PHANTOM SHIELD VPN`, -35_000);
monthly("2025-09-22", () => `PHANTOM SHIELD VPN`, -110_000);
monthly("2025-09-03", () => `Ghoul Arcade Pass ${digits(4)}`, -19_900, { until: "2026-03-31" });
for (let k = 0; k < 4 * 15; k++) add(iso(day("2025-09-01") + 7 * k + int(0, 1)), `bKash MOONLIT MOBILE DATA PACK`, -14_900);
for (let k = 0; k < 5; k++) add(addMonths("2025-10-15", 3 * k), `RAVEN READS QUARTERLY`, -90_000);
add("2025-09-18", "CRYPT DRIVE ANNUAL PLAN", -180_000);
add("2026-09-19", "CRYPT DRIVE ANNUAL PLAN", -180_000);
// A "maybe": irregular gym-class drop-ins that look almost monthly.
for (const [d, a] of [["2026-06-02", -60_000], ["2026-07-03", -72_000], ["2026-08-04", -55_000], ["2026-09-30", -66_000], ["2026-10-28", -58_000]]) {
  add(d, `SKULL FIT CLASS ${digits(3)}`, a);
}

// --- everyday life ---
const shops = [
  ["Corner Grocer", 20_000, 250_000], ["Lantern Cafe", 18_000, 65_000], ["Night Bus", 3_000, 9_000],
  ["Pumpkin Bakery", 8_000, 40_000], ["Owl Pharmacy", 15_000, 180_000], ["Misty Market", 50_000, 400_000],
  ["Fogbank Fuel", 100_000, 350_000], ["Midnight Noodles", 25_000, 90_000], ["Cobweb Books", 30_000, 150_000],
];
for (let d = day(START); d <= day(END); d++) {
  const n = rand() < 0.55 ? int(1, 2) : 0;
  for (let i = 0; i < n; i++) {
    const [name, lo, hi] = pick(shops);
    add(iso(d), rand() < 0.5 ? `POS ${name.toUpperCase()} ${digits(4)}` : name, -Math.round(int(lo, hi) / 100) * 100);
  }
}
monthly("2025-09-25", () => "SALARY ACME HAUNTS LTD", 6_500_000);
for (const d of ["2025-11-14", "2026-02-03", "2026-07-21"]) add(d, `REFUND ${pick(shops)[0].toUpperCase()}`, int(5_000, 40_000));
add("2026-04-14", "Pohela Boishakh bonus", 1_000_000);

// --- write in a common bank layout: DD/MM/YYYY, separate withdrawal/deposit columns, running balance ---
rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
const money = (m) => (m / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const quote = (s) => (/[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
let balance = 15_000_000;
const lines = [
  "Haunted Hollow Bank PLC,,,,",
  "Account statement: A. Ghost (invented sample),,,,",
  `Period: ${START} to ${END},,,,`,
  "",
  "Txn Date,Narration,Withdrawal Amt,Deposit Amt,Closing Balance",
];
for (const r of rows) {
  balance += r.amount;
  const [y, m, d] = r.date.split("-");
  lines.push([`${d}/${m}/${y}`, quote(r.description), r.amount < 0 ? quote(money(-r.amount)) : "", r.amount > 0 ? quote(money(r.amount)) : "", quote(money(balance))].join(","));
}
writeFileSync(new URL("../src/sample/haunted-statement.csv", import.meta.url), lines.join("\n") + "\n");
console.log(`${rows.length} rows written`);
