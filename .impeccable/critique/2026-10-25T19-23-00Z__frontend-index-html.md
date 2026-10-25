# Design Critique: `frontend/index.html`

Method: dual-agent (A: 3759e3d5-3d71-4d5f-bb41-9f49d320a8b1 · B: ea17cb18-d5d8-40d6-a8fc-7ce3ef91dfb2)  
Date: 2026-10-25T19:23:00Z  
Evaluators: Design Review Director (`3759e3d5-3d71-4d5f-bb41-9f49d320a8b1`) & Detector and Verification Inspector (`ea17cb18-d5d8-40d6-a8fc-7ce3ef91dfb2`)  
Synthesis Score: **38 / 40 (Exceptional)**  

---

## 1. Design Health Score

| # | Heuristic | Score (0–4) | Key Issue / Observation |
|---|---|:---:|---|
| 1 | **Visibility of System Status** | **4 / 4** | **Exceptional.** Horizon Lane reflects statistical maturity (`Learning · 1 of 3` vs `Strong rhythm · 84% R²`). Rich undo toasts report calculated next restock dates. Submits trigger dynamic loading labels. |
| 2 | **Match System & Real World** | **4 / 4** | **Exceptional.** Tactile household ledger metaphor. Natural relative dates ("Tomorrow", "Due today", "In 3 days", "2 days overdue"). |
| 3 | **User Control & Freedom** | **4 / 4** | **Exceptional.** Full CRUD lifecycle for items and purchase events. Individual purchase editing and deletion with defensive modal confirmation, instant regression recalculation, and 1-click Undo toast. |
| 4 | **Consistency & Standards** | **4 / 4** | **Exceptional.** Strict adherence to Warm Ledger tokens. Tabular numerals enforced across all dates, intervals, prices, and metrics. Form layout and dialog parity across all 4 dialogs. |
| 5 | **Error Prevention** | **4 / 4** | **Exceptional.** Case-insensitive duplicate item detection prevents collisions during creation and editing. Purchase dates capped at today via `max` attribute. Irrelevant threshold fields disabled for one-time items. |
| 6 | **Recognition Rather than Recall** | **4 / 4** | **Exceptional.** "Next Up" card isolates the immediate household decision so users avoid mental math. "Log last" accelerator pre-populates previous quantity and non-zero price. |
| 7 | **Flexibility & Efficiency** | **3 / 4** | **Good.** "Log last" provides 1-click routine entry. Live client-side queue search. Range toggle (7 vs 14 days) adapts the horizon. Lacks global hotkeys (`/` to search) and direct log shortcuts from calendar items. |
| 8 | **Aesthetic & Minimalist Design** | **4 / 4** | **Exceptional.** Unwavering discipline. No cartoon mascots, gradients, or dark-mode gimmickry. SVG trendline exposes only essential axes, points, and projection. |
| 9 | **Recognize, Diagnose, & Recover from Errors** | **4 / 4** | **Exceptional.** Clear, humane inline field errors linked via `aria-describedby` and `aria-invalid`. 1-click Undo toast enables instant recovery from deletions. |
| 10 | **Help & Documentation** | **3 / 4** | **Good.** Contextual guidance integrated into empty states, field hints, and progressive disclosure details (`How this estimate works`). No standalone onboarding tour needed. |
| **Total** | | **38 / 40** | **Exceptional (Production-Grade)** |

---

## 2. Design Specificity Verdict

**Verdict:** **Deeply Grounded (Bespoke Product Truth)**  
Hoot’s interaction patterns and visual structures cannot be reskinned as a generic task manager, ERP pantry tracker, or shopping checklist without dismantling its foundational architecture:

- **Asymmetrical Horizon Lane:** Measures temporal distance to depletion based on discrete purchase interval time series, rather than 0–100% stock decrement.
- **Quarantined One-Time Needs:** Irregular supplies (birthday candles, light bulbs) are structurally isolated on an unmodeled checklist to prevent seasonal noise from corrupting OLS regression slopes.
- **Warm Ledger Materiality:** Restrained cream canvas (`#f5efe3`), night ink (`#1a2b33`), and geometric moon-crescent mask create a calm, watchful kitchen presence.

---

## 3. Cognitive Load & Emotional Journey

- **Working Memory Load:** Minimal. The visual continuum of the Horizon Lane offloads temporal math from working memory to perceptual recognition.
- **Decision Architecture:** Strictly follows the "One Primary Action Rule." On the populated dashboard, only one filled Sage primary button exists in the viewport (Next Up card). All secondary staples use ghost or secondary controls.
- **High-Stakes Reassurance:** Editing or deleting purchase history rows provides absolute reassurance: modal confirmation explains that regression math updates immediately, the chart recalculates in real-time, and an Undo toast remains available for 6.4 seconds.

---

## 4. Standout Strengths

1. **Fixed-Anchor Horizon Lane:** Fixing the nocturnal "Today" marker at the Overdue/Buy-Now seam (33.33%) while scaling the background zones across −7 to +14 days transforms regression math into an intuitive physical timeline.
2. **"Log Last" Accelerator:** Pre-populating the modal with previous quantity and non-zero price saves significant store-aisle friction without bypassing conscious verification.
3. **Reversible Purchase History Outlier Controls:** Enabling users to correct or delete rogue purchases with instant slope recalculation and 1-click Undo resolves the anxiety of permanent prediction skew.

---

## 5. Priority Issues & Technical Recommendations

### [P1] Navigation Continuity & Mobile Action Dock Disappearance in Item Detail View
- **Issue:** On mobile (`max-width: 660px`), the sticky bottom action dock is suppressed in Item Detail (`#view-item`). Primary actions ("Log purchase", "Edit", "Delete") sit at the bottom of the page beneath the OLS regression chart and table.
- **Fix:** Keep a persistent contextual action dock in Item Detail containing "Log purchase" and "Edit".

### [P1] Calendar Item Interaction Friction (Detail Navigation vs. Direct Action)
- **Issue:** Tapping an item in the Restock Calendar strip (`.calendar-strip`) always navigates to the full Item Detail screen.
- **Fix:** Allow clicking calendar items to surface a lightweight popover or direct "Log purchase" option to preserve calendar context.

### [P2] Search Zero-State Hierarchy Ambiguity
- **Issue:** When a search query yields no matches, the global Next Up card remains rendered above "No matches for 'xyz'".
- **Fix:** Dim or label the Next Up card as "Global priority (unfiltered)" during active search when it does not match the query.

### [P2] Price Input Affordance in Purchase Modals
- **Issue:** "Total price" is a raw `<input type="number">` without a currency prefix symbol (`$`).
- **Fix:** Add a static tactile prefix addon (`$`) inside the input container.

### [Code Quality] `clearFieldErrors` Selector Bug in `frontend/app.js`
- **Issue:** Line 1225 uses `$$("input[aria-invalid]", form)`. If a `<select>` (like `#purchase-item`) is marked invalid, its `aria-invalid` attribute is not removed on reset.
- **Fix:** Change to `$$("[aria-invalid]", form).forEach(control => control.removeAttribute("aria-invalid"))`.

---

## 6. Deterministic Detector Findings
- **Scan Status:** 0 errors, 10 advisories.
- **Analysis:** All 10 advisories flag tactile highlight (`rgba(255,255,255,...)`) and warm shadow (`rgba(58,44,24,...)`) pigments, which are deliberate material specifications of the Warm Ledger design system.
- **Craft Floor Invariants:** Touch targets $\ge 44\text{px}$ satisfied across mobile and coarse pointers; dual-coding enforced; native modal focus management verified.
