# Hoot UX flow contracts

## Dashboard

### Job

A shopper wants to know which household staples need attention now and which ones can wait.

### Entry points

- Brand link
- Primary navigation
- Returning to the app

### Sequence

1. Scan the four-item operations summary.
2. Read the ranked restock queue.
3. Select an item or log a purchase.
4. Use the fourteen-day schedule when a wider view is needed.

### Content contract

- **Tracked items:** all recurring staples.
- **Needs attention:** predictions due within three days.
- **Established:** items with enough history for learned intervals.
- **One-time:** checklist items excluded from prediction.
- Each item shows name, category, unit, predicted date, due text, status, confidence, and next actions.

### States

- **Typical:** items sort by predicted restock date.
- **Empty:** no tracked items; the state explains prediction cannot start and offers Add item.
- **Learning:** manual threshold is named as the current source.
- **Learned:** interval method and confidence are named.
- **Overdue:** status, due text, and method make the risk explicit.

## Restock schedule

### Job

A shopper wants a fourteen-day view of when items are expected to run out.

### Entry points

- Dashboard, immediately after the ranked queue.

### Sequence

1. Scan today and the next thirteen days.
2. Read the item names and due text.
3. Select an item to inspect its rhythm.

### States

- **Typical:** one horizontally scrollable schedule strip.
- **Today:** green border and calm steady tint.
- **Past due:** a dedicated first cell names the number of overdue items.
- **Clear day:** the cell says “Clear”.
- **Empty:** the schedule explains that a tracked item is required.

## Add Item

### Job

A household shopper wants to start tracking a staple or record a one-time need without interpreting a complex form.

### Entry points

- Header / mobile dock: **Add item**
- Dashboard empty state
- One-time empty state, for one-time creation

### Sequence

1. Name the item.
2. Choose a category.
3. Optionally describe the unit.
4. Set the expected restock interval, or mark the item as one-time.
5. Save.

### Field contract

| Field | Requirement | Notes |
| --- | --- | --- |
| Name | Required | Must not be blank |
| Category | Required | Chooses the closest household area |
| Unit | Optional | Example: `half-gallon`, `roll`, `tube` |
| Restock estimate | Required for tracked items | Whole days from 1 to 365 |
| One-time | Optional | Excludes the item from prediction |

### States

- **Idle:** fields use sensible defaults and calm hints.
- **Invalid:** the failing field receives `aria-invalid`, field-level recovery text, and focus.
- **One-time:** the restock estimate is disabled and the hint explains why.
- **Busy:** form sets `aria-busy`, submit says “Adding…”, and repeated submits are prevented.
- **Success:** the dialog says “Saved.”, closes, the app updates, and focus returns to the trigger.
- **Empty:** not applicable; the form always offers a valid starting path.

## Log Purchase

### Job

A shopper wants to record what was bought in a few seconds so Hoot can keep learning the restock rhythm.

### Entry points

- Header / mobile dock: **Log purchase**
- Dashboard item action
- Item detail action

### Sequence

1. Choose a tracked item.
2. Confirm the purchase date.
3. Enter quantity.
4. Enter the total price.
5. Save.

### Field contract

| Field | Requirement | Notes |
| --- | --- | --- |
| Item | Required | Only tracked, non-one-time items are eligible |
| Date | Required | Today or earlier |
| Quantity | Required | Greater than zero; decimals allowed |
| Total price | Required | Zero or more; total paid, not per unit |

### States

- **Idle:** item is full-width; date, quantity, and total price use a stable three-column grid.
- **No tracked items:** fields hide, an inline empty state explains the blocker, and submit is disabled.
- **Invalid:** the failing field receives `aria-invalid`, field-level recovery text, and focus.
- **Busy:** form sets `aria-busy`, submit says “Logging…”, and repeated submits are prevented.
- **Success:** the dialog says “Saved.”, closes, purchase data updates, and focus returns to the trigger.

## One-time items

### Job

A shopper wants a simple checklist for irregular purchases that should not affect prediction.

### Entry points

- Primary navigation
- Add Item with **Add as a one-time item** selected

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
2. Read status and predicted restock.
3. Inspect rhythm, confidence, and model explanation.
4. Compare purchase history.
5. Log a purchase, edit, or delete the item.

### States

- **Typical:** prediction, rhythm, product intelligence, chart, and history are separate work areas.
- **Learning:** manual estimate is named and progress is explained.
- **Learned:** method, fit, interval range, and confidence are visible.
- **No history:** the table says no purchase history exists.
- **One-time:** prediction is intentionally off and the item remains checklist-only.
- **Product intelligence:** barcode lookup is explicitly named as not connected.
- **Delete:** requires confirmation and names the permanent consequence.

## Feature ideas

### Job

A stakeholder or curious user wants to understand where Hoot can grow without mistaking ideas for shipped features.

### Entry points

- Primary navigation.

### Content contract

Ideas remain future-facing and non-promotional. The page never claims barcode enrichment, sharing, shopping mode, price trends, or reminders are currently available.

### States

- **Typical:** six compact idea cards.
- **Responsive:** three columns on desktop, two on tablet, one on phone.

## Edit item

### Job

A shopper wants to correct an item’s name, category, unit, or expected restock estimate.

### Entry points

- Item detail action.

### States

- **Idle:** current values are prefilled.
- **One-time:** the restock estimate remains disabled.
- **Invalid:** name and restock estimate receive field-level recovery text and focus.
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

## Global feedback

- Mutations show a polite success toast.
- Validation and empty-state recovery are inline.
- Error copy names what failed and what to do next.
- Color never carries status alone.

## Acceptance criteria

- A user can complete Add Item, Log Purchase, one-time toggle, and item detail navigation with keyboard only.
- Focus starts on the first useful dialog control and returns to the trigger after close.
- Every validation message is associated with its field.
- Every empty state explains the blocker and the next step.
- One-time behavior and total-price meaning are visibly explained.
- The ranked queue appears before the fourteen-day schedule.
- The interface remains usable at 1440, 980, and 390px.
- No page-level horizontal overflow occurs; only the schedule viewport may scroll horizontally.
