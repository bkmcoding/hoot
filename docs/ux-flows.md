# Hoot UX flow contracts

## Dashboard

### Job

A shopper wants to know which household staples need attention now and which ones can wait.

### Entry points

- Brand link
- Primary navigation
- Returning to the app

### Sequence

1. Read the focused **Next up** decision.
2. Search the queue by name, category, or unit when looking for a specific staple.
3. Scan the compact ranked queue.
4. Check the quiet inventory summary.
5. Select an item or log a purchase.
6. Use the next-seven-day schedule, or expand it to fourteen days when a wider view is needed.

### Content contract

- **Tracked items:** all recurring staples.
- **Needs attention:** predictions due within three days.
- **Learned rhythm:** items with enough purchase history for Hoot to predict from it.
- **One-time:** checklist items excluded from prediction.
- The **Next up** item shows name, category/unit, predicted date, due text, status, the full horizon lane, and one primary **Log purchase** action. If it has purchase history, it also offers **Log last**.
- Remaining queue rows show name, status, predicted date, and secondary actions.
- Queue search matches tracked items by name, category, or unit.
- The global **Next up** decision stays visible during search; matching rows appear under a **Search results** heading with a count that names the query.

### States

- **Typical:** the highest-urgency item becomes the focused **Next up** decision; remaining items sort by predicted restock date as compact rows.
- **Search:** the global **Next up** card stays in place. Matching rows render as compact results, the count names the query, and a sole focused-item match is called out instead of duplicated. No matches keep the focused card and offer **Clear search**.
- **Empty:** no tracked items; the state explains prediction cannot start and offers Add item.
- **Learning:** item detail names the user's typical interval and how many purchases remain before Hoot uses real gaps.
- **Learned:** item detail names the average gap between purchases.
- **Overdue:** status, due text, and predicted date make the risk explicit.

## Restock schedule

### Job

A shopper wants a near-term view of when items are expected to run out, with the option of a fourteen-day range.

### Entry points

- Dashboard, immediately after the ranked queue.

### Sequence

1. Scan today and the next six days.
2. Read the item names and due text.
3. Expand to all fourteen days when a wider view is needed.
4. Select an item to inspect its rhythm.

### States

- **Typical:** a seven-day schedule in a responsive grid: four columns at tablet and small-desktop widths, two columns at 660px and below, and seven or eight columns above 1120px. No day requires horizontal scrolling.
- **Fourteen-day:** the **All 14 days** control expands the grid; fourteen days wrap to two rows on wide desktop, four rows at tablet widths, and eight rows at phone widths. The caption and calendar label follow the selection.
- **Today:** green border and calm steady tint.
- **Past due:** a dedicated first cell names the number of overdue items.
- **Clear day:** the cell says “Clear”.
- **Empty:** the schedule explains that a tracked item is required.

## Add Item

### Job

A household shopper wants to start tracking a staple or record a one-time need without interpreting a complex form.

### Entry points

- Header / mobile dock: **Add item**
- Header / mobile dock behavior: **Add item** opens as a tracked staple on Dashboard and as a one-time need on One-time.
- Dashboard empty state
- One-time empty state, for one-time creation

### Sequence

1. Choose **Tracked staple** or **One-time need**. The checked path owns initial focus, so a one-time entry starts on **One-time need**.
2. Name the item.
3. Choose a category.
4. Optionally describe the unit.
5. For a tracked staple, set the typical restock interval.
6. Save.

### Field contract

| Field | Requirement | Notes |
| --- | --- | --- |
| Name | Required | Must not be blank |
| Category | Required | Chooses the closest household area |
| Unit | Optional | Example: `half-gallon`, `roll`, `tube` |
| Item type | Required | **Tracked staple** or **One-time need** |
| Typical restock interval | Required for tracked items | Whole days from 1 to 365 |

### States

