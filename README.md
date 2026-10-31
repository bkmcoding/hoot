# hoot
## Hoot

Hoot is a standalone front-end demo for a predictive household inventory tracker. It learns each item’s restock rhythm from purchase history and surfaces the next likely restock date.

### Run the demo

```bash
cd frontend
python -m http.server 8000
```

Open `http://127.0.0.1:8000` in a browser.

### Current demo

- Ranked dashboard with a focused Restock Horizon Lane
- Seven-day restock calendar with a two-column phone layout and an optional fourteen-day view
- Add item and log purchase flows
- Item detail page with a next-restock answer and likely window, a buying-rhythm ledger, confidence and spending detail, and inline purchase editing
- One-time checklist for irregular purchases
- Immersive Shopping run with aisle grouping, one-tap logging, compact trip detail, and a finish receipt
- Optional post-trip **Was Hoot right?** check that moves the next estimate when you still had some
- Local demo data with reset

### Quality and tooling

```bash
npm install
npm test                 # design tokens, prediction harness, and browser accessibility/overflow checks
npm run audit:lighthouse  # generate a local Lighthouse report in .quality/
```

The same gate runs in GitHub Actions on `main` and pull requests.

See `docs/tooling-roadmap.md` for the prioritized tooling and product direction notes. For the authoritative project-context map, start with `AGENTS.md`.

### Future features

- Barcode scanning and product lookup
- Prediction drift reporting across the full history
- Household sharing
- Price trends
- Smart reminders

See `PRODUCT.md` and `DESIGN.md` for the product and design context.
