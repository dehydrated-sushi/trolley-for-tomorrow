# Meals Module Changelog

All notable changes to the `frontend/src/modules/meals` module are documented here.
Follows semantic versioning as defined in the root README.

---

## [1.4.0] — 2026-04-24

### Added — Favourites modal with sort, filter, and inline recipe detail

- **Trigger pill** in the filter row — shows `★ N favourites` and only renders when `favouriteIds.size > 0`. Springy hover (`y: -1, scale: 1.04`), scale-in entrance, scale-out exit via `AnimatePresence`.
- **New `FavouritesModal.jsx`** — scrim with `backdrop-blur-sm`, modal scales in from `0.96, y: 12`. Max-width 3xl, max-height 88 vh, flex-column layout so the filter bar stays fixed and the list scrolls.
- **Filter grammar mirrors the Meals page**: tag chips (derived client-side from nutrition fields via `deriveTags()` — protein ≥ 25, carbs < 20, calories < 300 / ≥ 600, minutes ≤ 15, sugar > 25, n_ingredients ≤ 5, name-regex fallback for drink), Hide-drinks toggle, Clear-filters shortcut. Sort dropdown reuses the Meals-page `SortDropdown` with four options: Recently starred (default, by `favourited_at` desc), Highest protein, Lowest calories, Highest calories. Filter + sort runs client-side against the payload the parent already fetched — no extra network calls.
- **Detail view inside the modal** — clicking any row crossfades the list for a full recipe view: hero image (`/api/meals/recipe-image/:id`, gradient fallback on 404), title + meta row (minutes, ingredient count, kcal), derived tag pills, 2-column ingredients grid with stagger-fade-in, numbered steps with per-step delay, and a 2/4-column nutrition grid. Back button or Escape returns to the list; scroll position in the list is preserved. A sticky footer "Open on Meals page" button jumps to `/meals?highlight=<id>` for users who want the recommendation context.
- **Works even when the recipe isn't on the current Meals page** — the modal is fed entirely from `/api/profile/favourites`, independent of pagination or filter state on the Meals surface. Prior behaviour (nav to Meals + highlight) silently failed when the card wasn't in the currently-rendered page.
- **Escape handling layered** — first press closes the detail view, second closes the modal. Body scroll locked while open.

### Changed — Deep-link `?highlight=<id>` auto-expands the target card

- `RecipeCard` now watches its `highlighted` prop and flips both `expanded` and `ingredientsExpanded` to true on transition. Landing on a collapsed card after following a popover / favourites-modal "Open on Meals page" link would have required a second click; users now land with ingredients + steps fully open.
- The existing scroll + emerald shadow-pulse animation is unchanged.

### Added — `favouriteRecipes: array` alongside `favouriteIds: Set<number>`

- `MealsPage` now keeps the full favourited-recipe records in state (sourced from the `favourites` field of `/api/profile/favourites`). Passed to `FavouritesModal` so it can render full detail without a second fetch.
- `handleToggleFavourite` updates both states atomically. On add, the current record is lifted from `recommendations` into the array with a freshly-set `favourited_at` so "Recently starred" ordering is correct before the next refetch lands.

### Notes

- Tag computation in `FavouritesModal::deriveTags` intentionally duplicates `meal_plan.routes._compute_tags` thresholds. If backend thresholds shift, mirror them here. The 'drink' tag is a name-regex fallback (`smoothie|juice|tea|coffee|cocktail|…`) because the favourites endpoint doesn't run ingredients through the classifier.
- `detailRecipe` is ephemeral state inside the modal — closing the modal resets it. URL-routing a `?recipe=<id>` param was considered and rejected to keep the modal as a pure local UI state.
- `favouriteRecipes` is the source of truth for the modal, but `favouriteIds` remains the cheap membership-check for the `RecipeCard` star. Keep both in sync on every mutation.

---

## [1.3.0] — 2026-04-23

### Added — Favourite star + add-to-shopping-list on recipe cards

- **Favourite star button** in the title row of each `RecipeCard`, right-aligned opposite the recipe name. Empty grey outline when not favourited, filled amber when favourited. Optimistic toggle via `PUT` / `DELETE /api/profile/favourites/<id>` with a state revert + error toast on failure. `aria-pressed` reflects the current state; `aria-label` flips between "Add to favourites" / "Remove from favourites".
- **"Still need" line rebuilt as clickable chips.** Each missing ingredient renders as a chip with a `+` icon; clicking adds the ingredient to the user's localStorage shopping list with a toast + Undo action. Chips for ingredients already in the shopping list render as muted emerald "✓ {name}" pills and are non-interactive.
- **"Add all missing"** button below the chips — batch-adds every missing ingredient on the card at once, skipping anything already in the list. Toast summarises the result (`Added 3 items` or `Added 2 · 1 already in list`), with Undo that removes the freshly-added subset only (not the pre-existing matches).
- **Deep-link highlight via `?highlight=<recipe_id>`** — when the Shopping page's rail-popover links land on `/meals?highlight=<id>`, the Meals page scrolls that card into view and runs a 1.6 s emerald shadow-pulse. Consumed and cleared from the URL immediately (`setSearchParams({ replace: true })`) so a page refresh doesn't re-trigger the highlight; a local `activeHighlight` state carries the animation through to completion.

