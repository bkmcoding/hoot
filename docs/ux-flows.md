# Hoot UX flow contracts

## Dashboard

### Job

A shopper wants to know which household staples need attention now and which ones can wait.

### Entry points

- Brand link
- Primary navigation
- Returning to the app

### Sequence

1. Choose **List** or **Calendar** in the view switcher directly under the heading.
2. Read the focused **Next up** decision.
3. Choose **Spacious** or **Dense** in the heading control when the queue needs more air or more rows per screen.
4. Search the queue by name, category, or unit when looking for a specific staple.
5. Scan the compact ranked queue; in Dense, expand the folded Steady rows when needed.
6. Check the quiet inventory summary.
7. Select an item or log a purchase.
8. In **Calendar**, the month grid is the default; switch to the next seven or all fourteen days for the near term.

### Content contract

- **Tracked items:** all recurring staples.
- **Needs attention:** predictions due within three days.
- **Learned rhythm:** items with enough purchase history for Hoot to predict from it.
- **One-time:** checklist items excluded from prediction.
- The **Next up** item shows name, category/unit, predicted date, due text, status, the full horizon lane, and one primary **Log purchase** action. If it has purchase history, it also offers **Log last**. When it is **Overdue** and has purchase history, it offers **Still have some** as a secondary action; that records a correction on the latest purchase and moves the estimate three days out from today, so the false Overdue clears without a purchase.
- Remaining queue rows show name, status, predicted date, and secondary actions. At 360 and narrower, the date sits beside the title and the secondary actions share a full-width second line so the date is never clipped.
- The **Spacious / Dense** control sits with the queue search in the heading and reports its state with `aria-pressed`. The choice persists locally across reloads and sample switches; `document.body.dataset.density` mirrors `spacious` or `dense`.
- The **List / Calendar** switcher sits directly under the heading and swaps the main area in place, so the schedule is never below a long queue. **List** is the default and holds **Next up**, the ranked queue, density, search, and the inventory summary. **Calendar** holds the schedule and its 7/14/month range control, and hides the list-only controls. The choice persists locally across reloads and sample switches; `document.body.dataset.dashboardView` mirrors `list` or `calendar`.
- While a trip is active, a **Trip in progress** strip above the switcher names the trip date or **Today**, the picked and left counts, and offers **Resume trip** and **Discard trip** while work remains. Once every item is picked, its primary action becomes **Finish trip** and opens the receipt without re-entering the run. It stays visible in List and Calendar and clears when the run is finished or discarded.
- **Dense** compacts rows into one hairline-separated ledger and folds Steady rows (more than seven days out) behind a tinted, dashed summary band. The band names the exact count, says the items are still tracked, and toggles between **Show steady items** and **Hide steady items** with `aria-expanded` and `aria-controls`. Focus returns to that control after either toggle.
- Dense never folds search results or the **Next up** item. Search matches every tracked item regardless of the fold.
- Queue search matches tracked items by name, category, or unit.
- The global **Next up** decision stays visible during search; matching rows appear under a **Search results** heading with a count that names the query.

### States

- **Typical:** the highest-urgency item becomes the focused **Next up** decision; remaining items sort by predicted restock date as compact rows.
- **Calendar view:** the schedule replaces the queue and summary directly under the switcher. The heading copy names the active range, density and search are hidden, and the range control moves into the view bar beside the switcher. Day cells carry a status rail and per-item dots, the open day panel labels every item with its status chip, and a day showing only some of its items ends in `+N more`. The **Saved plans** row appears above every range: it names the count and up to two upcoming plans, with **+N more** switching to Month. In **Month**, a brief totals the restocks and days, names saved plans, and repeats the four status counts as a labeled legend; Month lists every saved plan.
- **Dense:** the queue becomes one compact ledger; Steady rows are folded behind a summary band that names the count and says they are still tracked. Expanding shows them in rank order and changes the control to **Hide steady items**. The fold is in-memory only and starts collapsed when Dense is chosen.
- **Search:** the global **Next up** card stays in place. Matching rows render as compact results, the count names the query, and a sole focused-item match is called out instead of duplicated. No matches keep the focused card and offer **Clear search**. Search bypasses the Dense Steady fold so no match is hidden.
- **Empty:** no tracked items; the state explains prediction cannot start and offers Add item.
- **Learning:** item detail names the user's typical interval and how many purchases remain before Hoot uses real gaps. On Dashboard, the **Next up** cue names progress and the manual source; at 360px and below it compacts to `1 of 3 · Manual 35-day` so **Log purchase** stays above a 640px viewport.
- **Learned:** item detail names the average gap between purchases.
- **Overdue:** status, due text, and predicted date make the risk explicit. **Still have some** corrects a false alarm in one tap; the toast names the new estimate, offers Undo, and focus moves to **Log purchase** so the next decision stays available.

