# Hoot Domain Glossary

Ubiquitous language for the Hoot household inventory and predictive restock system.

---

## 1. Inventory & Consumption

- **Tracked Staple**
  A recurring household consumable (e.g. Milk, Trash Bags, Dish Soap) whose inventory depletion and next restock date are mathematically projected using purchase history or a user-defined threshold.
- **One-time Need**
  An ad-hoc, non-recurring checklist item (e.g. Birthday Candles, Furnace Filter) that does not enter mathematical modeling and is removed or marked completed once bought.
- **Unit**
  The domestic metric of consumption (e.g., `40-count box`, `gallon`, `2-pack`, `bottles`).
- **Typical Interval**
  The user-defined baseline restock cadence (in days) used when fewer than 3 purchase events have been logged.
- **Buying Rhythm Ledger**
  The item-detail vertical timeline: one node per purchase with its quantity, price, and unit price, a labeled gap between nodes, and a distinct hollow estimate node. It is both the rhythm chart and the purchase history.

---

## 2. Predictive Modeling & Urgency

- **Prediction Horizon**
  A 21-day timeline scale spanning $-7$ days (past overdue) through $+14$ days (future steady state) used to visualize item depletion.
- **Urgency Zones**
  - **Overdue ($\le 0\text{d}$):** Projected depletion has passed. Immediate purchase required.
  - **Buy Now ($0\text{d} \dots 3\text{d}$):** Depletion is imminent within the next grocery cycle.
  - **Watch ($4\text{d} \dots 7\text{d}$):** Depletion approaching; candidate for opportunistic purchase if visiting that store.
  - **Steady ($\ge 8\text{d}$):** Well-stocked; no action needed.
- **Confidence Rating**
  Household-facing assessment of model reliability based on sample size and variance. The item page names the sample, measured gaps, gap range, and whether the estimate still uses the manual interval.
- **Gap Range**
  The longest measured gap minus the shortest. A small range supports a tighter likely window; a large range widens it and lowers the confidence label.
- **Known Spend**
  The sum of purchase totals that were actually recorded. Blank or `0` prices are unknown and excluded, so the page says **Known spend** rather than implying a complete total.
- **Unit Price**
  A purchase’s total price divided by its quantity, used to compare pack sizes across purchases (e.g. two half-gallons for $8.98 is $4.49 each).
- **Price History Sparkline**
  A compact line in **Spending** that plots known unit prices against their purchase dates. It skips unknown prices rather than interpolating them and appears only when at least two known prices exist. Each point is a labeled button: tapping the plot selects the nearest price, Tab reaches every point, and the card readout names the selected date and unit price.
- **Rhythm Engine**
  Ordinary Least Squares (OLS) linear regression fitted across cumulative purchase dates, with automatic fallback to average interval when variance or slope inversion occurs.

---

## 3. Shopping & Acquisition

- **Shopping Run**
  An immersive purchasing session combining auto-drafted Tracked Staples (Overdue / Buy Now, plus Watch when relevant) and open One-time Needs into one aisle-grouped list. It is the single trip flow; the old batch **Restock trip** modal is retired.
- **Shopping Run Mode**
  The distraction-free state of the app while a Shopping Run is active: global navigation and chrome recede, the run title and **Exit run** stay at the top, and the finish action closes the list. Optimized for one-handed aisle use.
- **Log Restock**
  The atomic action during an in-store run where tapping **Log** records the item as purchased with default quantities, updates regression projections, and marks it as logged in **This trip**. The aisle row then collapses to a compact **Logged** line.
- **Finish Receipt**
  The end-of-run dialog that names the number of items logged, known spend, and each item. **Done** clears the run; **View purchase history** opens the first tracked item; dismissing the receipt leaves the run active.
- **Prediction Check**
  An answer that tests Hoot’s restock estimate. The receipt offers **Was Hoot right?** on a logged purchase: **Yes, I was out** agrees, while **Still had some** marks it early and moves the next estimate three days later. An overdue **Next up** card offers **Still have some** instead, moving that estimate three days out from today without logging anything. Item detail keeps the active Next up correction visible after the toast with its recorded date and an **Undo correction** action that restores the check it replaced, and lists superseded receipt and Next up answers under **Earlier checks**. A check corrects the model only; it never creates or edits a purchase.
- **Aisle / Category Bucket**
  Logical grouping of items (e.g., *Produce*, *Dairy & Refrigerated*, *Pantry*, *Household & Paper*, *Personal Care*) arranged to match supermarket layouts and minimize physical backtracking.
- **Trip Summary**
  The run's compact **Items**, **Logged**, and **Left** strip, backed by **This trip**, which carries each item's quantity, total price, and next restock estimate.
- **Log Last Accelerator**
  A zero-friction shortcut that prefills a restock with today's date and the most recent quantity and known price.

---

## 4. Demo & Review

- **Demo Sample**
  One of the two built-in, date-relative datasets in `frontend/demo-data.js`. Exactly one is active; switching replaces local state and is confirmed.
- **Starter Household**
  The default six-staple, two-one-time sample used for first-run clarity and exact-value regression tests.
- **Busy Household**
  The 44-item scale sample (38 tracked staples, 6 one-time needs, 195 purchases) used for density, scanning, overflow, and critique passes. It spans all four urgency zones and includes learning and zero-history items.