- **Idle:** fields use sensible defaults and calm hints.
- **Tracked staple:** name, category, unit, and the typical interval are visible.
- **One-time need:** name, category, and unit are visible; the interval field is hidden.
- **Duplicate name:** exact names, ignoring case and surrounding spaces, are rejected with a field-level recovery message. Tracked duplicates suggest logging a purchase instead.
- **Invalid:** the failing field receives `aria-invalid`, field-level recovery text, and focus.
- **Busy:** form sets `aria-busy`, submit says “Adding…”, and repeated submits are prevented.
- **Success:** the dialog says “Saved.”, closes, the app updates, and focus returns to the trigger.
- **Empty:** not applicable; the form always offers a valid starting path.

## Log Purchase

### Job

A shopper wants to record what was bought in a few seconds so Hoot can keep learning the restock rhythm.

### Entry points

- Header / mobile dock: **Log purchase**
- Header / mobile dock default: opens with the highest-urgency tracked item.
- Dashboard item action
- Dashboard **Next up → Log last**, when purchase history exists
- Item detail action

### Sequence

1. Choose a tracked item.
2. Confirm the purchase date.
3. Enter quantity.
4. Enter the total price if it is known.
5. Save.

**Log last** skips re-entry: the focused item is selected, the date remains today, and the most recent quantity and a known, non-zero total price are prefilled for review before saving. If the latest price is unknown, the price field stays blank.

### Field contract

| Field | Requirement | Notes |
| --- | --- | --- |
| Item | Required | Only tracked, non-one-time items are eligible |
| Date | Required | Today or earlier |
| Quantity | Required | Greater than zero; decimals allowed |
| Total price | Optional | Blank or `0` means unknown; total paid, not per unit; negative values are invalid |

### States

- **Idle:** item is full-width; date, quantity, and total price use a stable three-column grid. A new purchase starts with a blank price.
- **Log last:** the latest quantity and a known, non-zero total price are prefilled; the shopper can still change every field before saving.
- **No tracked items:** fields hide, an inline empty state explains the blocker, and submit is disabled.
- **Invalid:** the failing field receives `aria-invalid`, field-level recovery text, and focus.
- **Busy:** form sets `aria-busy`, submit says “Logging…”, and repeated submits are prevented.
- **Success:** the dialog says "Saved.", closes, purchase data updates, a toast names the item, quantity, total price or “price unknown,” and updated next estimate, and focus returns to the trigger.

## One-time items

### Job

A shopper wants a simple checklist for irregular purchases that should not affect prediction.

### Entry points

- Primary navigation
- One-time heading: **Add one-time item**
- Add Item with **One-time need** selected

### Sequence

1. Scan active items first.
2. Check off an item after buying it.
3. Restore an item if it is needed again.
4. Open details when needed.

### States

- **Typical:** active items sort alphabetically before completed items.
- **Completed:** remains visible, muted, and struck through.
- **Restored:** returns to the active group and receives a success toast.
- **Empty:** explains that one-time items are excluded from prediction and offers Add a one-time item.

## Item detail

### Job

A shopper wants to know when one item is needed again, see why Hoot thinks so, and correct its history.

### Entry points

- Dashboard item name or Details
- Restock schedule item
- One-time item Details
- Direct URL `#/item/<id>`

### Sequence

1. Hoot writes `#/item/<id>` and opens the page at the top with focus on the item heading.
2. Read the **Next restock** answer: date, due phrase, status, likely window when available, and one plain sentence explaining the estimate.
3. Follow the **Buying rhythm** ledger: each purchase is a node with quantity, price, and unit price; the line between nodes carries the measured gap and, once learned, how it compares with the typical gap.
4. Check **Pattern**, **Confidence**, and **Spending** — including the compact unit-price history when two or more prices are known — or expand **How Hoot got this date** for the estimate’s basis.
5. Edit or delete a purchase directly in its ledger node.
6. **Log purchase** is the page’s single primary action; **Edit item** and **Delete** close the page.

### States

