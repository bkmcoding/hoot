# Busy Household Demo Sample

Date: 2026-10-31
Status: proposed

## Intent

Hoot has been designed, tested, and critiqued against an eight-item sample. The next question — whether the dashboard needs a spacious/dense view — cannot be judged from that sample. A realistic household with 30–45 items is needed first, so the layout can be assessed at the scale people actually maintain.

The busy household is added as a second, switchable sample. The starter sample stays the default so the first-run story and the existing regression suite keep their current meaning, and so the two scales can be compared directly.

## Goals

- Add a deterministic, date-relative busy household: 38 tracked staples and 6 one-time needs (44 items).
- Give the busy sample deep histories (up to ten purchases), a realistic category and urgency spread, price drift, multi-quantity purchases, and a mix of mature, learning, and brand-new items.
- Add one footer control that switches samples. Switching replaces local demo data, so it goes through the existing confirmation dialog.
- Keep the starter sample byte-for-byte equivalent in IDs, dates, prices, and names.
- Document the two samples for future agents, critiques, and test authors.
- Cover the new sample with dataset invariants, one switch/reset flow, and a four-width overflow check.

## Non-goals

- The spacious/dense view toggle. That is the next request, and this sample is its foundation.
- Changing prediction math, status thresholds, shopping-run eligibility, or dashboard ordering.
- Making the busy household the first-run default.
- A general settings surface or user accounts.
- Editing the starter sample's behavior or values.

## Approaches Considered

**Replace the built-in sample.** Simple and immediate, but it retires the tiny baseline and breaks a large part of the quality suite, which asserts the starter's exact rhythms. Rejected for this step; it can be revisited once the density work settles.

**Dev-only URL flag.** Quick to add and useful for screenshots, but it is not a usable product surface, easy to forget during critique, and gives the sample no visible place in the demo. Rejected.

**Switchable second sample (chosen).** Starter remains the default; the footer exposes both. It costs one control and one state field, preserves the existing suite, and lets a reviewer flip between the two scales in the same browser. It also gives later agents an explicit, documented way to exercise both.

## Busy Sample Shape

- 38 tracked staples + 6 one-time needs = 44 items.
- Tracked categories: Pantry 8, Dairy & eggs 4, Produce 5, Bakery 3, Frozen 3, Beverages 3, Household 4, Cleaning 4, Personal care 3, Pet 1.
- Purchase depth after the data pass: three items with 10 purchases, two with 8, four with 7, five with 6, twelve with 5, five with 4, two with 3, two with 2, one with 1, and two with 0. That is 195 purchases across 38 staples.
- Urgency at the reference date: at least six Overdue, eight Buy now, eight Watch, and the remainder Steady. The first **Next up** is an unmistakably overdue staple, not a learning item.
- Learning coverage: at least four staples with fewer than three purchases, including one with no purchases and one with exactly two.
- One-time coverage: six needs, four open and two completed.
- Every purchase is in the past, sorted oldest-first, with a stable ID. `createdAt` precedes the first purchase. Known prices drift gently from older to newer; a few purchases have quantity above one so unit-price history has something to show.
- Empty prices are allowed but kept rare; they exercise "Price unknown" without making the sample look neglected.

Data is authored as compact per-item tables (name, category, unit, threshold, last-purchase offset, gaps, latest price), not generated with a PRNG. Dates are built backwards from a reference date so the sample stays realistic whenever the demo runs. The resulting urgency zones are verified with a script and tuned before they are asserted in tests.

## Data Module

A new `frontend/demo-data.js` owns the sample catalog:

- `DEMO_SAMPLES`: ordered metadata for the footer (`id`, label, short description, item count).
- `createStarterDemoState(referenceDate)`: the current eight items, moved without changing their values.
- `createBusyDemoState(referenceDate)`: the new 44 items.
- Internal helpers that build purchase dates and price ladders deterministically.

`frontend/app.js` imports these and exposes `createDemoState(sampleId)`. No other module learns about sample names.

## State and Control

- `hoot-demo-state-v1` gains a top-level `sample` field. A missing field means `starter`, so existing browser data keeps working.
- The footer becomes: sample note, a labelled native **Sample** select, and **Reset demo**. The select is a secondary control at 42px desktop and 44px on phones; there is still no primary action in the footer.
- Choosing the other sample opens the existing confirmation dialog. Cancel restores the select to the active sample. Confirm replaces the item state, clears `hoot-demo-store-run-v1`, clears queue search, returns to the dashboard, and announces the loaded sample.
- **Reset demo** restores the active sample, not always the starter. Its confirmation copy names the active sample.
- `<body data-sample="starter|busy">` is set on render as a stable QA hook for tests and critique tooling.

## Tests

- **Unit tests** for the sample module: unique IDs, name uniqueness, counts, category coverage, purchase ordering, no future dates, createdAt ordering, maturity coverage, one-time coverage, and the exact zone spread.
- **Playwright** coverage: switch to the busy household through the footer, confirm, assert queue and one-time counts, `data-sample`, no horizontal overflow at 1440, 980, 390, and 320; reset while busy restores the busy sample. This is one focused test, not a second full suite.
- Existing Playwright tests continue to run against the starter default. Tests that need an exact rhythm should seed their own state, as several already do.
- Documentation will state that layout, density, overflow, and critique passes must inspect both samples, and that regression work should keep the starter assertions meaningful.

## Documentation

- `AGENTS.md`: a **Demo samples** section with the two samples, switching instructions, QA hook, and the requirement to test both for layout/critique work.
- `DESIGN.md`: footer composition and the sample select as a secondary control.
- `docs/ux-flows.md`: sample-switch states, confirmation, reset behavior.
- `README.md` and `PRODUCT.md`: mention the switchable sample as part of the demo's current shape.
- This design doc.

## Risks and Open Questions

- The busy dashboard will be very tall. That is the point; vertical length must not be "fixed" in this change. Horizontal overflow is still a defect.
- Regression-based predictions can drift from the naive last-plus-gap guess. The zone spread will be verified by executing the dataset against `predictionFor` and tuning gaps before tests assert the spread.
- Twenty-two run-eligible rows at once may expose shopping-run issues. This change does not redesign the run; it only makes the problem visible.
- The busy sample is demo data, not a performance benchmark. Rendering time is not a goal here.

## Acceptance

- A first visit still shows the starter household; all existing tests pass unchanged.
- The busy household is reachable from the footer, contains 44 items with deep histories, all four zones, and the learning/one-time coverage above.
- Switching and resetting preserve the expected sample and clear the shopping-run session.
- Both samples are documented for agents, tests, and critiques.
