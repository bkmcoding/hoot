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
  Household-facing assessment of model reliability based on sample size and variance (e.g. *High confidence*, *Learning rhythm*).
- **Rhythm Engine**
  Ordinary Least Squares (OLS) linear regression fitted across cumulative purchase dates, with automatic fallback to average interval when variance or slope inversion occurs.

---

## 3. Shopping & Acquisition

- **Shopping Run**
  An immersive purchasing session combining auto-drafted Tracked Staples (Overdue / Buy Now, plus Watch when relevant) and open One-time Needs into one aisle-grouped list. It is the single trip flow; the old batch **Restock trip** modal is retired.
- **Shopping Run Mode**
  The distraction-free state of the app while a Shopping Run is active: global navigation and chrome recede, the run title and **Exit run** stay at the top, and the finish action closes the list. Optimized for one-handed aisle use.
- **Check-off Restock**
  The atomic action during an in-store run where tapping an item records it as purchased with default quantities, updates regression projections, and moves the item to the cart. The aisle row then collapses to a compact **In cart** line.
- **Finish Receipt**
  The end-of-run dialog that names the number of items checked off, known spend, and each item. **Done** clears the run; **View purchase history** opens the first tracked item; dismissing the receipt leaves the run active.
- **Aisle / Category Bucket**
  Logical grouping of items (e.g., *Produce*, *Dairy & Refrigerated*, *Pantry*, *Household & Paper*, *Personal Care*) arranged to match supermarket layouts and minimize physical backtracking.
- **Cart Summary**
  The run's compact **Items**, **In cart**, and **Left** strip, backed by a cart list that carries each item's quantity, total price, and next restock estimate.
- **Log Last Accelerator**
  A zero-friction shortcut that prefills a restock with today's date and the most recent quantity and known price.