- **Typical:** the answer card, rhythm ledger, and reference rail are separate work areas; the answer card carries the only primary action.
- **Learning:** the answer says how many purchases remain before Hoot uses real gaps; **Pattern** separates **Gap so far** from the **Estimate uses** interval; **Confidence** names the sample and basis.
- **Learned:** the answer states the likely window; **Pattern** labels the average as **Typical gap**, and each ledger gap says whether it was shorter or longer than typical.
- **Checked:** **Your checks** counts right and still-had-some answers; a **Still had some** correction adds three days, and the estimate node says the extra days.
- **No history:** the ledger explains there is nothing to chart yet and offers the first purchase as the next step.
- **One purchase:** the ledger shows the purchase and the estimate with no measured gap line; **Pattern** shows **Gap so far** as **Not yet**.
- **Unknown price:** the ledger and **Spending** say the price is unknown; known spend and averages count only purchases with a price.
- **Price history:** two or more known prices draw a compact unit-price sparkline on the purchase dates. Each point is a labeled button, tapping the plot selects the nearest price, and Tab moves through points while the readout names the selected date and unit price. One known price keeps the numbers only; unknown prices are skipped rather than interpolated.
- **One-time:** prediction is intentionally off; the page shows **On your checklist** instead of an answer, ledger, rail, and spending.
- **Delete:** requires confirmation, names the consequence, and offers Undo for a few seconds afterward.
- **Back:** the in-page back control replaces the item entry with its parent view. Browser Back returns to the previous Hoot surface; a direct link falls back to Dashboard or One-time.

## Edit item

### Job

A shopper wants to correct an item’s name, category, unit, or typical restock interval.

### Entry points

- Item detail action.

### States

- **Idle:** current values are prefilled.
- **One-time:** the typical restock interval remains disabled.
- **Invalid:** name and typical restock interval receive field-level recovery text and focus.
- **Success:** the dialog closes and the item updates.

## Shopping run

### Job

A shopper standing in an aisle wants one grouped list of everything to buy, a one-tap way to check each item off, and a clear close to the trip.

### Entry points

- Header and mobile dock: **Start shopping run**
- Primary navigation: **Shopping** (the run view itself is titled **Shopping run**)
- **Exit run** returns to Dashboard without clearing this trip; **Finish shopping run** opens the receipt.

### Sequence

1. Start the run. Hoot hides the global header and footer so the aisle list owns the screen, resets the page to the top, and moves focus to the **Shopping run** heading without scrolling so keyboard and screen-reader users land in the new context.
2. Scan aisle groups in the aisle column; each group is sorted by urgency: Overdue, Buy now, Watch when included, then One-time.
3. Tap **Log** once on an item. Hoot records the purchase or checks off the one-time need immediately, and the row collapses to **Logged**.
4. Use **Show Watch** when planned purchases should be included. Hoot includes Watch automatically when the dashboard's **Next up** item is in Watch.
5. Review quantity, price, and the next restock estimate in **This trip**; on desktop the trip panel stays in view beside the aisles, and at 980px and below it follows them. Use **Adjust** or **Undo** to correct a log.
6. Tap **Finish shopping run** to review the receipt. On each logged tracked staple, answer the optional **Was Hoot right?** check, then choose **Done** to return to Dashboard or **View purchase history** to inspect the first tracked item.
7. **Exit run** leaves **This trip** intact for later.

### Content contract

