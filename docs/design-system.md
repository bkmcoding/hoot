# Hoot design system

## Source of truth

This is the implementation contract for **Warm Ledger**. The machine-readable token source is the YAML frontmatter in `DESIGN.md`. The CSS custom properties live at the top of `frontend/style.css`, and this document explains how they are applied to product surfaces.

The direction is a warm, tactile household ledger. It is task-first, dense enough for scanning, and familiar enough that a household shopper never has to learn a custom control language.

## Direction

- **Warm Utility** is the interface language: native controls, compact rows, and one clear next action.
- **Warm Ledger** is the material: cream canvas, paper surfaces, hairline warm borders, and soft inset highlights.
- **Calm Nocturn** is a restrained night accent, limited to the logo, the Today marker, and today’s date numeral.
- The primary sage action appears once per work area.
- Color never carries meaning without text or structure.

## Brand

### Owl-Moon mark

| Part | Shape | Fill |
| --- | --- | --- |
| Tile | 48×48 rect, `rx="14"` | Night `#1a2b33` |
| Moon | Circle `r="15"` at (24, 25), masked by a circle `r="8.5"` at (35.5, 12.5) for the crescent bite | Cream `#f5efe3` |
| Eyes | Two ellipses, `rx="3.6"` and `ry="2.7"` | Night |
| Irises | Two circles `r="1.25"`, offset slightly up and to the right | Amber `#d49b4c` |

- `frontend/favicon.svg` is the standalone mark.
- The header in `frontend/index.html` inlines the same geometry. Its classes are `brand-tile`, `moon-body`, `moon-disc`, `owl-eye` and `owl-iris`, and CSS supplies the fills.
- The header chip is 42px with a 14px radius.
- `.moon-body` runs `moon-breathe` (7s ease-in-out, scale 1 to 0.975). This is the only brand animation, and it is off under reduced motion.
- No face outline, beak, gradient, glow, or mascot use.

## Tokens

### Color

| CSS role | Token | Value |
| --- | --- | --- |
| Canvas | `--canvas` | `#f5efe3` |
| Surface | `--surface` | `#fffaf1` |
| Quiet surface | `--surface-quiet` | `#f9f5ea` |
| Tinted surface | `--surface-tint` | `#ece4d5` |
| Border | `--border` | `#e2d8c6` |
| Strong border | `--border-strong` | `#cbbda5` |
| Control border | `--border-control` | `#9a8b72` |
| Primary text | `--ink` | `#232019` |
| Secondary text | `--ink-soft` | `#5f5749` |
| Metadata | `--ink-faint` | `#6a6152` |
| Night accent | `--night` | `#1a2b33` |
| Primary action | `--primary` | `#4e6247` |
| Primary hover | `--primary-hover` | `#42553c` |
| Primary active | `--primary-active` | `#374731` |
| Focus | `--focus` | `#7c4a22` |
| Danger | `--danger` | `#a13b26` |
| Danger hover | `--danger-hover` | `#8a3120` |

Status colors use an ink, background, border, and rail tone. The rail tone drives the card rail, the calendar dot, and the lane segment.

| Status | Ink | Background | Border | Rail |
| --- | --- | --- | --- | --- |
| Overdue | `#9a3420` | `#f8e6de` | `#e3b5a6` | `#b8492f` |
| Buy now | `#8a5208` | `#f8ead0` | `#e2c48e` | `#c98a2e` |
| Watch | `#3d5a73` | `#e6ecee` | `#b9c8d0` | `#5f7d94` |
| Steady | `#46603f` | `#e7eedd` | `#bccdb0` | `#6b8562` |
| Learning | `#5f5749` | `#efe8da` | `#d6cbb6` | — |

Every `horizon-{zone}` element sets `--zone`, `--zone-ink`, `--zone-bg` and `--zone-border`, so cards and calendar items share one zone vocabulary.

### Typography

- One system sans family: `-apple-system, BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI", system-ui, Roboto, "Helvetica Neue", Arial, sans-serif`. There are no web fonts. Named platform faces come before `system-ui` because some machines remap `system-ui` to a non-UI font.
- Body: `16px / 1.55`.
- Page title: `30px / 1.15`, weight `750`, `-0.015em` tracking. It drops to `26px` at phone width.
- Section title: `20px / 1.25`, weight `700`.
- Item title: `17px / 1.3`, weight `700`.
- Button: `14px`, weight `700`.
- Label: `12px`, weight `700`, uppercase, `0.08em` tracking.
- Metadata, hints, and errors: `12–13px / 1.4`.
- Dates, quantities, prices, intervals, and model values use `font-variant-numeric: tabular-nums`.

