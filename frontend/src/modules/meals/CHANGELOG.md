# Meals Module Changelog

All notable changes to the `frontend/src/modules/meals` module are documented here.
Follows semantic versioning as defined in the root README.

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