- The run drafts tracked staples in **Overdue** or **Buy now**, plus every uncompleted one-time need. If the dashboard's **Next up** item is in **Watch**, a fresh run includes Watch so the two surfaces agree.
- **Watch** staples otherwise appear after **Show Watch** is pressed; the toggle reports its state with `aria-pressed` and is named **Hide Watch items** when active.
- Groups are categories, sorted alphabetically; items inside a group sort by urgency, then name. Items without a category fall under **Uncategorized**.
- Each unchecked row shows name, category, unit, status, and due text, with one primary **Log** action.
- A logged row collapses to a compact **Logged** line: a check mark, the item name, and no status chip or action. Quantity, price, and prediction details live in **This trip**.
- Logging feedback is in place, not in a toast: the row collapses, the summary changes, and a polite live region names the item and logged count so the finish action stays clear.
- The empty **This trip** panel says Log saves immediately and Undo reverses it; it does not imply that the run defers the purchase until Finish.
- The summary is one compact strip: **Items**, **Logged**, and **Left** for the current run, including logged items that no longer match the default draft.
- At 981px and wider, the summary and aisle list share the left column while a sticky **This trip** panel holds the right column; the panel stays in view as the aisles scroll, its list scrolls internally when the trip is long, and **Finish shopping run** stays at its foot.
- **This trip** lists each logged item with its quantity, total price (or **Price unknown**), and **Next restock** date. **Adjust** opens the purchase editor for a tracked staple and the item editor for a one-time need.
- **Finish shopping run** is disabled while **This trip** is empty. The receipt names the item count, total known spend, and every logged item. **Done** clears the run and returns to Dashboard; **View purchase history** clears the run and opens the first tracked item; closing the receipt with Escape or the close button leaves the run intact.
- The receipt asks one optional prediction check per logged tracked staple: **Due <date> · was Hoot right?**, answered with **Yes, I was out** or **Still had some**. One-time entries never ask. **Still had some** records the miss on that purchase and moves the next estimate three days later, naming the new date in place; **Yes, I was out** records agreement and leaves the estimate unchanged. The selected answer stays pressed and can be changed until **Done**. A polite live region names the answer and the new estimate.
- The run session — Watch toggle and logged items — persists separately from inventory and survives a reload. A finished run clears it.
- Completed one-time items and steady tracked staples do not appear.
- Hoot has one trip flow: the legacy **Restock trip** modal is retired.

### States

- **Immersive:** the global header and footer are hidden, the run title and **Exit run** stay at the top, and **Finish shopping run** closes the list at the foot of **This trip**. At 981px and wider the trip panel is sticky beside the aisle list; at 980px and below the summary, aisles, and trip stack in one column.
- **Typical:** eligible items grouped by aisle, an empty-trip explanation, and a compact summary.
- **Logged:** the row collapses to a sage **Logged** line, and **This trip** gains quantity, price, next-restock detail, **Adjust**, and **Undo**.
- **Watch included:** Watch staples join their aisles in urgency order; hiding them removes only those that are still unchecked.
- **One-time checked:** the item is completed in the checklist and appears in **This trip** as a one-time entry.
- **Empty run:** when nothing is eligible, the summary reads zero, **This trip** explains what will appear, and Finish is disabled.
- **Receipt:** a native dialog summarizes the trip without blocking another log until Done is chosen. Each logged tracked staple carries an optional **Was Hoot right?** check; answering **Still had some** updates the next estimate in place, and the answer is stored on the purchase whether or not history is opened.
- **Storage unavailable:** the in-memory run still works; only reload persistence is lost.
- **Failure:** a failed log or undo leaves the run unchanged and shows an error toast naming the item.

## Reset demo and destructive actions

### Job

A user wants a safe way to restore sample data or remove an item.

### Rules

- Both reset and delete require confirmation.
- The confirmation names what will be lost.
- Delete confirms the specific item.
- Reset confirms that local changes will be cleared.
- Cancel is always available before the action runs.
- Delete shows a success message with **Undo**; selecting it restores the item and confirms restoration.
- Reset demo is visible in the header utility and restores the built-in sample.

## Global feedback

- Outside the Shopping run, mutations show a polite success toast. Purchase feedback names the item, quantity, total price or “price unknown,” and updated next estimate; delete adds a short-lived Undo action. The run uses an in-place live-region announcement instead so toasts do not cover the aisle list or finish action.
- Validation and empty-state recovery are inline.
- Error copy names what failed and what to do next.
- Color never carries status alone.

## Acceptance criteria