### Geometry

- Base rhythm: `4`, `8`, `12`, `16`, `20`, `24`, `32`, `40`.
- Control radius: `12px`.
- Inner panel, calendar day, and toast radius: `14px`.
- Card and panel radius: `18px`.
- Dialog radius: `20px`.
- Form control height: `46px`.
- Desktop button height: `42px`.
- Mobile primary action height: `48px`.
- App container: `min(1248px, 100%)` with 24px gutters, which gives a 1200px content width.

### Elevation

| Layer | Shadow |
| --- | --- |
| Card at rest | 1px inset highlight, `0 1px 2px` and `0 4px 14px` warm shadow at 5–6% |
| Card hover | Inset highlight, `0 2px 4px` and `0 10px 24px` warm shadow at 7–9% |
| Dialog | `0 24px 60px rgba(35, 28, 18, 0.28)` |
| Toast | `0 10px 28px rgba(35, 28, 18, 0.16)` |
| Mobile action dock | `0 -6px 24px rgba(35, 28, 18, 0.1)` |

### Motion

| Moment | Timing | Effect |
| --- | --- | --- |
| Control state | 160ms standard ease | Color, border, shadow |
| Card hover | 220ms out-expo | Lift by 1–2px and deepen the border |
| View change | 220ms out-expo | Fade with a 6px rise |
| Dialog open | 180ms out-expo | Fade with a 10px rise and backdrop fade |
| Toast | 3400ms timeline | Rise in over the first 6%, fade out over the last 8% |
| Today marker | 3.2s loop | Faint pulse ring |
| Logo | 7s loop | Owl-Moon breathing |

- Motion communicates state, presence, or the current moment only.
- `prefers-reduced-motion: reduce` removes view, dialog, and toast animations, the pulse, the breathing, and hover transforms. Transitions become near-instant.

## Shell and layout

### Header

- Sticky paper header, 72px minimum height on desktop.
- Brand, segmented pill navigation, task actions, and the demo utility sit in one scan line on desktop. A hairline divider sets the utility apart.
- The active navigation button has a paper fill on the parchment track and sets `aria-current="page"`.
- At tablet width, the header becomes two rows: brand, actions, and utility on top, with navigation below.
- At phone width:
  - brand and utility stay at the top, and the subtitle hides;
  - primary navigation fills the row and scrolls horizontally if needed;
  - **Add item** and **Log purchase** sit in a fixed bottom action dock;
  - `.app-frame` reserves `--dock-height` of bottom padding so the dock never covers content.

### Dashboard order

1. Page title and task context.
2. Summary ledger: four connected cells in one bordered panel.
3. Ranked restock queue.
4. Fourteen-day restock calendar.

### Breakpoints

| Width | Behavior |
| --- | --- |
| Above 1120px | Restock cards use a three-column decision layout. |
| 981–1120px | Restock cards use two columns, with method and actions spanning the bottom. |
| 661–980px | The header becomes two rows, and the summary, ideas, and analysis grids use two columns. |
| 660px and below | Single-column content, a fixed action dock, history rows as labeled cards, stacked fields, and sticky 48px dialog actions. |

## Components

### Buttons

| Variant | Use | Treatment |
| --- | --- | --- |
| Primary | The one most important action in an area | Filled sage, paper text |
| Secondary | Common supporting action | Paper surface, warm strong border, charcoal text |
| Ghost | Tertiary or low-frequency action | Transparent, secondary text, parchment hover |
| Danger | Destructive confirmation | Filled terracotta, paper text |

Required states:

- Default, hover, active (a 1px press), and focus-visible (a 3px amber outline).
- Disabled: parchment surface, faint text, `not-allowed` cursor.
- Busy: `aria-disabled="true"`, an active label, `progress` cursor, and repeated submits prevented.

### Form fields

- The label sits above the control as uppercase tracked text.
- The hint sits below the control.
- An error replaces or augments the hint and names the recovery.
- Every error is associated with its control through `aria-describedby`.
- Every invalid control sets `aria-invalid="true"`.
- Inputs and selects are 46px tall and stay at 16px on mobile to prevent input zoom.
- Selects use a drawn chevron and native behavior.

