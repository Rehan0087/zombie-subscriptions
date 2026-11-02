# Requirements: Zombie Detection Engine

## Introduction
The detection engine turns a bank statement into a list of recurring charges ("zombies"). It is pure TypeScript in `src/core/`, runs entirely in the browser, and is the part of the app where correctness matters most: a missed subscription costs the user money, and a false one destroys trust.

## Glossary
- **Transaction** – one row of a statement: date, description, signed amount in minor units.
- **Debit** – a transaction with a negative amount (money leaving the account).
- **Merchant key** – the normalized form of a description used to group charges.
- **Cadence** – the repeat interval of a zombie: weekly, monthly, quarterly or yearly.
- **Zombie** – a detected recurring debit series that is still active.
- **Reference date** – the "today" used for activity checks; defaults to the latest transaction date in the statement.

## Requirement 1: Import a CSV statement
**User story:** As a user, I want to drop in the CSV my bank gives me, so that I don't have to reformat anything.

### Acceptance criteria
1. WHEN the user provides a CSV file THE SYSTEM SHALL parse it in the browser without sending it anywhere.
2. WHEN the header row contains recognizable date, description and amount columns (case-insensitive, common synonyms such as "Posting Date", "Narration", "Details", "Debit", "Withdrawal Amt") THE SYSTEM SHALL map them automatically.
3. IF the system cannot map a required column THEN THE SYSTEM SHALL ask the user to choose the column from a list of headers, showing three example values for each.
4. WHEN a statement uses separate debit and credit columns THE SYSTEM SHALL combine them into one signed amount (debit negative, credit positive).
5. THE SYSTEM SHALL accept dates in `YYYY-MM-DD`, `DD/MM/YYYY`, `MM/DD/YYYY`, `DD-MMM-YYYY` and `DD MMM YYYY`, and SHALL ask the user to confirm the day/month order WHEN it is ambiguous for every row.
6. THE SYSTEM SHALL accept amounts with currency symbols, thousands separators, parentheses for negatives, and either `.` or `,` as the decimal separator.
7. IF a row cannot be parsed THEN THE SYSTEM SHALL skip it, count it, and report "N rows skipped" with the first three row numbers, without failing the import.
8. THE SYSTEM SHALL strip a UTF-8 byte order mark and ignore blank lines.

## Requirement 2: Normalize merchant names
**User story:** As a user, I want "NETFLIX.COM 8573 CARD-1234" and "Netflix.com 9912" counted as the same thing, so that one subscription isn't split into several.

### Acceptance criteria
1. THE SYSTEM SHALL derive a merchant key by lowercasing, removing digits-only tokens, card suffixes (e.g. `card-1234`, `xx1234`), payment prefixes (`pos`, `ach`, `debit card purchase`, `upi/`, `bkash`), dates inside the description, and repeated whitespace/punctuation.
2. THE SYSTEM SHALL produce the same key when normalization is applied twice (idempotent).
3. THE SYSTEM SHALL show a human-readable display name built from the merchant key: title-cased, with known acronyms (VPN, TV, …) in capitals. _(Changed during build: the most frequent original description still carried bank noise such as "POS … CARD-4421".)_
4. WHEN the user merges or splits groups manually THE SYSTEM SHALL remember that choice for the merchant keys involved.

## Requirement 3: Detect recurring charges
**User story:** As a user, I want the app to find charges that repeat on a schedule, so that I can see every subscription at once.

### Acceptance criteria
1. THE SYSTEM SHALL consider only debits when detecting zombies; credits (refunds, salary, transfers in) SHALL never form a zombie.
2. THE SYSTEM SHALL classify a group as recurring WHEN the median gap between consecutive charges falls in a cadence window: weekly 6–8 days, monthly 26–35 days, quarterly 85–98 days, yearly 350–380 days.
3. THE SYSTEM SHALL require at least 3 charges for weekly, monthly and quarterly cadences, and at least 2 charges for yearly.
4. THE SYSTEM SHALL require at least 75% of charges to be on schedule, so that one late or skipped payment does not hide a subscription. A charge is on schedule WHEN its gap from the previous charge is within the cadence window, OR its gap from the charge two back is within twice the window (the previous charge was late).
5. THE SYSTEM SHALL require the amounts to be stable: every charge within ±25% of the group median, OR a single step change (price hike or cut) after which amounts are stable again.
6. WHEN a merchant has two interleaved series with clearly different amounts (e.g. two plans on one service) THE SYSTEM SHALL report them as separate zombies.
7. THE SYSTEM SHALL return the same zombies regardless of the order of the input rows.
8. THE SYSTEM SHALL assign each zombie a confidence score from 0 to 1 based on charge count, gap regularity and amount stability, and SHALL hide zombies under 0.5 behind a "Maybe zombies" toggle.

## Requirement 4: Describe each zombie
**User story:** As a user, I want to know exactly what each subscription costs me, so that I can decide whether it's worth it.

### Acceptance criteria
1. THE SYSTEM SHALL report for each zombie: display name, cadence, current amount (latest charge), first and last charge dates, number of charges, total paid so far, and estimated yearly cost.
2. THE SYSTEM SHALL compute yearly cost as current amount × charges per year (52, 12, 4 or 1), in integer minor units.
3. WHEN the latest amount is higher than the first amount THE SYSTEM SHALL flag a price hike with the old amount, new amount and month it changed.
4. THE SYSTEM SHALL mark a zombie as **dormant** WHEN no charge has happened within 1.5 × its cadence before the reference date, and dormant series SHALL NOT count towards yearly cost.
5. THE SYSTEM SHALL show how every figure was computed (e.g. "৳499 × 12 charges/yr = ৳5,988").

## Requirement 5: Verdicts and savings
**User story:** As a user, I want to mark what I'm cancelling and see how much I'll save, so that I'm motivated to actually do it.

### Acceptance criteria
1. WHEN the user kills a zombie THE SYSTEM SHALL record the verdict with the date and add its yearly cost to "Souls saved".
2. WHEN the user spares a zombie THE SYSTEM SHALL record the verdict and exclude it from the "still feeding" total.
3. WHEN the user undoes a verdict THE SYSTEM SHALL restore the zombie and the totals to exactly their previous values.
4. THE SYSTEM SHALL key verdicts by merchant key, cadence and plan index, so that importing next month's statement keeps earlier decisions and two plans from one merchant are judged separately.
5. IF a killed zombie charges again in a later statement THEN THE SYSTEM SHALL resurrect it with a "It came back!" warning.
6. THE SYSTEM SHALL keep "Souls saved" equal to the sum of yearly costs of killed, non-resurrected zombies at all times, using each zombie's yearly cost at the moment it was killed (a cancelled subscription goes dormant, and its live yearly cost drops to 0).
7. THE SYSTEM SHALL NOT count "Maybe zombies" in the "Still feeding" total until the user confirms them.