## Restock schedule

### Job

A shopper wants to see when items are expected to run out — near term, or across a month — and to turn a date into a shopping trip.

### Entry points

- Dashboard, immediately after the ranked queue.

### Sequence

1. Scan today and the next six days.
2. Read the item names and due text.
3. Expand to all fourteen days, or to **Month**, when a wider view is needed.
4. Select an item to inspect its rhythm.
5. In **Month**, open a day to read its items in place.
6. From an open day, start a shopping run for that date, or save it as a plan.
7. Reopen a saved plan from the **Saved plans** row above the calendar grid in any range. A plan outside the visible strip opens in Month.

### States

- **Typical:** a seven-day schedule in a responsive grid: four columns at tablet and small-desktop widths, two columns at 660px and below, and seven or eight columns above 1120px. No day requires horizontal scrolling.
- **Fourteen-day:** the **All 14 days** control expands the grid; fourteen days wrap to two rows on wide desktop, four rows at tablet widths, and eight rows at phone widths. The caption and calendar label follow the selection.
- **Month:** the **Month** control draws at least thirty days as week rows, starting on the week containing today. Each cell carries the weekday, the date, up to two item names, and an exact “+N more” count. Above the grid, a brief totals the restocks and days, names any saved plans, and a labeled legend repeats the Overdue, Buy now, Watch, and Steady counts. The **Saved plans** row is present in every range, so a plan outside the phone's seven-day strip remains discoverable. Days with nothing due are blank and inert; days before today are muted.
- **Open day:** selecting a day inserts one panel after that week's row. Its selection count and **Start trip** / **Save plan** actions sit above the roster, so they are visible before the list. The roster scrolls independently once it grows past the panel. It lists each item with its status text and due phrase, marks overdue items first, and keeps **Close day** in the header. **Close day** or Escape returns focus to the day it opened.
- **Saved plan:** a saved plan shows a **Planned** chip in its cell and a pill in the **Saved plans** row above the grid in every range. Opening the day lists its items with a checkbox each; the checked set is the plan. **Add N due earlier** brings overdue and earlier restocks into the plan. A saved plan offers **Delete plan** with confirmation. The day's primary action is **Start trip with N items**; the secondary action is **Save plan** or **Update plan**. Starting writes the checked set back to the plan and announces **Plan saved.** or **Plan updated.** with the trip start; finishing clears it. Plans survive until deleted, a sample switch, or **Reset demo**.
- **Run from a date:** **Start trip with N items** uses the checked roster for that date and saves it as the plan. If another trip is already in progress, Hoot asks before replacing it. **Exit run** keeps the trip; finishing it clears the date and its plan. A wholly logged trip still exposes **Finish trip** on the dashboard strip.
- **Today:** green border and calm steady tint.
- **Past due:** in the seven- and fourteen-day ranges, a dedicated first cell names the number of overdue items; in **Month**, overdue items pin to today's cell and sort first.
- **Clear day:** the cell says “Clear” in the seven- and fourteen-day ranges.
- **Empty:** the schedule explains that a tracked item is required.

## Add Item

### Job

A household shopper wants to start tracking a staple or record a one-time need without interpreting a complex form.

### Entry points

