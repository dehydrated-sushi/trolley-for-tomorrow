# Receipt Module Changelog

All notable changes to the `frontend/src/modules/receipt` module are documented here.
Follows semantic versioning as defined in the root README.

---

## [1.2.0] — 2026-04-27

### Added — Receipt session linkage

- Stores the `receipt_id` returned by `/api/receipts/parse` and sends it to `/api/receipts/commit`, so confirmed receipt rows attach to the exact OCR scan session.
- Clears the stored session id when users remove a file, discard a draft, upload another receipt, or switch to manual entry.
- Adds a receipt-session history panel on the upload page, backed by `/api/receipts/sessions`, so the latest scan sessions are visible from the frontend.
- Receipt-session rows can now be opened to show the bought items saved under that session.
- OCR review rows now display the formatted product name from the receipt and show the matched known ingredient as a small hint underneath when available.

---

## [1.1.0] — 2026-04-24

### Added — Post-commit shopping-list reconciliation panel

- **New panel** renders in `phase === 'done'` between the "Added to your fridge" header and the navigation buttons. Visible only when the items the user just committed intersect at least one **unchecked** item on their shopping list (via `shared/shoppingList.js::findUncheckedMatches`). No matches → no panel, clean.
- **Default state**: every match's checkbox is pre-ticked, so the common case ("I bought everything I planned") is one click ("Cross off N") away. Individual checkboxes for the edge cases (forgot, substituted, changed mind).
- **Animated checkbox row** — the tick scales in from `scale: 0, rotate: -45` when selected; each row fades + slides up in sequence via variant stagger (50 ms between rows).
- **Bulk-check via `markChecked(ids)`** from `shared/shoppingList.js` — one write, one subscriber notification. Shopping page picks it up via its existing `subscribe` hook.
- **Post-confirm collapse**: after "Cross off" fires, the full panel collapses to a small secondary-container pill: "Shopping list updated · View list" with a link to `/shopping`. Gives the user clear feedback without leaving the receipt success screen.
- **"Not now"** button dismisses the panel without mutating the list — information-preserving fallback when the user doesn't want to reconcile right now.
- **Match-source caption** under each row: `matched to "bell pepper red" on your receipt` — so the user can audit the matcher's guess before confirming. Important because the matcher is deliberately loose (any one meaningful token in common counts).

### Notes for maintainers

- Matching uses the OCR-confirmed names from `validRows`, not raw OCR output — the review step is the source of truth.
- The matcher itself lives in `shared/shoppingList.js`. Tightening or loosening thresholds is a shared concern across surfaces that consume it — do not fork the logic locally.
- Reconciliation state (`matches`, `selectedIds`, `reconciled`) is cleared by `resetFlow()` so "Upload another" produces a clean slate.

---

## [1.0.0] — 2026-04-23

First tracked release of the receipt module at module level. Prior scaffolding
(`UploadReceiptPage.jsx`, the parse + commit two-step flow, basic drop zone
with filename display, editable review table) was introduced during iteration 1
and documented only at `frontend/CHANGELOG.md` level. This entry records the
iteration 2 overhaul: copy cleanup, real drag-and-drop, client-side validation,
thumbnail preview, and honest scan-line animation on the user's own receipt.

### Added

- **Drag-and-drop on the drop zone.** Four handlers (`onDragEnter`,
  `onDragOver`, `onDragLeave`, `onDrop`) route a dropped file through the same
  `applyFile()` validation used by the file picker. The zone's "Drop your
  receipt here" copy is no longer false advertising.
- **Client-side file validation.** `applyFile(selected)` rejects non-`image/*`
  MIME types and anything over 10 MB, surfacing friendly errors in the
  existing status banner. Invalid files never reach `/api/receipts/parse`.
- **Mobile camera hint.** `<input accept="image/*" capture="environment">`
  opens the rear camera on supported mobile browsers (`.pdf` removed because
  the backend OCR pipeline does not process PDFs).
- **Receipt thumbnail.** A 160×160 preview of the uploaded image, rendered
  via `URL.createObjectURL(file)`. A dedicated `useEffect` creates the URL on
  file change and calls `URL.revokeObjectURL` on cleanup so no object URLs
  leak. Replaces the previous filename-only display.