### Added — MealsPage-level state

- `favouriteIds: Set<number>` fetched once from `/api/profile/favourites` on mount. Passed per-card as `isFavourited={favouriteIds.has(meal.id)}`.
- `shoppingSet: Set<string>` — lowercased-trimmed snapshot of the current shopping list. Subscribes to `shared/shoppingList.js` changes so adds from other components or tabs keep the chip UI in sync. Passed per-card; `RecipeCard` checks `shoppingSet.has(name)` to decide chip state.
- `cardRefs: Map<number, HTMLElement>` — callback-ref map, used by the highlight scroller.

### Notes

- Duplicate-add fires a `shopping:flash` CustomEvent carrying the existing item's id. The Shopping page listens for this and pulses the matching row yellow for 850 ms, so an attempted double-add from Meals gives visual grounding on the other side. No-op when Shopping page isn't mounted.
- The favourite toggle endpoint is called as `apiFetch(url, { method: 'PUT' | 'DELETE' })` — the existing `apiFetch` passes options straight to `fetch()` so no wrapper changes were needed.

---

## [1.2.0] — 2026-04-23

### Added — Pixabay recipe hero photos

- **`RecipeHeroImage`** component overlays each recipe card's hero with a
  photo fetched from the new backend `/api/meals/recipe-image/:id` endpoint.
  Absolutely positioned over the existing gradient + category-icon layer; a
  300 ms fade-in on successful load, and the component returns `null` on
  `onError` so a 404 response reveals the gradient hero underneath. No
  broken-image placeholder, no layout shift.
- **`loading="lazy"`** on the overlay `<img>` so off-screen cards don't
  trigger Pixabay round-trips until scrolled into view — keeps the first
  page load from making 20 synchronous image requests.
- **Match-score / shopping badges moved to `z-10`** so they remain above
  both the gradient icon and any loaded photo.
- **Pixabay attribution line** below the recipe grid — *"Recipe photos from
  Pixabay. Cards without a match fall back to a category-coloured hero."*
  Required by Pixabay's API TOS whenever their photos are displayed; also
  tells the user *why* some cards lack photos so missing photos read as
  design, not bug.
- **`API_BASE` import from `src/lib/api.js`** — `apiFetch` returns JSON, but
  an `<img src>` needs the raw absolute URL, so we bypass the fetch wrapper
  for this one element.

### Notes

- Zero new npm dependencies. Feature is a `useState` + `<img>` element.
- When `PIXABAY_API_KEY` is absent in the backend environment every image
  request 404s and every card falls back to the pre-existing gradient +
  category-icon hero. The frontend cannot tell the difference between
  "known-negative" (Pixabay had no hit) and "feature disabled" — and
  doesn't need to.
- Pixabay's corpus is stock food photography, not per-recipe photos.
  Expect ~30–40 % of cards to show the gradient fallback on unusual recipe
  names (`smurf juice`, heavily-modified dish names, etc.). This is a
  corpus limitation, not a bug.

---

## [1.1.1] — 2026-04-23

### Changed

- **Sort set rationalised from 5 → 4 options.** Removed `Quickest` and `Fewest missing ingredients`; added `Highest calories` as the inverse pair to `Lowest calories`. `Fewest missing` was dropped because it duplicated the default `Best match` ordering *and* partially overlapped with the `Cook without shopping` filter — three knobs for one fridge-completion dimension. Minutes-based sorting was dropped by product call.
- **`TAG_STYLES` and `TAG_STYLE_FALLBACK` moved to `frontend/src/shared/recipeTags.js`** so the filter chips and the legend popover's new "Recipe tags" section share one source of truth.
- **Two tag icons changed** for semantic accuracy:
  - `low_carb`: `grain` → `grass`; palette switched from amber to lime (`bg: #ecfccb`, `fg: #65a30d`). The grain icon depicted the thing being reduced — confusing.
  - `simple`: `looks_one` (a "1") → `format_list_bulleted`. The rule is ≤ 5 ingredients, not 1.
- **Recipe-card meta strip:** the `egg` icon next to the "N/M in fridge" line was ambiguous. Replaced with `kitchen` (refrigerator) to match the label literally.
- **Legend button now shows recipe tags too.** `<NutritionLegend recipeTagDefs={tagDefs} />` passes the `/api/meals/tags` response through; the legend renders a second section under the ingredient categories.

### Notes

- Frontend `SORT_OPTIONS` must match backend `SORT_KEYS`. If someone hits the API with the retired `quickest` or `fewest_missing` keys, the backend silently falls back to `match`.
- `NutritionLegend` is still used elsewhere without recipe tags (e.g. homepage). The `recipeTagDefs` prop is optional; passing nothing hides the new section, preserving existing call sites.

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
