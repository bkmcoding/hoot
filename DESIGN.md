---
name: Hoot
description: A warm, tactile household ledger for predictive restocking.
colors:
  canvas: "#f5efe3"
  surface: "#fffaf1"
  surface-quiet: "#f9f5ea"
  surface-tint: "#ece4d5"
  border: "#e2d8c6"
  border-strong: "#cbbda5"
  border-control: "#9a8b72"
  ink: "#232019"
  ink-soft: "#5f5749"
  ink-faint: "#6a6152"
  night: "#1a2b33"
  cream: "#f5efe3"
  amber-mark: "#d49b4c"
  projection: "#b0742a"
  selection: "#ebd3a6"
  backdrop: "rgba(31, 25, 16, 0.5)"
  primary-action: "#4e6247"
  primary-hover: "#42553c"
  primary-active: "#374731"
  on-primary: "#fffaf1"
  focus: "#7c4a22"
  danger: "#a13b26"
  danger-hover: "#8a3120"
  overdue: "#9a3420"
  overdue-background: "#f8e6de"
  overdue-border: "#e3b5a6"
  overdue-rail: "#b8492f"
  buy-now: "#8a5208"
  buy-now-background: "#f8ead0"
  buy-now-border: "#e2c48e"
  buy-now-rail: "#c98a2e"
  watch: "#3d5a73"
  watch-background: "#e6ecee"
  watch-border: "#b9c8d0"
  watch-rail: "#5f7d94"
  steady: "#46603f"
  steady-background: "#e7eedd"
  steady-border: "#bccdb0"
  steady-rail: "#6b8562"
  learning: "#5f5749"
  learning-background: "#efe8da"
  learning-border: "#d6cbb6"
typography:
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI Variable Text, Segoe UI, system-ui, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  page-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI Variable Text, Segoe UI, system-ui, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "30px"
    fontWeight: 750
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  section-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI Variable Text, Segoe UI, system-ui, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.25
  item-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI Variable Text, Segoe UI, system-ui, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.3
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI Variable Text, Segoe UI, system-ui, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.08em"
  metadata:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI Variable Text, Segoe UI, system-ui, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
  button:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI Variable Text, Segoe UI, system-ui, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.2
  page-title-mobile:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI Variable Text, Segoe UI, system-ui, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "26px"
    fontWeight: 750
    lineHeight: 1.15
  stat-value:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI Variable Text, Segoe UI, system-ui, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "36px"
    fontWeight: 750
    lineHeight: 1
  wordmark:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI Variable Text, Segoe UI, system-ui, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "19px"
    fontWeight: 800
    lineHeight: 1.15
  card-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI Variable Text, Segoe UI, system-ui, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.3
  lead:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI Variable Text, Segoe UI, system-ui, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  small:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI Variable Text, Segoe UI, system-ui, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
  micro:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI Variable Text, Segoe UI, system-ui, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 650
    lineHeight: 1.4
rounded:
  segment: "3px"
  hairline: "4px"
  compact: "10px"
  control: "12px"
  inner: "14px"
  card: "18px"
  dialog: "20px"
  pill: "999px"
spacing:
  micro: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  xxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary-action}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "42px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "42px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "42px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "42px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "46px"
  navigation-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "36px"
  status-overdue:
    backgroundColor: "{colors.overdue-background}"
    textColor: "{colors.overdue}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
    height: "24px"
  surface-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "20px 24px"
  dialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.dialog}"
    padding: "24px"
---

# Design System: Hoot

## Overview

**Creative North Star: “Warm Ledger”**

Hoot is a household ledger kept on good paper. Cream surfaces, charcoal ink, sage actions, and amber signals make restock decisions feel calm and tactile rather than clinical. It should feel at home on a kitchen counter in the evening and just as legible on a phone in a store aisle.

Three layers build the world:

- **Warm Utility** is the interface language: familiar controls, compact rows, tabular data, one obvious next action.
- **Warm Ledger** is the material: cream canvas, paper surfaces, hairline warm borders, soft inset highlights.
- **Calm Nocturn** is a restrained night accent: the Owl-Moon mark, the Today marker, and a few date numerals. There is no dark mode.