- **Remove button.** Small `×` top-right of the thumbnail calls
  `handleRemoveFile()` to clear the file and reset the input. Icon rotates
  90° on hover (scoped `group/remove` so the outer drop-zone `group`
  behaviour is untouched).
- **Drag-over visual state.** The drop zone scales to 1.01 with a spring,
  flips its border from dashed outline-variant to solid primary, tints its
  background `primary/10`, swaps the cloud icon for a pulsing `download`
  icon, and changes its copy to "Drop it here / Release to upload".
- **Cross-fade between drop-zone states.** `AnimatePresence mode="wait"`
  transitions between the empty / dragging / file-selected content so there
  is no jump-cut when a file is picked or dropped.
- **Scanning-line animation during OCR.** While `phase === 'parsing'`, an
  emerald gradient line sweeps top-to-bottom across the user's own thumbnail
  with a 14 px emerald glow (1.4 s loop, linear ease). A 10 %-primary tint
  overlay confirms the receipt is being processed. The animation disappears
  the moment the real `/api/receipts/parse` response lands — it is tied to
  the state machine, not a timer.
- **Scan button wake-up pulse.** When `applyFile()` successfully sets a new
  file, the primary Scan button pulses (`scale 1 → 1.04 → 1`, 450 ms) via
  `useAnimation()` imperative controls. Triggered by the real state change
  (disabled → enabled), not by elapsed time.
- **Review-table row stagger.** When OCR finishes and the review phase
  mounts, each draft row animates in (scale 0.97 → 1, y 8 → 0, 60 ms
  between rows). Editing existing rows does not re-trigger the animation.
- **Discard button red hover tint.** Hover switches to
  `bg-error-container/40 text-error` — semantic signal that the action
  destroys the draft.

### Changed

- **Page title** from "New Receipt." to **"Upload a receipt"** (verb-first,
  removes the design-affectation full-stop).
- **Subtitle** rewritten to drop the "OCR" jargon. New copy:
  *"Drop in a photo of your grocery receipt and we'll pull out the items.
  You review and confirm before anything hits your fridge."*
- **File-types hint** from "PNG, JPG, or PDF from any Australian retailer."
  to **"PNG or JPG. A clear, well-lit photo works best."** — removed the
  false PDF support claim and the unsupportable "Australian retailer"
  promise.
- **"How it works" step 2** from "OCR reads the items and shows them to you"
  to *"We read the items and show them to you. Nothing is saved yet."*
- **Warning panel** flipped in tone. Title: "OCR isn't perfect" →
  **"You have the final say"**. Body: *"Once we scan it, you can fix
  names, quantities, and prices before anything saves."* Reframes a
  disclaimer as a feature (review step) rather than an apology.
- **Scan button label is phase-aware.** "Choose a file first" when no file
  is selected, "Scanning receipt..." while parsing, "Scan receipt" when
  ready.
- **Header "Cancel" renamed to "Discard draft"** and only rendered during
  `phase === 'review'`. Nothing to cancel in idle / parsing / committing,
  so the button would have been confusing there. "View fridge →" still
  renders on `done`.
- Em-dashes removed from inline copy where they made the page sound
  machine-written. Replaced with periods where the sentence reads cleanly
  as two clauses.

### Notes

- The scan-line animation is **tied to the real parsing phase** only. There
  is no fake progress bar, no rotating phase labels (e.g. "Checking
  prices…" / "Matching ingredients…" — those phases don't exist in the
  backend pipeline), and no `setTimeout`-driven theatre.
- The scan button pulse and review-row stagger similarly respond to real
  state transitions rather than arbitrary timers.
- `applyFile()` is called from both `handleFileChange` (picker) and
  `handleDrop` (drag-and-drop) so validation and the success pulse fire in
  both flows.
- `URL.createObjectURL` is paired with `URL.revokeObjectURL` inside the
  preview `useEffect` cleanup to prevent memory leaks across file changes.
- `capture="environment"` is a hint, not a constraint — iOS Safari and
  Chrome Android still show both "Take Photo" and "Photo Library" options
  so users with prepared receipt photos can still upload from the gallery.
