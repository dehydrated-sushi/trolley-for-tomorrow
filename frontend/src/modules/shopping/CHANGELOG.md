# Shopping Module Changelog

All notable changes to the `frontend/src/modules/shopping` module are documented here.
Follows semantic versioning as defined in the root README.

---

## [2.1.0] — 2026-04-24

### Changed — Hierarchy pass

- **Each rail renders as its own card** — white `surface-container-lowest` surface, rounded-3xl, 1 px `outline-variant/15` border, subtle shadow. Breaks the "three rails on a flat page background" look into three clearly containerised recommendation sources.
- **Coloured icon badge** per rail (emerald `#059669` for staples, indigo `#6366f1` for complete-a-recipe, amber `#f59e0b` for favourites) in a soft-tinted `w-10 h-10 rounded-2xl` slot. Uses filled Material Symbols for presence.
- **Display-weight headers** replace the old all-caps `text-[10px]` kickers. Font-extrabold, `font-headline`, tracking-tight, leading-tight. Subheads drop to lighter `text-on-surface-variant` at 12–14 px.
- **"Your list" divider** — a horizontal rule with em-dashes framing a small centred caption. Signals the zone change between recommendations (upper) and the user's actual list (lower).
- **"Suggestions for you" kicker** above the rails grid, preserved as a small all-caps caption — the one place the high-hierarchy uppercase style still earns its keep.

### Added — Motion language pass

- **Rail entrance stagger** — the three rails now fade + slide up with 90 ms staggered delay on page mount. `staggerChildren` variants on the grid wrapper; each `Rail` consumes the variant. Replaces the previous simultaneous fade-up.
- **Strikethrough wipe on check** — replaces the CSS `line-through` class with an animated 1.5 px bar positioned absolutely over the item name. `scaleX` animates 0 → 1 with `transform-origin: left` over 280 ms; reverses cleanly on uncheck. The name's text colour separately crossfades between `rgb(15, 23, 42)` (on) and `rgba(30, 41, 59, 0.5)` (off).
- **Amber flash with horizontal shake** replaces the old yellow pulse on duplicate-add. Softer amber (`rgba(251, 191, 36, *)`) + shake (`x: [0, -4, 4, -3, 3, 0]` keyframes, 600 ms, easeOut). Triggered by the shared `shopping:flash` CustomEvent from either rail chips or Meals-page `+` attempts.
- **Chip-to-list morph** — clicking `+` on any rail chip now flies a ghost pill from the chip's rect to the "Your list" heading over 600 ms with a scale dip + fade-out. Implementation:
  - `RailItem.handleAdd` captures `event.currentTarget.getBoundingClientRect()` and bubbles it up.
  - `ShoppingListPage.handleRailAdd(name, source, fromRect)` adds the item, queries `listTargetRef.current.getBoundingClientRect()` for the destination, and sets `morph` state with source + target rects.
  - New `<MorphGhost>` component (at the end of the file) mounts a fixed-position motion.div using the source rect as initial values, animates to the target rect, and clears state `onAnimationComplete`.
  - Graceful fallback: if either rect is missing (user scrolled way past the list, for example) the morph is skipped silently.

### Notes for maintainers

- The yellow-→-amber colour swap for the duplicate-flash is deliberate — amber feels softer and less alarming for what is fundamentally a "no-op but acknowledge" interaction.
- `MorphGhost` captures the target rect once on mount, so mid-flight page scrolls will miss the destination. Acceptable at current scroll velocity; revisit with a live rect calculation if it becomes noticeable.
- Rail cards inherit their coloured icon from the `accent` prop — extending with a fourth rail type is a 3-prop call (`title`, `accent`, `icon`).

---

## [2.0.0] — 2026-04-23

Page rebuilt from a passive "here's what the top 5 recipes are missing" aggregation into a two-zone interactive shopping experience.

### Added — Three recommendation rails (top zone)

