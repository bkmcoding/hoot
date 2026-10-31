# Hoot — agent context

Hoot is a standalone, client-side predictive household inventory demo: vanilla HTML/CSS/JS, `localStorage`, seeded sample data, and an ASP.NET Core scaffold that is not wired up. The product promise is a shopping list that writes itself from purchase history, not a manual list that needs constant upkeep.

## Start here

Read these in full:

1. `PRODUCT.md` — users, purpose, capabilities, constraints.
2. `DESIGN.md` — Warm Ledger tokens, components, responsive rules, accessibility floor, change control.

For a specific surface, read only its section in `docs/ux-flows.md`. Consult `docs/tooling-roadmap.md`, `docs/glossary.md`, `docs/adr/0001-unified-in-store-shopping-run.md`, or `README.md` only when the task needs them.

Do not read archived critique snapshots except the newest, completed plans, session handoffs, generated QA, or build byproducts. For critique history, use `critique-storage trend frontend-index-html 5` instead of opening older snapshots.

## Run and verify

- Preview: `cd frontend && python -m http.server 8000`, then open `http://127.0.0.1:8000/`.
- Gate: `npm test` — design-token lint, demo-sample invariants, prediction and store-run unit tests, and Playwright accessibility, overflow, and flow tests.
- Sample data check: `npm run test:demo-data` validates both built-in samples without a browser.
- Lighthouse: `npm run audit:lighthouse` writes to `.quality/`, which is ignored.
- There is no build step and no external runtime dependency.

## Current state

- `main` contains the merged shopping-run feature. There is no active feature branch.
- Implemented: dashboard with **Next up**, ranked queue, search, 7/14-day calendar; add/edit/delete; log purchase and **Log last**; hash-routed item detail with a next-restock answer, likely window, buying-rhythm ledger, confidence and spending detail, prediction checks, and inline purchase editing; one-time ledger; immersive Shopping run with aisle groups, Watch toggle, **This trip**, and a receipt with the optional post-trip **Was Hoot right?** check; two switchable demo samples; reset demo.
- Not implemented: backend integration, authentication, household sharing, reminders, barcode lookup, price trends, export/import, and whole-history prediction drift reporting. Treat these as roadmap, not current behavior.

## Demo samples

Both samples live in `frontend/demo-data.js` and stay date-relative and deterministic.

- **Starter household** (default): 6 tracked staples and 2 one-time needs. First-run copy and most exact-value Playwright tests assume this sample.
- **Busy household**: 38 tracked staples and 6 one-time needs (44 items), 195 purchases across ten categories, all four urgency zones (6 Overdue, 8 Buy now, 10 Watch, 14 Steady at the reference date), and zero-, one-, and two-purchase learning cases. This is the scale sample for scanning, density, and vertical length.

Switch with the footer **Sample** select. Changing samples asks for confirmation because it replaces local data and clears the shopping-run session. **Reset demo** restores the active sample, not always the starter. `document.body.dataset.sample` is the QA hook (`starter` or `busy`).

When changing layout, density, overflow, or task flow, verify both samples at 1440, 980, 390, and 320. A change that only works at starter scale is not verified. Existing exact-value tests intentionally run on starter; add busy coverage when behavior differs by scale. Do not infer the busy sample's rhythms from item names; `tests/demo-data.test.mjs` owns those invariants.

## Design constraints

- Warm Ledger only: cream canvas, paper surfaces, warm hairlines, earth inks, sage primary, amber focus, tabular numerals. No dark mode, gradients, glass, glow, web fonts, icon fonts, frameworks, or mascot owl.
- One primary action per work area; text plus color for every status; never color alone.
- Keep the Shopping run immersive: global header and footer hide, focus enters the **Shopping run** heading, **Exit run** preserves this trip, and **Finish shopping run** opens the receipt.
- The run's **Log** action commits immediately: tracked staples record a purchase and one-time items are checked off. Do not reintroduce the retired Restock trip modal or its batch flow.

## Critique protocol

- Use the `brainstorming` skill before changing behavior, `impeccable` for scored design reviews, and `web-design-guidelines` for UI code checks.
- For a whole-system critique, inspect the dashboard, add/log dialogs, item detail, one-time ledger, calendar, and Shopping run at 1440, 980, 390, and 320 widths.
- Run every whole-system critique against both demo samples. The busy household is the required scale test for density, scanning, and vertical length; the starter household remains the baseline for first-run clarity.
- Score all ten Nielsen heuristics only when the surface is an Operate surface; state any degraded sub-agent status honestly.
- Persist the new snapshot under `.impeccable/critique/` and update this file only when the authoritative doc set changes.

## Change control

1. `DESIGN.md` first for durable visual or component rules.
2. `docs/ux-flows.md` for task, state, or focus changes.
3. Apply code changes in `frontend/demo-data.js` for sample data, then `frontend/style.css`, `frontend/index.html`, and `frontend/app.js`.
4. Verify desktop, tablet, and phone before calling work complete.
5. Update this map only when the set of authoritative docs changes.