**Key Characteristics:**

- Paper surfaces with hairline warm borders, a subtle inset highlight, and restrained offset shadows.
- One sage primary action per work area. On a populated dashboard, that action is the focused item's **Log purchase** button.
- Compact, ranked data with tabular numerals and uppercase tracked labels.
- The Restock Horizon Lane: a segmented track with a night Today marker.
- Status is always legible through text, structure, and color together.

## Brand

### Owl-Moon mark

A rounded night-ink tile holds a cream moon with a crescent bite at the upper right. Two small almond eyes with amber irises sit in the remaining moon body, suggesting a watchful owl without a face, beak, or mascot.

- Source: `frontend/favicon.svg` (48×48) and the inline header SVG in `frontend/index.html`, which share the same geometry.
- The crescent is an SVG mask, so the mark stays flat on any background.
- No gradients, glow, outlines, or literal owl features.
- In the header the moon group breathes very slowly (7s, about 2.5% scale). This is the only brand animation, and reduced motion disables it.
- The “Hoot” wordmark and the “Predictive household inventory” subtitle stay beside the mark.

## Colors

### Primary

- **Sage** (`#4e6247`) is the primary action and the steady-state signal. It appears once per work area.

### Signals

- **Terracotta** marks overdue items and destructive actions.
- **Amber** marks items to buy now. A deeper amber-brown (`#7c4a22`) is the focus ring.
- **Slate** marks items to watch.
- **Sage** marks steady items.
- **Warm neutral** marks learning and checklist states.

Each status has an ink, a background, a border, and a rail tone. The ink always meets AA contrast on its background.

### Neutral

- **Cream Canvas** is the app ground.
- **Paper** is the card, panel, input, and dialog surface.
- **Quiet Paper** is used for hover, empty states, and nested quiet panels.
- **Parchment** is used for the navigation track, table headers, and disabled controls.
- **Charcoal Ink** carries primary text. Two warm gray-brown levels carry secondary copy and metadata.
- **Night** (`#1a2b33`) is reserved for the logo tile, the Today marker, and today’s date numeral.

### Named Rules

**The One Action Rule.** Each work area has at most one primary action. Other actions use the secondary, ghost, or danger variants.

**The Text Status Rule.** Color never carries status alone. Every status, including empty and destructive states, is named in text.

**The Night Is Rare Rule.** Night ink appears only where it marks the brand or the present moment.

## Typography

Hoot uses one system sans family with no external fonts. The stack names the platform faces (Apple system, Segoe UI) before `system-ui`, so an OS-level `system-ui` override such as a monospace font cannot change Hoot’s voice. Headings are compact and fixed, not fluid.

- **Page title:** 30px, weight 750 (26px on phones).
- **Section title:** 20px, weight 700.
- **Item title:** 17px, weight 700.
- **Body:** 16px / 1.55.
- **Label:** 12px, uppercase, 0.08em tracking.
- **Metadata:** 12–13px.
- **Button:** 14px, weight 700.

**The Compare Rule.** Dates, quantities, prices, intervals, and model values use tabular numerals.

## Layout

The shell has a sticky paper header, segmented pill navigation, a visible Reset demo utility, a 1200px content width, and an 8px rhythm. The dashboard heading carries a lightweight queue search, then leads with a focused **Next up** decision, a compact ranked restock queue, a quiet inventory summary strip, and the seven-day calendar with an **All 14 days** expansion. Header and dock actions read **Log purchase**, then **Add item**.

### Shell behavior

- **Desktop:** the header is at least 72px tall and holds the brand, segmented navigation, task actions, and Reset demo utility in one scan line. A hairline divider separates the utility.
- **Tablet (661–980px):** the header becomes two rows: brand, actions, and utility on top, navigation below; the summary uses two columns; item detail becomes one column with the rhythm ledger before the reference rail, which uses two columns; the calendar uses four columns.
- **Phone (≤660px):** the subtitle hides, primary navigation fills the row and may scroll horizontally, and **Log purchase** and **Add item** move to a fixed bottom action dock. The dock is hidden while **Next up** is visible and on item detail, then returns once the user leaves that surface. Queue rows compress to two lines, ledger entries stack date above details, fields stack, and dialog actions become sticky. The calendar uses two columns.
- `.app-frame` reserves `--dock-height` of bottom padding so the dock never covers content. Reset demo remains at least 44px tall.

