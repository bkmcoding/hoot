# Hoot — agent context

Hoot is a standalone, client-side predictive household inventory demo: vanilla HTML/CSS/JS, `localStorage`, seeded sample data, and an ASP.NET Core scaffold that is not wired up yet. The product promise is a shopping list that writes itself from purchase history, not a manual list that needs constant upkeep.

## Start here

Read only these, in order:

1. `PRODUCT.md` — users, purpose, capabilities, constraints.
2. `DESIGN.md` — Warm Ledger tokens, components, responsive rules, accessibility floor, change control.
3. `docs/ux-flows.md` — job, sequence, states, and acceptance criteria for every surface.
4. `docs/tooling-roadmap.md` — product direction, prioritized additions, open questions.
5. `docs/glossary.md` — shared domain vocabulary.
6. `docs/adr/0001-unified-in-store-shopping-run.md` — why the run is a first-class immersive view.
7. `README.md` — run commands and the current feature list.

Do not read completed plans, session handoffs, historical critique narratives, generated QA, or build byproducts. They are deliberately excluded. For critique history, read only the newest snapshot in `.impeccable/critique/` and use `critique-storage trend frontend-index-html 5`; treat older snapshots as history, not current truth.

## Run and verify

- Preview: `cd frontend && python -m http.server 8000`, then open `http://127.0.0.1:8000/`.
- Gate: `npm test` — design-token lint, prediction and store-run unit tests, and Playwright accessibility, overflow, and flow tests.
- Lighthouse: `npm run audit:lighthouse` writes to `.quality/`, which is ignored.
- There is no build step and no external runtime dependency.

## Current state

- Branch `feature/in-store-shopping-run`; the shopping-run integration is uncommitted. Do not commit, push, merge, or discard without the user's explicit request.
- Implemented: dashboard with **Next up**, ranked queue, search, 7/14-day calendar; add/edit/delete; log purchase and **Log last**; item detail with rhythm chart and history; one-time ledger; immersive Shopping run with aisle groups, Watch toggle, cart, and receipt; reset demo.
- Not implemented: backend integration, authentication, household sharing, reminders, barcode lookup, price trends, export/import, and prediction-accuracy correction. Treat these as roadmap, not current behavior.

## Design constraints

- Warm Ledger only: cream canvas, paper surfaces, warm hairlines, earth inks, sage primary, amber focus, tabular numerals. No dark mode, gradients, glass, glow, web fonts, icon fonts, frameworks, or mascot owl.
- One primary action per work area; text plus color for every status; never color alone.
- Keep the Shopping run immersive: global header and footer hide, focus enters the **Shopping run** heading, **Exit run** preserves the cart, and **Finish shopping run** opens the receipt.
- The run's **Add** commits the checkoff immediately: tracked staples log a purchase and one-time items are checked off. Do not reintroduce the retired Restock trip modal or its batch flow.

## Critique protocol

- Use the `brainstorming` skill before changing behavior, `impeccable` for scored design reviews, and `web-design-guidelines` for UI code checks.
- For a whole-system critique, inspect the dashboard, add/log dialogs, item detail, one-time ledger, calendar, and Shopping run at 1440, 980, 390, and 320 widths.
- Score all ten Nielsen heuristics only when the surface is an Operate surface; state any degraded sub-agent status honestly.
- Persist the new snapshot under `.impeccable/critique/` and update this file only when the authoritative doc set changes.

## Change control

1. `DESIGN.md` first for durable visual or component rules.
2. `docs/ux-flows.md` for task, state, or focus changes.
3. Apply code changes in `frontend/style.css`, `frontend/index.html`, and `frontend/app.js`.
4. Verify desktop, tablet, and phone before calling work complete.
5. Update this map only when the set of authoritative docs changes.