- Header / mobile dock: **Add item**
- Header / mobile dock behavior: **Add item** opens as a tracked staple on Dashboard and as a one-time need on One-time.
- **Log purchase** is hidden on One-time because one-time items are completed with checkboxes and never write purchase history.
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
- **Narrow phone:** at 360px and below, the add dialog hides its intro copy and the optional Category/Unit hints, tightens field spacing, and keeps **Typical restock interval** and its helper above the sticky actions. Field order and labels do not change.

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
- **Wide:** at 1121px and wider, the heading and ledger hold an 840px reading column so the row remains a ledger rather than a full-width strip.

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
4. Check **Pattern**, **Confidence**, **Spending**, and **Your checks** — including the compact unit-price history when two or more prices are known and the active Next up correction — or expand **How Hoot got this date** for the estimate’s basis.
5. Edit or delete a purchase directly in its ledger node.
6. **Log purchase** is the page’s single primary action; **Edit item** and **Delete** close the page.

### States

- **Typical:** the answer card, rhythm ledger, and reference rail are separate work areas; the answer card carries the only primary action. On phones, a compact confidence line under the answer names the sample, measured gaps, and spread before the ledger.
- **Learning:** the answer says how many purchases remain before Hoot uses real gaps; **Pattern** separates **Gap so far** from the **Estimate uses** interval; **Confidence** names the sample and basis.
- **Learned:** the answer states the likely window; **Pattern** labels the average as **Typical gap**, and each ledger gap says whether it was shorter or longer than typical.
- **Checked:** **Your checks** counts every recorded right and still-had-some answer. The active **Next up** correction stays listed after the toast with the date it was recorded, the estimate it moved, and **Undo correction**; undo restores the check it replaced, refreshes the estimate, and moves focus to **Log purchase**. A compact **Earlier checks** list keeps superseded receipt and Next up answers with their source and date. Those rows are reference-only and no longer change the estimate. A receipt **Still had some** correction adds three days, while an overdue **Next up** correction moves the estimate three days out from today. The estimate node names the extra days either way.
- **No history:** the ledger explains there is nothing to chart yet and offers the first purchase as the next step.
- **One purchase:** the ledger shows the purchase and the estimate with no measured gap line; **Pattern** shows **Gap so far** as **Not yet**.
- **Unknown price:** the ledger and **Spending** say the price is unknown; known spend and averages count only purchases with a price.
- **Price history:** two or more known prices draw a compact unit-price sparkline on the purchase dates. Each point is a labeled button; the chart is one Tab stop, tapping the plot selects the nearest price, and the arrow keys (or Home and End) move between points while the readout names the focused date and unit price. One known price keeps the numbers only; unknown prices are skipped rather than interpolated.
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

- Primary navigation: **Shopping** is the only entry point. There is no separate header or dock button, so the run has one door. The run view itself is titled **Shopping run**.
- **Exit run** returns to Dashboard without clearing this trip; **Finish shopping run** opens the receipt.
- A wholly logged trip returns to Dashboard with **Finish trip** in the **Trip in progress** strip; that action opens the same receipt.

### Sequence

1. Start the run. Hoot hides the global header and footer so the aisle list owns the screen, resets the page to the top, and moves focus to the **Shopping run** heading without scrolling so keyboard and screen-reader users land in the new context. The heading takes focus for context but does not paint a visible focus ring; the next control keeps its amber ring.
2. Scan the list. It opens ordered by due date — **Overdue**, **Today**, **Tomorrow**, **Next 7 days**, **Later**, then **One-time** — with each row naming its category. Use **Aisle** in the order control above the list to switch to category panels sorted alphabetically, with urgency order inside each group.
3. Tap **Log** once on an item. Hoot records the purchase or checks off the one-time need immediately, and the row collapses to **Logged**.
4. Use **Not this trip** on a row you do not need today. Hoot removes it from the aisle without writing a purchase; the skipped strip above the aisles names it and offers **Undo last**.
5. Use **Add** when something is missing from the draft. The **Add to this trip** sheet searches every item not already in the run, including steady staples, Watch staples, and uncompleted one-time needs. Adding makes an unlogged row; it does not log anything until **Log** is pressed.
6. Use **Include Watch** when planned purchases should be included. Hoot includes Watch automatically when the dashboard's **Next up** item is in Watch.
7. Review quantity, price, and the next restock estimate in **Logged**; on desktop the panel stays in view beside the aisles, and at 980px and below it follows them. Use **Adjust** or **Undo** to correct a log. On phones, **Undo last** in the sticky footer reverses the most recent log without scrolling back to **Logged**.
8. Tap **Finish shopping run** to review the receipt. On each logged tracked staple, answer the optional **Was Hoot right?** check, then choose **Done** to return to Dashboard or **View purchase history** to inspect the first tracked item.
9. **Exit run** leaves the trip intact for later, including skipped and added items.