### Routes and browser history

Every stable surface has a hash route: `#/dashboard`, `#/one-time`, `#/shopping`, and `#/item/<id>`. A fresh visit replaces the URL with `#/dashboard`; opening a surface pushes a history entry, so browser Back and Forward move through Hoot instead of leaving it. The item's in-page back control replaces the item entry with its parent view. Hash routing is intentional: the demo is static and has no server fallback for deep paths.

### Breakpoints

| Width | Behavior |
| --- | --- |
| Above 1120px | **Next up** uses a three-column decision layout; queue rows stay compact; the calendar fits seven days plus the past-due card in one row and fourteen days in two. |
| 981–1120px | **Next up** uses two columns with actions spanning the bottom; queue rows stay compact; the calendar uses four columns. |
| 661–980px | Header becomes two rows; the summary uses two columns; item detail becomes one column with the rhythm ledger before the reference rail, which uses two columns; the calendar uses four columns. |
| 660px and below | Single-column content, fixed action dock with observer-driven visibility, two-line queue rows, tightened **Next up**, stacked ledger entries and fields, and sticky 48px dialog actions; the calendar uses two columns. |

## Elevation & Depth

Cards rest on paper with a hairline border, a 1px inset highlight, and a soft offset shadow. Depth rises only for:

- hover on interactive cards (a 1–2px lift and a deeper border);
- dialogs (a large soft shadow over a dark warm backdrop);
- toasts (a small soft shadow);
- the mobile action dock (a shallow upward shadow).

## Shapes

- Lane segment joints: 3px. Inline title focus: 4px. Calendar item buttons: 10px.
- Controls: 12px radius.
- Inner panels, calendar days, and toasts: 14px.
- Cards and panels: 18px.
- Dialogs: 20px.
- Navigation, chips, and lane ends are pill-shaped.

## Motion

Motion is calm and communicates state. Interface timing is 160–220ms.

- View change: 220ms fade with a 6px rise.
- Dialog open: 180ms fade and rise over a fading backdrop.
- Toast: a short rise in and fade out within its 3.4s life, or 6.4s when it contains Undo.
- Lane: the Today marker sends out a slow, faint pulse ring.
- Logo: the slow Owl-Moon breathing effect.
- `prefers-reduced-motion` removes transforms, pulses, breathing, and entrances.

## Components

### Dashboard hierarchy

The populated dashboard has one unmistakable decision at the top: the highest-urgency tracked item. That **Next up** card owns the dashboard's one primary **Log purchase** action and the full Restock Horizon Lane. Until the item has three purchases, the card also carries a **Learning** chip, its purchase progress, and the manual interval source; its date heading reads **Estimated restock** rather than **Next predicted restock**. When history exists, a secondary **Log last** accelerator opens Log Purchase with today’s date and the most recent quantity and a known, non-zero total price. The remaining tracked items render as compact ranked rows with status, date, and secondary actions.

Queue search matches name, category, and unit without displacing the global decision. Matches render beneath a **Search results** heading, and the count names the query. If the only match is the focused item, the section says so instead of repeating it as a row. No matches keep the global **Next up** card and offer **Clear search**. The lane and Today marker do not repeat across the queue.

Global **Log purchase** opens with the highest-urgency tracked item. Global **Add item** follows the active view: tracked staple on Dashboard, one-time need on One-time.

### Buttons

- **Primary:** filled sage with paper text.
- **Secondary:** a paper surface with a warm border.
- **Ghost:** transparent with a parchment hover.
- **Danger:** filled terracotta, used only for destructive confirmation.

Buttons are 42px on desktop and 48px for mobile primary actions. Compact utility and range controls are at least 44px on phones. Every button has default, hover, active, focus-visible, disabled, and busy states.

### Fields

Inputs and selects are 46px tall, use paper surfaces with a warm control border, and show an amber focus ring. Labels sit above the control as uppercase tracked text. Invalid fields get a terracotta border and a field-level message associated through `aria-describedby`. Total price is optional; blank or `0` means the price is unknown.