- A user can complete Add Item, Log Purchase, one-time toggle, item detail navigation, and a Shopping run with keyboard only.
- Entering Shopping run moves focus to its heading; **Exit run** returns focus to the Dashboard nav. Focus starts on the first useful dialog control and returns to the trigger after close.
- Every validation message is associated with its field.
- Every empty state explains the blocker and the next step.
- One-time behavior and total-price meaning are visibly explained.
- Add Item progressively discloses only the fields required by the selected path and opens with focus on the checked item-type path, including **One-time need** when launched from the one-time ledger.
- Global **Add item** follows the active view: tracked staple on Dashboard, one-time need on One-time.
- Global **Log purchase** opens with the highest-urgency tracked item.
- Queue search filters tracked items by name, category, or unit, keeps the global **Next up** decision visible, labels matches as results, names the query in the count, and offers a clear no-match recovery.
- **Log last** prefills the focused item’s latest quantity and a known, non-zero total price while keeping the date at today.
- Total price is optional; blank or `0` stores an unknown price, and history and success feedback say so plainly.
- Item titles show a persistent interactive underline, provide an expanded pointer target, and remain backed by explicit **Details** buttons.
- Item detail leads with one **Next restock** card (date, due, likely window when available, plain reason, one primary **Log purchase**), then a **Buying rhythm** ledger with one node per purchase, a labeled gap between nodes, and a distinct estimate node, plus a reference rail with **Pattern**, **Confidence**, **Spending**, and **Your checks**; it does not repeat the dashboard horizon lane or a separate purchase-history table.
- **Spending** draws a unit-price sparkline when at least two known prices exist and omits it for a single price; each point is a labeled button, tapping the plot selects the nearest price, and the keyboard reaches every point with its date and unit price in the visible readout.
- At 661–980px the item reference rail uses two columns so the unit-price sparkline stays compact; below 661px it returns to one column.
- Item detail writes `#/item/<id>`; browser Back and Forward move between Hoot surfaces instead of leaving the app, and the in-page back control replaces the item entry with its parent view.
- Item detail opens at the top with focus on the item heading; the in-page back control moves focus to the destination primary navigation. On phones, the ledger’s Edit and Delete actions remain fully visible and the fixed dock stays hidden.
- Entering the Shopping run resets the page to the top before focus moves to its heading.
- At 981px and wider the desktop Shopping run puts the progress strip and aisle list beside a sticky **This trip** panel with the finish action at its foot; at 980px and below the run stacks the summary, aisles, and trip without horizontal overflow.
- The **Next up** decision appears before the compact ranked queue, and the queue appears before the seven-day schedule.
- Until an item has three purchases, the **Next up** card names **Learning**, its purchase progress, and the manual interval source; its date heading reads **Estimated restock**.
- The restock calendar defaults to seven days, expands to fourteen on request, and keeps its caption and accessible label in sync. Day cards show the weekday and date once, adding a month label only on the first card and at month boundaries. It is a responsive grid at every width, with no horizontal scrolling: four columns at tablet and small-desktop widths, two columns at 660px and below, and seven or eight columns above 1120px.
- The Dashboard content has exactly one primary action: **Log purchase** on the **Next up** item. The header and mobile dock carry **Start shopping run** as the job-level primary action.
- The Today marker sits at the Overdue/Buy-now boundary, 33.333% of the lane.
- Exact duplicate names are rejected with a field-level recovery message.
- On phones, the action dock stays reachable with **Start shopping run**, **Log purchase**, and **Add item**; the run title spans the first dock row and the two utility actions share the second. The dock hides while **Next up** is visible and returns once the card leaves the viewport, so it never covers the card or its actions.
- Dynamic headings are sequential: dashboard and one-time empty states use `<h2>` beneath an `<h1>`; queue rows use `<h3>` beneath the focused `<h2>`; item detail uses `<h1>` then `<h2>` section headings; Shopping run uses `<h1>`, then `<h2>`.
- Rendered text meets AA contrast in the checked dashboard, item-detail, one-time, Shopping run, and receipt states (4.5:1 normal text, 3:1 large text).
- The calendar caption fits without a one-word orphan at 390px.
- Delete can be undone from the confirmation toast before it disappears.
- Reset demo is visible, restores the built-in sample, and remains at least 44px tall on phones.
- The interface remains usable at 1440, 980, 390, and 320px.
- No page-level horizontal overflow occurs, and the schedule never scrolls horizontally.