### Content contract

- The run drafts tracked staples in **Overdue** or **Buy now**, plus every uncompleted one-time need. If the dashboard's **Next up** item is in **Watch**, a fresh run includes Watch so the two surfaces agree. A run started from a saved plan uses exactly the plan's checked items instead of this default draft.
- **Watch** staples otherwise appear after **Include Watch** is pressed; the toggle reports its state with `aria-pressed` and is named **Remove Watch items** when active.
- **Due date** is the default order and groups the list by Overdue, Today, Tomorrow, Next 7 days (2–7), Later (8+), then One-time; tracked items sort by due distance, then name, and one-time items by name. Each row names its category in the metadata line because the group heading is a date window. **Aisle** groups by category, sorted alphabetically, with urgency order inside each group; items without a category fall under **Uncategorized**.
- Each unchecked row shows its name, unit, a status chip, and due text, with one primary **Log** action at the trailing edge and a secondary **Not this trip** action in the metadata line. In **Aisle** order the category is the heading and is not repeated in the row; a 3px zone rail and the chip carry urgency in color and text together. At 660px and below **Log** stays at the trailing edge at least 44px tall; **Not this trip** keeps a 44px target. At 340px and below the unit is omitted from the metadata line, **Log** narrows to 56px, and the name and chip share one line so the row stays under 110px.
- A logged row collapses to a compact **Logged** line: a check mark, the item name, and no status chip or action. Quantity, price, and prediction details live in **Logged**.
- Logging, skipping, adding, and undo feedback is in place, not in a toast: the row changes, the summary or skipped strip updates, and a polite live region names the result so the finish action stays clear. Skipping and adding move focus to the next useful row control; undoing a skip returns focus to that row's **Log** button.
- The skipped strip above the aisles names up to three skipped items, adds “and N more” when needed, and offers one **Undo last** for the most recent skip. Skipped items are excluded from **Items** and **Left** and are not logged on the receipt.
- The **Add to this trip** sheet is a 520px native dialog with a labelled search field focused on open. It lists items by name with category, unit, and status, excludes completed one-time items and anything already shown in the run, and closes on selection. If nothing is available it says everything is already in this trip; if a search has no matches it says so. Selecting an item adds it to its aisle and announces “added to this trip. Not logged.”
- **Save as plan** in the **Logged** header saves the unlogged remainder back to the day's plan. The Watch toggle is hidden for a planned trip because its plan already decided what is included.
- **Discard** in the **Logged** header clears the active trip after a confirmation. The date's plan stays on the calendar and logged purchases stay in history; only the run and its counts are removed.
- The empty **Logged** panel says the list is the trip, **Log** records each pick now, and **Undo** reverses it; it does not imply that the run defers the purchase until Finish.
- When no group is eligible, the aisle column shows **Nothing is due right now**, explains the draft rules, offers **Include Watch items** when Watch has items, offers **Add to this trip**, and offers **Back to dashboard**. If every remaining row was skipped, the heading says **Everything left is skipped** and points back to the skipped strip. **Logged** says logged items will appear when the run has something to pick; it never asks the user to log a row that does not exist.
- The run header uses the page-title scale and keeps **Include Watch**, **Add**, and **Exit run** as secondary actions; at 660px and below the title and actions stack. The ordering sentence is visible on arrival, collapses after the first scroll so it stops adding sticky height, and returns when the run is back at the top; the title and actions remain throughout. While **This trip** is empty, **Finish shopping run** stays in normal flow and never covers the empty state; once an item is logged it becomes sticky at 661–980px and fixed to the phone viewport, with bottom space reserved so it never covers the last row. On phones that footer also shows **Undo last**, named for the most recent item; it disappears when the trip is empty.
- The summary is one compact strip: **Items**, **Logged**, and **Left** for the current run, including logged and explicitly added items that no longer match the default draft, and excluding skipped items.
- At 981px and wider, the summary and aisle list share the left column while a sticky **Logged** panel holds the right column; the panel stays in view as the aisles scroll, its list scrolls internally when the trip is long, and **Finish shopping run** stays at its foot.
- **Logged** lists each logged item with its quantity, total price (or **Price unknown**), and **Next restock** date. **Adjust** opens the purchase editor for a tracked staple and the item editor for a one-time need.
- **Finish shopping run** is disabled while **Logged** is empty. The receipt is a 520px sheet on desktop, names the item count, total known spend, and every logged item, and says how many restock checks are ready rather than “predictions updated.” When items were skipped, the message names that count; only logged items appear in the list and spend. **Done** clears the run and returns to Dashboard; **View purchase history** clears the run and opens the first tracked item; closing the receipt with Escape or the close button leaves the run intact.
- The receipt asks one optional prediction check per logged tracked staple: **Due <date> · was Hoot right?**, answered with **Yes, I was out** or **Still had some**. One-time entries never ask. The answers are one native radio group inside a `fieldset` whose `legend` is the question, so the group carries its question and exactly one answer is checked until **Done**. Each radio covers its full answer target. **Still had some** records the miss on that purchase and moves the next estimate three days later, naming the new date in place; **Yes, I was out** records agreement and leaves the estimate unchanged. A polite live region names the answer and the new estimate. The answers are 42px on desktop and at least 44px tall on phones; the receipt scrolls as one sheet, and the item list never becomes a nested scroll of its own.
- The run session — Watch toggle, logged items, explicitly added items, and skipped items — persists separately from inventory and survives a reload. A finished run clears all of it.
- Completed one-time items and steady tracked staples do not appear.
- Hoot has one trip flow: the legacy **Restock trip** modal is retired.

