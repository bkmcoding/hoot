# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary user:** One person or household shopper managing recurring pantry and household consumables who wants fewer forgotten staples and fewer accidental duplicate purchases.
- **Context of use:** Quick mobile or desktop check-ins at home, in the kitchen/pantry, or standing in a store aisle.
- **Primary job:** See what is running low or due next, and log a purchase in seconds without manual stocktaking.

## Product Purpose

Hoot is a predictive household inventory tracker for people who want a shopping list that writes itself. Instead of demanding that users constantly count units, remember what is low, or maintain manual lists, Hoot records purchases, learns each staple's consumption rhythm, and quietly predicts the next restock date.

## Positioning

Unlike manual shopping list apps that require active memory and maintenance before items run out, or complex inventory management software requiring tedious stock increment/decrement, Hoot models an item's purchase log as a discrete time series to project restock intervals automatically with zero daily inventory bookkeeping.

## Operating Context

- Household environments where high-friction data entry leads to abandoned tracking.
- Fast, low-attention interactions: checking upcoming needs before shopping or logging a receipt/purchase immediately after buying.
- Natural divide between recurring staples (milk, eggs, paper towels, soap) with learnable purchase frequencies, and irregular one-time purchases (birthday candles, light bulbs) that must not contaminate statistical predictions.

## Capabilities and Constraints

- **Confirmed capabilities:**
  - Tracked recurring items with category, unit, and threshold settings.
  - Interval-based prediction engine: initial fallback to manual restock threshold until 3 purchase logs exist, switching to interval learning / regression once sufficient history is accumulated.
  - Urgency-ranked restock dashboard with a focused Next Up horizon lane.
  - Horizon schedule calendar with default 7-day view and expandable 14-day view.
  - Item detail view featuring a next-restock answer with a likely window, a buying-rhythm ledger of purchases and gaps, plain-language confidence and spending detail, and inline purchase editing.
  - Dedicated one-time checklist for irregular items explicitly excluded from prediction algorithms.
  - Prediction checks: an optional one-tap **Was Hoot right?** review on the finish receipt, plus **Still have some** on an overdue **Next up**, both of which correct a false estimate without creating a purchase.
  - Two switchable built-in demo samples: a six-staple starter household for first-run clarity, and a 38-staple, six-one-time-need busy household with deep purchase histories for judging scale, density, and scanning.
- **Technical constraints & scope:**
  - Current implementation: Standalone client-side web application (vanilla JavaScript, HTML5, CSS3) backed by localStorage and local sample seed data.
  - Planned backend: ASP.NET Core Web API with PostgreSQL database via Entity Framework Core, transitioning prediction logic server-side.
  - Optional future capabilities: Barcode lookup (Open Food Facts / UPCitemdb integration), household sharing, and price trend analysis.
  - Current constraints: No authentication or external network dependencies in the current client demo.

## Brand Commitments

- **Name:** Hoot.
- **Voice & Tone:** Calm, tactile, quiet, and wise — like an owl observing the pantry.
- **Visual identity commitments (from DESIGN.md):** "Warm Ledger" aesthetic — warm cream paper canvas, understated earth inks (sage, terracotta, amber, night), crisp hairline borders, tabular numerals, and deliberate restraint.
- **Strict identity bans:** No cartoon or mascot owl illustrations, no dark mode / night theme, no glowing gradients or decorative novelty charts, and no ungrounded cosmetic badges.

## Evidence on Hand  - `frontend/` — runnable client prototype (`index.html`, `app.js`, `style.css`) with interactive dashboard, purchase logging, item timelines, and one-time checklist.
- `frontend/demo-data.js` — deterministic starter and busy household samples; the busy sample is the scale reference for layout and critique work.
- `PRODUCT.md`, `DESIGN.md`, `docs/ux-flows.md`, and `docs/tooling-roadmap.md` — product, visual, interaction, and roadmap contracts.
- `AGENTS.md` — the short context map future agents should read first.
- `backend/` — ASP.NET Core API scaffold (`HootApi.csproj`, `Program.cs`, controller stubs).

## Product Principles

1. **Quiet observation over manual bookkeeping:** Restock rhythms are learned from simple purchase logs; never force users to do tedious inventory counts or daily list maintenance.
2. **Running estimates, not false promises:** Predictions represent mathematical projections with explicit confidence and uncertainty horizons, not rigid expiration dates.
3. **Prioritize the next immediate decision:** Surface what needs attention right now (overdue or due in the next 1-3 days) before presenting lower-urgency staples.
4. **Deliberate isolation of irregular purchases:** Strictly separate learnable household staples from one-off supplies to prevent skewed restock rhythms.

## Accessibility & Inclusion

- Follows WCAG 2.1 AA contrast and accessibility requirements.
- Dual-coding for all statuses: color is never the sole communicator of urgency (every status pairs distinct text, rail accents, and semantic tokens).
- High-contrast, touch-friendly interactive targets (46px input fields, 48px touch targets on mobile).
- Semantic HTML throughout (`<dialog>`, `<main>`, `<nav>`, `<button>`) with clear ARIA labels and full keyboard navigation.
- Tabular numerals for dense dates, prices, intervals, and quantities.
