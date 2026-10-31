# Hoot Tooling Roadmap

## Product Direction

Hoot is a predictive household inventory tracker for recurring staples. The primary user job is:

> See what is running low or due next, and log a purchase in seconds.

The app’s strongest future additions should deepen that promise rather than add generic dashboard chrome.

## Implemented

- **In-store Shopping Run** (2026-10-28; refined 2026-10-29)
   - A first-class Shopping run reachable from primary navigation, with aisle/category grouping, one-tap checkoff, a compact progress strip, and cart corrections.
   - The run is immersive: global chrome hides, **Exit run** preserves the cart, and **Finish shopping run** opens a receipt with counts, known spend, and purchase-history access.
   - Tracked staples in Overdue or Buy now are drafted automatically. Watch items follow the dashboard's **Next up** state and remain toggleable; all uncompleted one-time needs are included.
   - Checked rows collapse to a compact **In cart** line; quantity, price, and the next restock estimate live in the cart.
   - The legacy batch **Restock trip** modal is retired. One trip flow.
   - See `docs/adr/0001-unified-in-store-shopping-run.md` and `docs/ux-flows.md`.

## Prioritized Additions

### P0 — Build Next

1. **Prediction feedback and accuracy loop**
   - Compare predicted dates with actual purchases.
   - Surface drift, confidence, and whether an item’s rhythm is stable or unstable.
   - Let the user gently correct an estimate when Hoot is wrong.

2. **Data safety and portability**
   - Add JSON/CSV export and import.
   - Add state schema versioning and migration.
   - This protects purchase history and makes a future backend transition safer.

### P1 — Add After the Core Loop Is Stronger

3. **Quiet reminders**
   - Add opt-in browser notifications or a compact “next 24 hours” digest.
   - Keep them low-frequency and calm.

4. **Manual barcode/product history**
   - Start with a simple barcode field and local product history.
   - Do not build camera scanning or external product intelligence until the core restock flow is solid.

5. **PWA / offline support**
   - Especially valuable now that Shopping Run exists.
   - Store use needs to be reliable, fast, and installable.

### P2 — Useful, but Later

6. **Price trends**
   - Good value once purchase history and data safety are stable.

7. **Household sharing**
   - Useful after the single-user prediction loop is trustworthy and the backend becomes real.

## Tooling Roadmap

### P0 — Implement Now

1. **Automated quality gate**
   - Playwright smoke and accessibility tests.
   - axe-core accessibility scanning.
   - Lighthouse performance, accessibility, and best-practices reports.
   - GitHub Actions runs the full gate on `main` and pull requests.

2. **Prediction model harness**
   - Isolate the prediction model in a testable module.
   - Test manual estimates, learned rhythms, confidence, and zone boundaries with synthetic purchase histories.

3. **Design token linter**
   - Formalize all `rgba()` values as semantic color tokens.
   - Reject raw `rgba()` usage outside the `:root` token layer.
   - Prevent design-system drift as the UI grows.

### P1 — Add After These Gates Pass

4. **State migration tests**
   - Snapshot/restore tests for `localStorage`, schema versions, and future IndexedDB or backend migration.

5. **Impeccable detector in CI**
   - Add once the detector can be invoked consistently outside the local skill installation.

6. **API contract tests**
   - Add once the backend is more than a scaffold.
   - The existing `hootApi` seam is already prepared for this.

### P2 — Later

7. **Prediction drift harness**
   - Compare predicted dates with actual purchase dates over time.
   - Use this to tune the model and expose confidence more honestly.

8. **Lighthouse score policy**
   - Start with reporting only.
   - Add score thresholds once the app has a stable deployment target.

## Open Questions

1. ~~Should Shopping Run be a first-class view, a full-screen mode, or a persistent drawer?~~ **Resolved:** a first-class, immersive view whose only entry point is primary navigation (ADR-0001).
2. Should prediction corrections create a new purchase, or only adjust the model?
3. Should reminders use browser notifications, email, or a compact in-app digest?
4. Should barcode support start with manual entry or wait for camera scanning?
5. Should export/import support only Hoot’s current state, or also include a portable purchase-history format?
