# Fridge Module Changelog

All notable changes to the `frontend/src/modules/fridge` module are documented here.
Follows semantic versioning as defined in the root README.

---

## [1.2.0] — 2026-04-27

### Added

- Virtual fridge now groups high-confidence similar products into one card. Exact product-name matches group together, and receipt rows with the same `matched_name` group only when `match_score >= 0.9`.
- Grouped cards show combined quantity, combined price, a `N similar` badge, and a short "Includes ..." hint while still preserving the original receipt rows behind the scenes.

---

## [1.1.0] — 2026-04-24

### Added — Manual add / edit / delete for fridge items

- **`+ Add item`** button in the Fridge page header opens a modal — no navigation to a separate page, no form avalanche. Single row of inputs: name (required, autofocused), quantity, price. Quantity is a free-text field to match the existing receipt review schema (`"1"`, `"500 g"`, `"2 pack"` all valid).
- **Live category classification** via a 300 ms debounced `GET /api/ingredients/classify?name=<name>`. A spinner appears in the input while the request is in flight. Once the category arrives, a coloured pill materialises next to the name input with a spring scale-in animation. Clicking the pill opens an override popover with all seven categories; a manual override sticks until the name is cleared / replaced.
- **Duplicate-name detection** runs case-insensitively against the current fridge state. A tertiary-container banner surfaces inline under the inputs with a **+1 existing** shortcut — PATCHes the existing item's quantity by parsing the leading integer and incrementing (graceful fallback to appending " +1" when qty is non-numeric like "500 g"). The banner does not block adding as a separate entry; user can just hit Save.
- **Card-fly-to-grid morph** on save — the Add button's bounding rect is captured as the ghost's origin; after the POST succeeds the new card is prepended to the grid and a fixed-position `FridgeCardMorph` ghost flies from the origin to the first grid cell over 650 ms with a scale dip + fade-out. Teaches the eye that the save landed in the grid; the real card fades up in place underneath once the ghost clears.
- **Hover actions on each card** — pencil icon (edit) and × icon (remove) appear top-right on hover/focus-within. Edit reopens the same modal in `initialItem` mode, pre-filled and PATCH-bound.
- **Inline undo on delete**, 4 s window. No confirm dialog. The clicked card overlays with a surface-container-highest panel showing "Removed {name}" + an **Undo** pill, plus a linear 4 s progress bar along the bottom edge. Undo cancels the pending DELETE; otherwise a timer fires the real request and hard-removes the row.
- **Empty state refreshed** — two CTAs side-by-side ("Add item" gradient + "Upload receipt" muted), replacing the single upload-receipt path. Manual-add is now a first-class entry point into the fridge.

### Added — AR scan preview modal (iteration 2 placeholder)

- **`Scan fridge` button** in the Fridge header (dark on-surface pill with a `preview` cyan badge) opens `ARScanModal.jsx`.
- **Cyberpunk theatrics**, deliberately cyan-accented (not the app's emerald) so it reads as a different system temporarily taking over:
  - **Entry curtain**: modal scales from `scaleY: 0.02` to `1` over 400 ms, evoking a display powering on.
  - **Boot text**: `AR_SYSTEM_BOOTING...` typewrites character-by-character at 55 ms/char, then swaps to solid-cyan `AR_SYSTEM_ACTIVE` once the sequence completes.
  - **Scan line sweep**: a 2 px cyan gradient bar with 22 px glow sweeps top-to-bottom in 1.5 s, then repeats on a 1.8 s loop once detections are visible (sells the "still running" vibe).
  - **Bracket corners**: four L-shapes (18 px arms, 2 px stroke, cyan glow via drop-shadow) bracket each detection with a 40 ms stagger between corners. Centre dot pulses on a 1.8 s cycle.
  - **Detection cards**: glassmorphic (backdrop-blur, 78%-opacity dark bg), monospace uppercase for system text, display font for item names. Cyan border for new detections, emerald border for existing items with a `✓ SAVED` chip.
  - **HUD**: status pill top-left, preview ribbon top-center (`PREVIEW · SHIPPING IN ITERATION 2`), FPS/LAT counter bottom-right with realistic number flicker (±1 fps, ±3 ms, jittering every 500–900 ms).
  - **Centre crosshair** always on between scans — 4 corner marks + pulsing cyan dot.
- **Synthesized fridge backdrop** — dark radial gradient + three horizontal shelf lines + four stylized item silhouettes (apple / milk / chicken / yogurt) built from CSS. Zero photo dependencies — the modal is self-contained and doesn't require a real fridge image to look convincing.
- **Attempt-to-add banner**: clicking any detection card's `+ ADD` button drops a cyan-bordered glassmorphic banner from the top — `ITERATION 2 FEATURE · Real-time fridge scanning ships in our next release. For now, add {name} manually via the + button.` Auto-dismisses after 3 s. The banner is the only honest-truth surface; everything else is preview-as-theatre.
- **`prefers-reduced-motion` fallback**: skips curtain, boot-text typewriter, scan-line sweep, and the bracket/card stagger. Lands directly on the detected state. Visual polish is preserved (brackets + cards still render, HUD still lives); only the animated transitions are dropped.
- **Escape + scrim-click to close**, body scroll locked while open.
- **Zero backend** — no endpoints, no DB, no calls. This is pure demo theatre that works offline.

### Notes for maintainers

- The fly-to-grid ghost uses the actual grid's first cell (the `gridStartRef` ref on `visible[0]`) as the morph target. Target rect is captured inside a `requestAnimationFrame` so React has a chance to commit the prepended item before we measure.
- The category override chip has two states visually — auto-detected (no pencil icon) vs manually overridden (pencil icon). Typing a new name resets the override so classification runs again. If you ever persist category server-side, flow the user's override into the POST body.
- Undo timers live in a `useRef`'d Map (`deleteTimersRef`) so cleanup on unmount fires any outstanding deletes. Without that, a mid-window route-away would leave ghost rows on the backend after a refresh.
- `ARScanModal` is self-contained — all detections, coordinates, and copy are hardcoded in `DETECTIONS` at the top of the file. Editing demo content is a single-file diff.
- The AR modal deliberately uses inline Tailwind-compatible hex colours (`rgb(34, 211, 238)` for cyan, `rgb(52, 211, 153)` for existing-item emerald) rather than palette tokens because it's a deliberately *different* colour system. Don't "fix" this to use theme tokens — it would blend the modal back into the app and lose the "something else took over the screen" feel.
- For iteration 2's real version: the frontend state machine (`stage: booting | scanning | detected`) is ready to swap hardcoded `DETECTIONS` for a live stream from a backend detection endpoint. Most of the UI work is already done.
