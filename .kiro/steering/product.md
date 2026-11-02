---
inclusion: always
---

# Product: Zombie Subscriptions

## One-liner
Upload a bank statement, find the forgotten recurring charges still feeding on your money, and put them back in the grave.

## Problem
People lose real money to subscriptions they forgot about: free trials that rolled over, apps they stopped using, price hikes nobody noticed. Bank apps show transactions one by one, so a ৳499/month leak is invisible until you add it up.

## Audience
- Students and young professionals on tight budgets (primary).
- Anyone who has more than ~5 subscriptions and no idea what they cost per year.

## Core loop
1. **Summon** – import a CSV bank statement (or load the sample graveyard).
2. **Rise** – the app detects recurring charges; each one rises from a grave as a zombie card.
3. **Judge** – the user sees yearly cost, cadence, price hikes and last charge, then chooses:
   - **Kill** (I'm cancelling it) – zombie is buried, its yearly cost moves to "Souls saved".
   - **Spare** (I still use it) – zombie becomes a friendly ghost and stops nagging.
4. **Tally** – a running counter of money saved per year.

## Principles
- **Privacy is non-negotiable.** Bank data never leaves the browser. No backend, no analytics, no third-party calls.
- **The spooky design must serve the function.** Every effect maps to meaning: grave depth = how long it has been feeding, zombie size = yearly cost, glowing eyes = price hike. Decoration that carries no information is cut.
- **Honest numbers.** Always show how a figure was computed (e.g. "৳499 × 12 charges/yr"). Never overstate savings.
- **Works for judges in 10 seconds.** A "Load sample graveyard" button must demo everything without a real bank file.

## Out of scope (for the hackathon)
- Connecting to bank APIs, cancelling subscriptions on the user's behalf, accounts or sync between devices.