### Item paths

Add Item starts with a two-path segmented choice: **Tracked staple** or **One-time need**. The checked path owns initial focus, so opening from the One-time ledger starts on **One-time need**, not the unchecked sibling. Name, category, and unit are common. The typical restock interval appears only for tracked staples. One-time needs never see an interval field or a disabled stub.

Exact duplicate names, ignoring case and surrounding spaces, are rejected with a field-level recovery message. Tracked duplicates suggest logging a purchase instead.

### Restock cards and queue rows

The focused **Next up** card is a decision strip with identity and status, then the horizon lane, then the actions. A slim inset rail in the zone color runs down the left edge, and the due chip uses the same zone tint. Item titles are buttons with a persistent warm underline and an expanded pointer target; explicit **Details** buttons remain available. Remaining queue rows use the same zone rail, but omit the horizon lane and Today marker to keep the queue compact.

### Item detail

Item detail answers one question first: when is this needed again. It leads with the item identity, then a **Next restock** answer card — date, due phrase, likely window when one exists, plain-language reason, and the only primary action, **Log purchase** — followed by the **Buying rhythm** ledger. A reference rail holds **Pattern**, **Confidence**, **Spending**, and **Your checks** with the collapsed **How Hoot got this date** disclosure. **Edit item** and **Delete** close the page; there is no second Log purchase. The page never shows R², fit strength, model versions, or internal method names.

The ledger is one vertical timeline and the purchase history at once. Each purchase is a node with its date, quantity, total price, unit price when quantity is above one, and inline Edit/Delete actions. The line between nodes is the measured gap: its label states the days and, once learned, how far it sits from the typical gap. Purchase nodes are filled sage. The line from the last purchase to the estimate states how many days it adds and which basis it uses — the manual interval while learning, the learned gap after three purchases, or the check correction. The final estimate node is hollow and dashed, labeled **Estimate**, and never claims to be a purchase. A proportional, clamped connector height lets a long gap occupy more space without turning the page into a wall of whitespace. The separate purchase-history table is retired; the ledger owns the table’s dates, prices, and edit/delete actions.

The reference rail adds evidence the ledger cannot. **Pattern** summarizes typical, shortest, longest, and last gaps and carries the model disclosure. **Confidence** names the sample size, measured gaps, gap range, and basis. **Spending** names known spend, average purchase, latest known unit price, and the change since the previous known price. When at least two purchases have a price, it adds a compact unit-price sparkline on the purchases’ date axis; the sparkline uses known prices only and is absent for a single price. Each point is a labeled button: tapping the plot selects the nearest purchase, Tab reaches each point, and a readout names the selected date and unit price. The SVG line is decorative; the point labels carry the accessible values. Prices stay per purchase; totals are labeled **Known spend** because a blank or zero price is unknown. Confidence copy describes the sample rather than asserting false precision.

The answer adds a likely window only when at least two gaps exist: **Likely between <date> and <date>**, framed as a window rather than a guarantee, and widened when the gaps are irregular. While learning, **Pattern** separates the gap measured so far from the interval the estimate uses, so an observed gap and a manual interval cannot be mistaken for each other. One-time items replace the answer, ledger, rail, and spending with a single **On your checklist** card.

### Restock Horizon Lane

Four segments (Overdue, Buy now, Watch, Steady) are sized to the real day range from −7 to +14 days. The active zone shows full color and its label strengthens. Inactive zones stay visible at low strength. A subtle Today hairline reference line sits fixed at the Overdue/Buy-now boundary (33.333% of the lane). A night restock pointer with an offset label and faint pulse ring moves dynamically across the segments to pinpoint the item's predicted restock date. The lane is a schedule, not a progress bar.

### Calendar

The schedule defaults to the next seven days and offers compact **Next 7 days** and **All 14 days** controls. The caption and calendar label follow the selected range. Each day is a paper card. Today gets a sage border, a light sage tint, and a night numeral. Past-due items get their own terracotta card at the front. Clear days read “Clear”. The schedule is a responsive grid at every width, never a horizontal strip: four columns at tablet and small-desktop widths, two columns at 660px and below, and seven or eight columns above 1120px so seven days plus the past-due card fit in one row and fourteen days wrap to two. No day is hidden behind horizontal scrolling.