### States

- **Immersive:** the global header and footer are hidden, the run title and **Exit run** stay at the top, and **Finish shopping run** closes the list at the foot of **Logged**. At 981px and wider the panel is sticky beside the aisle list; at 980px and below the summary, aisles, and log stack in one column.
- **Typical:** eligible items grouped by aisle, an empty-trip explanation, and a compact summary.
- **Logged:** the row collapses to a sage **Logged** line, and the **Logged** panel gains quantity, price, next-restock detail, **Adjust**, and **Undo**. On phones the fixed footer carries **Undo last** for the latest log.
- **Watch included:** Watch staples join their aisles in urgency order; hiding them removes only those that are still unchecked and not explicitly added.
- **Skipped:** the row leaves its aisle without a purchase or prediction change, the skipped strip names it, and **Undo last** restores it to its aisle position.
- **Added:** a not-due or previously skipped item joins its aisle as an unlogged row; the summary's **Items** and **Left** include it, and **Log** remains the only action that writes a purchase.
- **One-time checked:** the item is completed in the checklist and appears in **This trip** as a one-time entry.
- **Empty run:** when nothing is eligible, the aisle column shows the dedicated empty state, offers **Add to this trip**, the summary reads zero, **Logged** says logged items will appear when there is something to pick, Finish is disabled, and the finish footer stays in normal flow.
- **Receipt:** a native dialog summarizes the trip without blocking another log until Done is chosen. Each logged tracked staple carries an optional **Was Hoot right?** check; answering **Still had some** updates the next estimate in place, and the answer is stored on the purchase whether or not history is opened. On phones the sheet scrolls as one body behind a sticky footer; the answers are 44px tall. The run's fixed footer is covered by the dialog while it is open.
- **Storage unavailable:** the in-memory run still works; only reload persistence is lost.
- **Failure:** a failed log or undo leaves the run unchanged and shows an error toast naming the item.

