# ADR 0001: Unified In-Store Shopping Run

- **Status:** Approved (Architecture & Interaction Agreed)
- **Date:** 2026-10-25
- **Deciders:** Product Design & Architecture
- **Consulted:** Hoot Design System ("Warm Ledger"), UX Flows

---

## Decisions Made

1. **Information Architecture (Trigger Model):**
   - Retain `[ Dashboard | One-time ]` in primary navigation for desktop and planning views.
   - Introduce an explicit **"Start Store Run"** trigger in header actions and mobile dock.
   - Activating Store Run launches an immersive, thumb-friendly in-store checklist mode that can be exited or finalized at any time.

2. **Categorical Organization:**
   - Group items in the Store Run by **Category / Aisle Buckets** (e.g. *Dairy & Refrigerated*, *Pantry*, *Household & Paper*, *Personal Care*) to match real-world supermarket layouts.
   - Inside each category bucket, sort items by urgency (`Overdue` first, then `Buy Now`, then `Watch`, then `One-time`).

3. **Checkoff Interaction (Hybrid 1-Tap):**
   - Default to **Zero-Friction Optimistic Logging**: 1 tap on the item checks it off, records a purchase for today with last-known quantity and price, and moves it into the collapsed "In Cart" section.
   - Provide an inline "Edit / Adjust" pill in the "In Cart" section for zero-pressure post-checkoff corrections.

---

## Context and Problem Statement

Hoot currently separates inventory into two distinct mental silos and views:
1. **Dashboard:** Displays mathematically projected Tracked Staples with horizon rails, calendar strips, and "Next up" cards.
2. **One-time:** Displays an isolated paper checklist of non-recurring ad-hoc needs.

Additionally, a desktop "Restock trip" modal exists to batch-log multiple items simultaneously.

### The Real-World Failure Mode:
In reality, household shopping does not happen in silos. When a user stands in a grocery aisle with one hand on a shopping cart and a phone in the other:
- They need to see **everything** they need to buy in that trip together (e.g. Milk from Tracked + Birthday Candles from One-time).
- Flipping back and forth between "Dashboard" and "One-time" tabs in a crowded store aisle induces high cognitive friction.
- Opening heavy modal dialogs to input prices or dates while walking through an aisle leads to user abandonment.

---

## Decision Drivers

1. **One-Handed Grocery Aisle Ergonomics:** Single-tap check-off with prominent touch targets ($\ge 48\text{px}$) within natural thumb sweep.
2. **Mental Model Unification:** Presenting a single "Store Run" list where prediction urgency drafts items automatically, while preserving mathematical distinction behind the scenes.
3. **Data Integrity Without Slowness:** Ensuring checking off a staple logs a real purchase with smart defaults (last quantity/price), while one-time items simply mark completed.
4. **Adherence to Warm Ledger:** Maintaining tactile paper surfaces, cream canvas, tabular numerals, and no dark mode or flashy supermarket gamification.

---

## Options Considered

### Option A: Replace "One-time" Tab with a Unified "Shopping Run" Tab
- Primary navigation changes from `[ Dashboard | One-time ]` to `[ Dashboard | Shopping Run ]`.
- "Shopping Run" aggregates all items due for purchase:
  - **Auto-drafted Staples:** Any staple in `Overdue` or `Buy Now` (with optional one-tap inclusion of `Watch` items).
  - **One-time Needs:** All uncompleted checklist items.
- Provides a persistent toggle: **"Plan Trip"** (edit list/quantities) vs **"Store Mode"** (distraction-free check-off).

### Option B: Keep Tabs Separate, Add a Floating "Store Run" Modal
- Keep `[ Dashboard | One-time ]` intact.
- Clicking "Restock trip" or a floating store button launches an immersive full-screen wizard.
- *Downside:* Modals create claustrophobic interaction on mobile and don't feel like a first-class view.

### Option C: Inline In-Store View Mode on Dashboard
- Keep everything on the Dashboard, but add a toggle switch or button "Store View" that hides charts, calendar, and quiet cards, collapsing the view into a pure checklist.
- *Downside:* Clutters the Dashboard's core role as a household ledger kept on paper.

---

## Key Open Design Decisions (The Grill Points)

1. **The Dual Check-off Behavior:**
   - When tapping a Tracked Staple: Does it instantly log a purchase with last-known quantity/price, or show an inline stepper drawer?
   - How does the UI distinguish a crossed-off One-time item from a logged Tracked restock in the "In Cart" summary?
2. **Aisle Sorting:**
   - Grouping items by category (Produce, Dairy, Pantry, Household) vs. chronological due date.
3. **Trip Finalization:**
   - Does completing the run require a "Finish Trip" button (with aggregate Undo toast), or does each check-off commit optimistically in real time?

---

## Implementation update (2026-10-29)

- **Option A shipped.** Primary navigation is **Dashboard | Shopping | One-time**, with the view titled **Shopping run**. The run is a first-class immersive view, not a modal: global header and footer hide, **Exit run** preserves the cart, and the finish action closes the list.
- **Checkoff is optimistic and immediate.** Tapping a tracked staple logs a purchase with the latest quantity and price; one-time items are checked off the list. The aisle row collapses to a compact **In cart** line, and the cart exposes **Adjust** and **Undo**. The empty cart says the change is saved immediately.
- **Keyboard entry and exit are explicit.** Entering the run focuses the **Shopping run** heading; **Exit run** returns focus to the Dashboard nav.
- **Aisle order is category first, urgency second.** Categories sort alphabetically; within a group, items sort Overdue, Buy now, Watch when included, then One-time.
- **Watch follows the dashboard.** A fresh run includes Watch when the dashboard's **Next up** item is in Watch, so the two surfaces cannot disagree; the toggle remains available.
- **Finalization uses a receipt, not a toast.** **Finish shopping run** opens a summary of item count, known spend, and checked-off items. **Done** clears the run, **View purchase history** opens the first tracked item, and dismissing the receipt leaves the run active. Individual **Undo** makes an aggregate undo unnecessary.
- **The Restock trip modal is retired.** Its batch purchase path and chrome were removed; there is one trip flow.
