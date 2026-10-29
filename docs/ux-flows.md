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
- **Learning:** item detail names the learning progress and typical-interval source.
- **Learned:** item detail names confidence and keeps technical details behind a disclosure.
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

- **Typical:** a seven-day horizontally scrollable schedule strip.
- **Fourteen-day:** the **All 14 days** control expands the strip; the caption and calendar label follow the selection.
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

1. Choose **Tracked staple** or **One-time need**.
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

A shopper wants to inspect one item’s prediction, rhythm, history, and maintenance actions.

### Entry points

- Dashboard item name or Details
- Restock schedule item
- One-time item Details

### Sequence

1. Return context is preserved; the page opens at the top with focus on the item heading.
2. Read status, predicted restock, and the zone-aware horizon lane.
3. Inspect rhythm, confidence, and the estimate explanation.
4. Compare purchase history.
5. Log a purchase, edit, or delete the item.

### States

- **Typical:** the horizon lane, prediction, rhythm, chart, and history are separate work areas.
- **Learning:** the typical interval, learning progress, and confidence are visible.
- **Learned:** confidence, estimate source, interval range, and technical disclosure are visible.
- **No history:** the table says no purchase history exists.
- **One-time:** prediction is intentionally off and the item remains checklist-only.
- **Delete:** requires confirmation, names the consequence, and offers Undo for a few seconds afterward.

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
- **Exit run** returns to Dashboard without clearing the cart; **Finish shopping run** opens the receipt.

### Sequence

1. Start the run. Hoot hides the global header and footer so the aisle list owns the screen, and moves focus to the **Shopping run** heading so keyboard and screen-reader users land in the new context.
2. Scan aisle groups; each group is sorted by urgency: Overdue, Buy now, Watch when included, then One-time.
3. Tap **Add** once on an item. The item joins the cart and its row collapses to **In cart**.
4. Use **Show Watch** when planned purchases should be included. Hoot includes Watch automatically when the dashboard's **Next up** item is in Watch.
5. Review quantity, price, and the next restock estimate in the cart; use **Adjust** or **Undo** to correct a checkoff.
6. Tap **Finish shopping run** to review the receipt, then **Done** to return to Dashboard or **View purchase history** to inspect the first tracked item.
7. **Exit run** leaves the cart intact for later.

### Content contract

- The run drafts tracked staples in **Overdue** or **Buy now**, plus every uncompleted one-time need. If the dashboard's **Next up** item is in **Watch**, a fresh run includes Watch so the two surfaces agree.
- **Watch** staples otherwise appear after **Show Watch** is pressed; the toggle reports its state with `aria-pressed` and is named **Hide Watch items** when active.
- Groups are categories, sorted alphabetically; items inside a group sort by urgency, then name. Items without a category fall under **Uncategorized**.
- Each unchecked row shows name, category, unit, status, and due text, with one primary **Add** action.
- A checked row collapses to a compact **In cart** line: a check mark, the item name, and no status chip or action. Quantity, price, and prediction details live in the cart.
- Checkoff feedback is in place, not in a toast: the row collapses, the summary changes, and a polite live region names the item and cart count so the finish action stays clear.
- The empty cart says Add saves immediately and Undo reverses it; it does not imply that the run defers the purchase until Finish.
- The summary is one compact strip: **Items**, **In cart**, and **Left** for the current run, including checked items that no longer match the default draft.
- The cart lists each checked item with its quantity, total price (or **Price unknown**), and **Next restock** date. **Adjust** opens the purchase editor for a tracked staple and the item editor for a one-time need.
- **Finish shopping run** is disabled while the cart is empty. The receipt names the item count, total known spend, and every checked-off item. **Done** clears the run and returns to Dashboard; **View purchase history** clears the run and opens the first tracked item; closing the receipt with Escape or the close button leaves the run intact.
- The run session — Watch toggle and checked items — persists separately from inventory and survives a reload. A finished run clears it.
- Completed one-time items and steady tracked staples do not appear.
- Hoot has one trip flow: the legacy **Restock trip** modal is retired.

### States

- **Immersive:** the global header and footer are hidden, the run title and **Exit run** stay at the top, and **Finish shopping run** closes the list at the bottom.
- **Typical:** eligible items grouped by aisle, an empty-cart explanation, and a compact summary.
- **In cart:** the row collapses to a sage **In cart** line, and the cart gains quantity, price, next-restock detail, **Adjust**, and **Undo**.
- **Watch included:** Watch staples join their aisles in urgency order; hiding them removes only those that are still unchecked.
- **One-time checked:** the item is completed in the checklist and appears in the cart as a one-time entry.
- **Empty run:** when nothing is eligible, the summary reads zero, the cart explains what will appear, and Finish is disabled.
- **Receipt:** a native dialog summarizes the trip without blocking another checkoff until Done is chosen.
- **Storage unavailable:** the in-memory run still works; only reload persistence is lost.
- **Failure:** a failed checkoff or undo leaves the run unchanged and shows an error toast naming the item.

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
- Add Item progressively discloses only the fields required by the selected path.
- Global **Add item** follows the active view: tracked staple on Dashboard, one-time need on One-time.
- Global **Log purchase** opens with the highest-urgency tracked item.
- Queue search filters tracked items by name, category, or unit, keeps the global **Next up** decision visible, labels matches as results, names the query in the count, and offers a clear no-match recovery.
- **Log last** prefills the focused item’s latest quantity and a known, non-zero total price while keeping the date at today.
- Total price is optional; blank or `0` stores an unknown price, and history and success feedback say so plainly.
- Item titles show a persistent interactive underline, provide an expanded pointer target, and remain backed by explicit **Details** buttons.
- Item detail renders the same zone-aware horizon lane as **Next up**; its active segment matches the item’s status, while Today remains fixed at the Overdue/Buy-now boundary.
- Item detail opens at the top with focus on the item heading; on phones, the purchase-history Edit and Delete actions remain fully visible.
- The **Next up** decision appears before the compact ranked queue, and the queue appears before the seven-day schedule.
- The restock calendar defaults to seven days, expands to fourteen on request, and keeps its caption and accessible label in sync. Day cards show the weekday and date once, adding a month label only on the first card and at month boundaries.
- The Dashboard content has exactly one primary action: **Log purchase** on the **Next up** item. The header and mobile dock carry **Start shopping run** as the job-level primary action.
- The Today marker sits at the Overdue/Buy-now boundary, 33.333% of the lane.
- Exact duplicate names are rejected with a field-level recovery message.
- On phones, the action dock stays reachable with **Start shopping run**, **Log purchase**, and **Add item**; the run title spans the first dock row and the two utility actions share the second. The dock hides while **Next up** is visible and returns once the card leaves the viewport, so it never covers the card or its actions.
- Dynamic headings are sequential: dashboard and one-time empty states use `<h2>` beneath an `<h1>`; queue rows use `<h3>` beneath the focused `<h2>`; item detail uses `<h1>`, then `<h2>`, then `<h3>`; Shopping run uses `<h1>`, then `<h2>`.
- Rendered text meets AA contrast in the checked dashboard, item-detail, one-time, Shopping run, and receipt states (4.5:1 normal text, 3:1 large text).
- The calendar caption fits without a one-word orphan at 390px.
- Delete can be undone from the confirmation toast before it disappears.
- Reset demo is visible, restores the built-in sample, and remains at least 44px tall on phones.
- The interface remains usable at 1440, 980, and 390px.
- No page-level horizontal overflow occurs; only the schedule viewport may scroll horizontally.