| State | Treatment |
| --- | --- |
| Default | Paper surface, warm control border, soft inner shadow |
| Hover | Darker border |
| Focus | Amber border and a 3px amber focus ring |
| Disabled | Parchment surface, faint text, `not-allowed` cursor, explanation nearby |
| Invalid | Terracotta border, warm red tint, field-level recovery text |
| Busy | Form `aria-busy`, submit `aria-disabled`, active verb label |

### Restock Horizon Lane

- The lane has four segments sized `7fr 3.5fr 4fr 6.5fr`, matching Overdue (−7 to 0), Buy now (0 to 3), Watch (4 to 7) and Steady (8 to 14 days). That lines them up with the Today marker position from `app.js`.
- The active zone segment has full color and its label turns zone-colored. Other segments stay visible at about 32% strength.
- A night Today marker carries a small “Today” label and a faint pulse ring.
- The lane is always supported by the predicted date, the due chip, the status chip, and the confidence note.
- It is not a progress bar and never implies certainty.

### Status chips

- Prediction chips use the status ink, background, and border.
- Maturity chips are outline-only: solid for Learned, dashed for Learning.
- Chips are never the only status signal.

### Restock card

- Desktop: identity and status, the horizon lane, then the method and actions (separated by a hairline divider).
- A 4px inset rail in the zone tone runs down the left edge. It is a pseudo-element inside the padding, not a border.
- The item name opens detail.
- **Log purchase** is secondary, and **Details** is ghost.

### Restock calendar

- A fourteen-day horizontal strip of paper day cards, 148px wide. Only the calendar viewport scrolls horizontally.
- Past-due items appear in a dedicated terracotta card at the front.
- Today uses a 2px sage border, a light sage tint, and a night numeral.
- Each item is a small button with a zone dot, the name, and zone-colored due text.
- Clear days read “Clear”.

### One-time ledger

- Rows share one paper panel and are separated by hairlines.
- Checkboxes are native inputs styled as 26px circles, which turn sage with a drawn check when checked.
- Active items sort before completed items.
- Completed items stay visible with muted, struck-through names.

### Item detail

- Back navigation and item identity lead.
- Prediction, rhythm, and product intelligence use paper analysis cards with hairline fact rows.
- The chart sits on quiet paper with a warm hairline grid.
  - Observed purchases are charcoal points.
  - The fitted rhythm is a solid sage line.
  - The projection is a dashed amber line ending in an amber ring.
- Purchase history is a semantic table on wide screens. At phone width, rows display as labeled cards built from `data-label`.
- Delete is destructive and requires confirmation.

### Dialogs

- Use the native `<dialog>` element.
- Width: `min(640px, 100vw - 32px)`. The confirmation dialog is `min(460px, 100vw - 32px)`.
- Maximum height: `min(780px, 100vh - 40px)`.
- Backdrop: `rgba(31, 25, 16, 0.5)`.
- Dialogs have no border. The sheet is defined by its soft elevation alone.
- The header holds the title and close control. The footer holds Cancel and one primary action.
- Actions are always sticky at the bottom of the scrolling sheet, and on mobile they become 48px tall and full width.

### Empty states

An empty state must explain:

1. why the surface is empty;
2. what the user can do next;
3. which action is unavailable.

Empty states use quiet paper with a dashed warm border. They are inline and actionable, so a toast may confirm an action but is never the recovery path.

### Toasts

- Toasts are small paper chips with a strong border, a 4px semantic inset rail, and text.
- Success uses the sage rail, and errors use the terracotta rail.
- On mobile, toasts span the width above the action dock.

## Accessibility floor

- Meet WCAG AA contrast for text and controls.
- Use visible amber focus on every interactive element.
- Use semantic headings, buttons, labels, tables, and forms.
- Focus the first useful control when a dialog opens, and restore focus to the trigger when it closes.
- Announce busy and success states politely.
- Keep every task keyboard-complete.
- Respect `prefers-reduced-motion`.

## Anti-goals

- No marketing redesign inside product flows.
- No new UI framework, package, icon library, or web font.
- No gradients, glass panels, glow, or decorative charts.
- No dark-mode toggle.
- No custom form widgets where native controls work.
- No Unicode glyph or emoji icon system.
- No unexplained disabled state.
- No toast-only recovery path.
- No color-only status.

## Change control

1. Update `DESIGN.md` first for durable token or visual-world changes.
2. Update this contract for component, state, layout, or accessibility rules.
3. Update `docs/ux-flows.md` for task and state changes.
4. Apply the change to code.
5. Verify desktop, tablet, and phone behavior before calling the work complete.
