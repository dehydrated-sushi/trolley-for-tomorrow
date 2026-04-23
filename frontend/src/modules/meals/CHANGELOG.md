# Meals Module Changelog

All notable changes to the `frontend/src/modules/meals` module are documented here.
Follows semantic versioning as defined in the root README.

---

## [1.1.0] — 2026-04-23

Post-user-test polish pass: blank-page fix, filter-bar redesign, real nutrition popover backed by the actual `recipes` nutrition columns, and a custom sort dropdown replacing the native `<select>`.

### Fixed

- **Blank `/meals` route on first render.** `<AnimatePresence>` was used in `MealsPage.jsx` without being imported. React threw `AnimatePresence is not defined` and the entire page rendered empty. Import line updated to `import { motion, AnimatePresence } from 'framer-motion'`.

### Added

- **`NutritionPopover.jsx`** — hover/focus popover wrapping the recipe card's meta strip. Reads six % Daily Value columns (`protein`, `carbohydrates`, `total_fat`, `sugar`, `saturated_fat`, `sodium`) plus `calories` from the meal response; converts %DV → grams via FDA `DV_GRAMS` reference amounts, then to kcal per macro (4/4/9) before computing each macro's share of total energy. Renders a stacked macro bar, per-macro rows, and an "Also in this serving" detail block for sugar / saturated fat / sodium. `computeMacros()` is exported separately for reuse.
- **`SortDropdown.jsx`** — themed accessible dropdown with open-on-click, close-on-outside/Escape, staggered option entrance, rotating chevron, and a ✓ on the selected option. `role="listbox"` / `role="option"` / `aria-selected` / `aria-haspopup` / `aria-expanded`. Replaces the native `<select>` used in 1.0.0. `onChange(key)` signature (not a synthetic event).
- **Active-sort indicator pill** — `Sorted by <label> ✕` appears below the filter rows whenever `sortKey !== 'match'`. Clicking it resets to Best match. Addresses the previously-silent sort change.
- **`FilterChip` component** — white pill with category-coloured icon when inactive, fully filled on active. Spring hover-lift and tap snap; Material Symbols variable-font flips to `FILL 1` on active.
- **"Still need: …" summary on each recipe card** — one inline line listing only the missing ingredients. When nothing is missing, a green "You have everything to make this" pill is shown instead. The full ingredient list with ✓ ticks + category badges is preserved behind a "View all N ingredients" disclosure.

### Changed

- **Filter bar redesigned** from the 1.0.0 unified-single-row into two explicitly labelled rows — `Show` (global modes + sort on the right) and `Recipe type` (tag chips). No enclosing card, no drop-shadow — a lighter treatment that gives the fold back to the recipe grid. Old dashed-outline inactive style replaced with white pill + coloured icon.
- **`drink` tag filtered out of the tag row.** Exposing both a positive-`Drink` chip and a negative-`Hide drinks` mode on the same page was actively confusing; the tag still exists in `TAG_DEFINITIONS` backend-side, it's just hidden in the filter UI.
- **Meta line restructured** into `[fridge summary toggle] · [Diet: …] · [N recipes · showing X–Y]`. Removes the separate "Ranked Recommendations" section heading from 1.0.0 and moves the results count into the meta line.
- **Expanded fridge panel** moved into the filter section and restyled as a light translucent container (was a bordered white card in 1.0.0).
- **`SortDropdown.onChange` signature is `(key) => void`,** not an event. `MealsPage` wires it inline, so the `handleSortChange(e)` helper from 1.0.0 is deleted.

### Removed

