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
- Optional post-trip **Was Hoot right?** check, plus **Still have some** on an overdue Next up, both correcting an estimate without a purchase; item detail keeps an active correction for review and undo, with earlier checks kept for reference
- Two switchable local samples with reset: a six-staple starter household and a 44-item busy household

### Demo samples

The footer **Sample** select switches between two date-relative samples:

- **Starter household** — 6 tracked staples and 2 one-time needs. This is the default first-run sample.
- **Busy household** — 38 tracked staples and 6 one-time needs, with long purchase histories spread across every urgency zone. Use this one to judge density, scanning, and scrolling at household scale.

Switching replaces local data and clears the shopping-run session, so it asks for confirmation. **Reset demo** restores whichever sample is active. The active sample is mirrored on `document.body.dataset.sample` for tests and review tooling.

### Quality and tooling

```bash
npm install
npm test                 # design tokens, sample invariants, prediction harness, and browser checks
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