## Demo samples

### Job

A shopper or reviewer wants to move between Hoot's first-run household and a realistically busy one without editing data by hand.

### Entry points

- Footer **Sample** select.

### Rules

- **Starter household** is the first-run default: 6 tracked staples and 2 one-time needs.
- **Busy household** holds 38 tracked staples and 6 one-time needs with deep purchase histories. It is the scale sample for scanning, density, and vertical length.
- Selecting the inactive sample opens the shared confirmation dialog. The dialog names the sample and its item count, and warns that local changes are replaced.
- Cancel restores the select to the active sample and changes nothing.
- Confirm replaces the items, clears the shopping-run session, clears queue search, returns to Dashboard, and announces **<Sample> loaded.** in a toast.
- **Reset demo** restores the active sample, and its confirmation names that sample.
- `document.body.dataset.sample` mirrors the active sample for tests and critique tooling.

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
- Reset demo sits in the footer beside the sample picker and restores the active built-in sample.

## Global feedback

- Outside the Shopping run, mutations show a polite success toast. Purchase feedback names the item, quantity, total price or “price unknown,” and updated next estimate; delete and a Next up **Still have some** correction add a short-lived Undo action. Toasts dismiss automatically after their lifetime or immediately on tap/click without triggering action buttons, ensuring touch zones remain unobstructed. The run uses an in-place live-region announcement instead so toasts do not cover the aisle list or finish action.
- Validation and empty-state recovery are inline.
- Error copy names what failed and what to do next.
- Color never carries status alone.

## Acceptance criteria