### One-time ledger

Rows share one paper panel and are separated by hairlines. Checkboxes are circular and turn sage when checked. Completed items stay visible with muted ink and a strike-through.

The One-time heading offers a secondary **Add one-time item** action.

### Shopping run

The run uses the immediate-logging model. **Log** writes the tracked purchase or checks off the one-time need at once, and the aisle row collapses to **Logged**. The collected list is **This trip**; the summary reads **Items**, **Logged**, and **Left**. There is no deferred cart or checkout step. Quantity, price, and the next restock estimate stay in **This trip**, where **Adjust** and **Undo** correct a log.

At 981px and wider, the run opens from its focused column into a 1180px workspace: the progress strip and aisle list hold the left column, while **This trip** becomes a sticky paper panel in the right column. The panel stays in view as the aisles scroll; a long trip scrolls inside the panel while its header and **Finish shopping run** stay in place. At 980px and below, the run remains one column: progress, aisles, then **This trip**, with the finish action after the list.

### Finish receipt and prediction check

The receipt asks one optional, inline question for each logged tracked staple: **Due <date> · was Hoot right?**, answered with **Yes, I was out** or **Still had some**. It is a quiet inset under the item, never a second dialog, and one-time entries never ask it. The answer is a correction to the estimate, not a new purchase. **Still had some** records the miss on that purchase and moves the next estimate three days later; the result line states the new date in place, and item detail counts checks and names the extra days under the estimate. Both answers can be changed until **Done**.

### Dialogs and toasts

Dialogs are native `<dialog>` paper sheets with a 20px radius, a dark warm backdrop, and sticky actions on mobile. Toasts are small paper chips with a semantic inset rail. Success copy names the concrete change: purchase feedback names the item, quantity, total price or “price unknown,” and next estimate. A destructive toast may carry one short-lived Undo action.

### Empty states

An empty state explains three things in place: why the surface is empty, what the user can do next, and which action is unavailable. It uses quiet paper with a dashed warm border and is always inline and actionable. A toast may confirm an action but is never the recovery path.

## Accessibility floor

- Meet WCAG AA contrast for text and controls; color never carries status alone.
- Give every interactive element a visible amber focus ring.
- Use semantic headings, buttons, labels, tables, and forms.
- Focus the first useful control when a dialog opens, and restore focus to the trigger when it closes.
- When item detail opens, reset the page to the top and move focus to the item heading. Leaving it with the in-page back control moves focus to the destination primary navigation.
- When the Shopping run opens, reset the page to the top and focus its heading without moving the scroll position.
- Announce busy and success states politely, including a recorded prediction check.
- Keep every task keyboard-complete, including entering and leaving the Shopping run and answering a finish-receipt prediction check.
- Keep compact phone controls at least 44px tall.
- Respect `prefers-reduced-motion`.

## Do's and Don'ts

### Do:

- **Do** lead each surface with the user’s next decision.
- **Do** use text and color together for every status.
- **Do** keep dense data readable with tabular numerals.
- **Do** keep 46px fields and 48px mobile primary actions.
- **Do** keep night ink rare.

### Don't:

- **Don't** add gradients, glass panels, glow, or decorative charts.
- **Don't** turn the owl into a mascot or literal illustration.
- **Don't** add a dark mode or night theme.
- **Don't** use color as the only status signal.
- **Don't** hide validation, empty-state, or destructive consequences in a toast alone; an Undo action supplements a clear confirmation, never replaces it.
- **Don't** add a framework, icon font, or web font.

## Change control

1. Update this file first for durable token, visual-world, or component-rule changes.
2. Update `docs/ux-flows.md` for task, state, or focus changes.
3. Apply the change to `frontend/style.css`, `frontend/index.html`, and `frontend/app.js`.
4. Verify desktop, tablet, and phone behavior before calling the work complete.
5. Record a new critique snapshot after a scored review, not a narrative changelog.
