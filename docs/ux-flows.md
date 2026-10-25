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

1. Return context is preserved.
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

- Mutations show a polite success toast. Purchase feedback names the item, quantity, total price or “price unknown,” and updated next estimate; delete adds a short-lived Undo action.
- Validation and empty-state recovery are inline.
- Error copy names what failed and what to do next.
- Color never carries status alone.

## Acceptance criteria

- A user can complete Add Item, Log Purchase, one-time toggle, and item detail navigation with keyboard only.
- Focus starts on the first useful dialog control and returns to the trigger after close.
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
- The **Next up** decision appears before the compact ranked queue, and the queue appears before the seven-day schedule.
- The restock calendar defaults to seven days, expands to fourteen on request, and keeps its caption and accessible label in sync.
- The populated dashboard has exactly one primary action: **Log purchase** on the **Next up** item.
- The Today marker sits at the Overdue/Buy-now boundary, 33.333% of the lane.
- Exact duplicate names are rejected with a field-level recovery message.
- On phones, the action dock is hidden while the **Next up** card is visible and does not cover the first queue action.
- Dynamic headings are sequential: dashboard and one-time empty states use `<h2>` beneath an `<h1>`; queue rows use `<h3>` beneath the focused `<h2>`; item detail uses `<h1>`, then `<h2>`, then `<h3>`.
- Rendered text meets AA contrast in the checked dashboard, item-detail, one-time, and dialog states (4.5:1 normal text, 3:1 large text).
- The calendar caption fits without a one-word orphan at 390px.
- Delete can be undone from the confirmation toast before it disappears.
- Reset demo is visible, restores the built-in sample, and remains at least 44px tall on phones.
- The interface remains usable at 1440, 980, and 390px.
- No page-level horizontal overflow occurs; only the schedule viewport may scroll horizontally.