- `CategoryTag` import (unused after 1.0.0 removed the per-card "Recipe by category" block that consumed it).
- `handleSortChange(e)` helper (superseded by `SortDropdown`'s direct-key `onChange`).

### Notes

- The 1.0.0 maintainer note *"The Meals page has no framer-motion animations"* is superseded. This release uses framer-motion in `FilterChip`, `RecipeCard`, `NutritionPopover`, `SortDropdown`, the sort-indicator pill, the fridge-expand panel, and the ingredient disclosure. **No parent-level `variants={stagger}` / child `variants={riseIn}` pattern is used** — the Dashboard regression trigger is deliberately avoided.
- DB nutrition values in `recipes` are stored as **% Daily Value, not grams** — except `calories`, which is raw kcal. Any feature surfacing nutrition must either route through `NutritionPopover.computeMacros` or clearly label the unit as `%DV`.
- Sort is computed server-side. A Flask process returning a response *without* a `sort` field is the symptom of a backend that pre-dates the sort-param implementation (`base_response` also won't contain `strict_count` or `one_missing_count`). Restart the backend after pulling `routes.py` changes.
- `SORT_OPTIONS` in `MealsPage.jsx` must stay in sync with `SORT_KEYS` in `backend/modules/meal_plan/routes.py`.

---

## [1.0.0] — 2026-04-23

First tracked release of the meals module at module level. Prior scaffolding
(`MealsPage.jsx`, `RecipeCard` sub-component, `TagPill` sub-component, tag
filter chips, pagination) was introduced during iteration 1 and documented
at `frontend/CHANGELOG.md` level only. This entry records the iteration 2
overhaul: voice rewrite, filter-row unification, sort controls, informative
header, and collapsed ingredients panel.

### Added

- **`SORT_OPTIONS` constant + sort dropdown** in the recommendations header.
  Five keys mirror the new backend `?sort=` contract: `match` (default),
  `quickest`, `fewest_missing`, `highest_protein`, `lowest_calories`.
  Selection triggers a fresh `/api/meals/recommendations?sort=...` request
  and resets pagination to page 1.
- **Informative "Ranked Recommendations" header** driven by the new backend
  `strict_count` and `one_missing_count` fields. Copy adapts:
  - `strict_count > 0` → "*N recipes match everything in your fridge*"
  - `strict_count === 0 && one_missing_count > 0` → "*N recipes need just 1 more item*"
  - neither → "*Top matches from your fridge*"
  - `total === 0` → "*No matching recipes*"
  Supplementary line shows "N more need just 1 item · Showing X–Y of Z".
- **"No dietary filters active" indicator** shown when the user has no
  dietary preferences set. Previously the section rendered nothing in that
  state — silent state is bad state. A quiet grey line with an "Edit in
  Profile" link replaces the void.
- **"No shopping" / "Need N items" pills** on each recipe card, layered
  under the existing `85% MATCH` pill on the hero image. Emerald "✓ No
  shopping" when `match_count === total_ingredients`, amber "🛒 Need N
  items" otherwise. Communicates the frugal story without price data.
- **`fridgeExpanded` toggle + summary line** on the "Your fridge
  ingredients" card. Collapsed by default; summary reads "*N ingredients ·
  strongest in X and Y*" with a "View all" expand. Summary computed in a
  `useMemo` from the category distribution of the fridge items, top two
  non-"other" categories picked.
- **Single "Clear filters" link** in the filter row that resets Cook
  without shopping, Hide drinks, AND any selected tag chips in one action.
  Only rendered when at least one filter is active.

### Changed

- **Headline** from "What's Cooking, Friend?" to **"Smart meals from your
  fridge"** — green accent moved from "Friend?" to "from your fridge".
  Matches the direct, pragmatic voice of the rest of the app.
- **"Cook Now" button renamed to "Cook without shopping"** — less techy,
  more descriptive of what the filter does (restrict to 100 % match).
  Inline-CTA variant in the empty state changed from "Turn off Cook Now"
  to **"Allow shopping"** to match.
- **Unified single filter row.** Previously: `Cook Now`, `Hide drinks`, and
  dietary badges on one section, a second section with a "FILTER BY:"
  label and the tag chips. Now: one section containing `Cook without
  shopping`, `Hide drinks`, and all eight recipe-property tag chips
  together. All share consistent inactive styling (dashed outline, 50 %
  opacity, coloured text on transparent bg) and active styling (filled
  background with white text, slight scale-up). Semantic differences
  (strict matching vs content toggle vs recipe-property tag) are preserved
  via distinct colour palettes (emerald / indigo / tag palette) but
  visually everything behaves like one group of filter toggles.
- **Dietary preferences indicator demoted** to a quieter second row below
  the filters. If prefs are active: small tertiary badges + "Edit". If
  none: a grey "No dietary filters active · Edit in Profile" line. It is
  settings metadata, not a page filter, and the visual treatment now
  reflects that.
- **`handleSortChange` and `sortKey` state** added to the page component;
  the `useCallback` recommendation-loader depends on `sortKey` so filter
  changes and sort changes re-fetch identically.
- `base_response` handling expanded to read `data.strict_count` and
  `data.one_missing_count` into new local state, falling back to 0 if the
  backend does not provide them.

### Notes

- The Meals page **has no framer-motion animations**. An earlier attempt
  to add stagger on the recipe grid was reverted after an unrelated
  Dashboard regression. Re-add with care (test on a single card first
  before converting the grid).
- `SORT_OPTIONS` in this file must stay in sync with `SORT_KEYS` in
  `backend/modules/meal_plan/routes.py`. Adding a sort requires editing
  both.
- **No price is displayed** on this page. Deferred to a later iteration.
  The budget angle is carried by the "No shopping" / "Need N items"
  badges on each recipe card.
- The page re-fetches on every filter / sort / page change. Loading state
  is visible often; existing "Finding recipes from your fridge..."
  animate-pulse text is retained.