- A user can complete Add Item, Log Purchase, the Next up **Still have some** correction and its Undo, one-time toggle, item detail navigation, and a Shopping run — including **Not this trip**, **Add to this trip**, and their undo paths — with keyboard only.
- Entering Shopping run moves focus to its heading without a visible outline; **Exit run** returns focus to the Dashboard nav. Focus starts on the first useful dialog control and returns to the trigger after close. Skipping moves focus to the next row's **Log**, adding moves focus to the new row's **Log**, and undoing a skip returns focus to that row's **Log**. The **Add to this trip** sheet opens with focus in its search field.
- Every validation message is associated with its field.
- Every empty state explains the blocker and the next step.
- One-time behavior and total-price meaning are visibly explained.
- Add Item progressively discloses only the fields required by the selected path and opens with focus on the checked item-type path, including **One-time need** when launched from the one-time ledger.
- Global **Add item** follows the active view: tracked staple on Dashboard, one-time need on One-time.
- Global **Log purchase** opens with the highest-urgency tracked item.
- Queue search filters tracked items by name, category, or unit, keeps the global **Next up** decision visible, labels matches as results, names the query in the count, and offers a clear no-match recovery.
- **Log last** prefills the focused item’s latest quantity and a known, non-zero total price while keeping the date at today.
- Total price is optional; blank or `0` stores an unknown price, and history and success feedback say so plainly.
- Item titles show a persistent interactive underline, provide an expanded pointer target, and remain backed by explicit **Details** buttons named for their item.
- Item detail leads with one **Next restock** card (date, due, likely window when available, plain reason, one primary **Log purchase**), then a **Buying rhythm** ledger with one node per purchase, a labeled gap between nodes, and a distinct estimate node, plus a reference rail with **Pattern**, **Confidence**, **Spending**, and **Your checks**; it does not repeat the dashboard horizon lane or a separate purchase-history table.
- **Spending** draws a unit-price sparkline when at least two known prices exist and omits it for a single price; each point is a labeled button, the chart is a single Tab stop, and its arrow keys reach every point with its date and unit price in the visible readout.
- Projected estimate copy meets AA contrast: the gap, its note, and the projected date use the darker projection ink, while the dashed marker keeps the lighter amber. The **Estimate** badge and **Unit price history** label use the 11px micro scale.
- At 661–980px the item reference rail uses two columns so the unit-price sparkline stays compact; below 661px it returns to one column.
- Item detail writes `#/item/<id>`; browser Back and Forward move between Hoot surfaces instead of leaving the app, and the in-page back control replaces the item entry with its parent view.
- Item detail opens at the top with focus on the item heading; the in-page back control moves focus to the destination primary navigation. On phones, the ledger’s Edit and Delete actions remain fully visible and the fixed dock stays hidden.
- Entering the Shopping run resets the page to the top before focus moves to its heading.
- At 981px and wider the desktop Shopping run puts the progress strip and aisle list beside a sticky **This trip** panel with the finish action at its foot; at 980px and below the run stacks the summary, aisles, and trip without horizontal overflow.
- The run title uses the 30px page-title scale (26px on phones); at 660px and below the title and actions stack, and the finish footer stays in normal flow while the trip is empty.
- An empty run shows **Nothing is due right now**, names **Include Watch items** when Watch has items, offers **Back to dashboard**, and never tells the user to log a nonexistent row.
- Unchecked run rows carry a zone rail and a status chip, with text and color together; the category is the aisle heading and is not repeated in the row.
- Prediction-check answers are at least 44px tall on phones; at 320px the receipt scrolls as one sheet with no nested list scroll, and it is 520px wide on desktop.
- The **Next up** decision appears before the compact ranked queue, and the queue appears before the seven-day schedule.
- Until an item has three purchases, the **Next up** card names **Learning**, its purchase progress, and the manual interval source; its date heading reads **Estimated restock**.
- The restock calendar defaults to Month on desktop and Next 7 days at 660px and below, offers seven- and fourteen-day strips on request, and keeps its caption and accessible label in sync. Month opens with a summary of restocks, days, and saved plans plus a labeled four-status legend. Day cells carry status color and text, show at most a few names plus `+N more`, and never stretch the grid. It is a responsive grid at every width, with no horizontal scrolling: four columns at tablet and small-desktop widths, two columns at 660px and below, and seven or eight columns above 1120px.
- The Shopping run opens ordered by due date, names each row’s category in that mode, and switches to aisle groups from the order control without losing a logged row.
- The Dashboard content has exactly one primary action: **Log purchase** on the **Next up** item. The header and dock carry no primary action; the **Shopping** tab is the only way into the run.
- The Today marker sits at the Overdue/Buy-now boundary, 33.333% of the lane.
- Exact duplicate names are rejected with a field-level recovery message.
- On phones, the action dock holds **Log purchase** and **Add item** in one row. The dock hides while **Next up** is visible and returns once the card leaves the viewport, so it never covers the card or its actions.
- Dynamic headings are sequential: dashboard and one-time empty states use `<h2>` beneath an `<h1>`; queue rows use `<h3>` beneath the focused `<h2>`; item detail uses `<h1>` then `<h2>` section headings; Shopping run uses `<h1>`, then `<h2>`.
- Rendered text meets AA contrast in the checked dashboard, item-detail, one-time, Shopping run, and receipt states (4.5:1 normal text, 3:1 large text).
- The calendar caption fits without a one-word orphan at 390px.
- Delete can be undone from the confirmation toast before it disappears.
- Reset demo is visible in the footer, restores the active sample, and remains at least 44px tall on phones.
- The **Sample** select names both built-in samples with their item counts; switching asks for confirmation, cancel leaves the active sample untouched, and reset restores that same sample.
- The busy household renders 38 tracked queue rows and 6 one-time rows without horizontal overflow at 1440, 980, 390, and 320px.
- All three navigation tabs render in full at 320px without a scroll container or a clipped label, and the brand link's hit area matches the lockup rather than the header row.
- The interface remains usable at 1440, 980, 390, and 320px.
- No page-level horizontal overflow occurs, and the schedule never scrolls horizontally.