- **"You buy this often"** — staples from `receipt_items` frequency + recency analysis. Empty by default on fresh installs; renders meaningful copy ("Upload a few more receipts…") instead of going blank.
- **"Complete a recipe"** — missing ingredients from the top match-scored recipes, ranked so items that unlock multiple recipes at once float to the left.
- **"From your favourites"** — missing ingredients across every recipe the user has starred on the Meals page via the new `/api/profile/favourites` endpoints.
- **Hover / focus popover** on rails 2 and 3 reveals a "Completes N recipes" list with up to 5 clickable recipe names. Each link routes to `/meals?highlight=<id>`, and the Meals page scrolls to that card and runs a 1.6 s emerald shadow-pulse on arrival — closing the loop from "what should I buy" → "what will I cook with it."
- **Skeleton pulses** during the rails-loading window (three 8-wide grey chips per rail with staggered `animationDelay`) so the page never shows an empty rail silhouette while the API call is in flight.

### Added — Manual shopping list (bottom zone)

- **Text-to-add input** with a submit button and Enter-to-add keyboard handling. Input is classified instantly via a local keyword map (`shared/shoppingList.js::_KEYWORD_MAP`); misses fall through to "Other" and are re-classified asynchronously via the backend `/api/ingredients/classify` endpoint — no input lag.
- **Items grouped by nutritional category**, using the same palette/icon set from `shared/nutrition.js` (`protein`, `vegetables`, `fruits`, `grains`, `fats`, `beverages`, `other`). Checked items drop to the bottom of their group with a strikethrough; unchecked items stay up top, alphabetical within section.
- **Source badge** on non-manual items (`recipe`, `staple`, `favourite`) so the provenance of each list item is visible at a glance.
- **Clear-checked / Clear-all** controls in the section header. Clear-all requires a confirm dialog; clear-checked fires silently with a toast.
- **localStorage persistence** via `shared/shoppingList.js` with versioned key `trolley_shopping_list_v1`. Subscribes to cross-tab `storage` events so changes in one tab propagate to others automatically.

### Added — Shared primitives

- **`shared/Toast.jsx`** + **`shared/toastBus.js`** event bus, mounted once in `AppShell.jsx`. Fixed bottom-right slot, 3 s auto-dismiss, replaces-latest semantics, optional action button (used for "Undo" on add actions). Supports three tones: `default` (emerald), `muted` (surface), `error` (error-container). `aria-live="polite"` so screen readers announce without interrupting.
- **`shared/shoppingList.js`** — localStorage-backed shopping list CRUD with a local keyword classifier and async backend refinement. Exposes `addItem`, `removeItem`, `toggleChecked`, `clearChecked`, `clearAll`, `hasItem`, `findByName`, `getItems`, `subscribe`.

### Changed — Shopping list is now fed from two directions

- **From Meals**: each missing ingredient on a recipe card is a clickable `+` chip → fires `addItem(name, { source: 'recipe' })` → toast with Undo. "Add all missing" button adds everything on that card at once with a batch-count toast.
- **From rails**: same `+` mechanism; rail items with `source` tagging (`staple`, `recipe`, `favourite`) persist that provenance into the list item for the source badge.
- **Duplicate-add**: any attempted add of an existing item (from Meals or rails) silently skips the insert, dispatches a `shopping:flash` CustomEvent carrying the existing item's id, and shows a muted toast. The Shopping page listens for the flash event and paints a 850 ms yellow pulse on the matching row — visual grounding so the user can see exactly which existing item they tried to re-add.

### Notes for maintainers

- The old `/api/shopping/list` endpoint is still served by the backend but this page no longer calls it. It stays alive in case any teammate's code references it.
- `CATEGORY_ORDER` at the top of the file controls the vertical order of category groups. Matches the order used on the Meals page legend. Keep in sync if either changes.
- Popover positioning is absolute with `left-0 top-full mt-2 z-30` — adequate for the current page width but could collide with right-edge viewport boundaries on extra-wide monitors. Revisit with a smart-flip if it becomes an issue.
- `RailItem` reads localStorage synchronously on every render via `inShopping(item.name)`. Fine at current scale (sub-millisecond for ~20 items); if the list ever grows to hundreds, lift the check into a memoised Set in `ShoppingListPage`.
