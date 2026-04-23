# Frontend Changelog

All notable changes to the frontend module are documented here.
Follows semantic versioning as defined in the root README.

---

## [1.7.0] — 2026-04-23

### Added — Pixabay recipe hero photos (graceful fallback)

**Module:** `frontend/src/modules/meals`

- **`<RecipeHeroImage recipeId={id} />`** overlays every recipe card's hero with a photo fetched from the new backend endpoint `/api/meals/recipe-image/:id`. The image is absolutely positioned over the existing gradient-plus-category-icon layer, so when the request returns 404 (backend has no Pixabay match, or `PIXABAY_API_KEY` isn't set), the component unmounts itself and the gradient hero shows through — no broken-image placeholder, no layout shift.
- Image fades in over 300 ms on load (`opacity-0` → `opacity-100`) so there's no hard pop when a cached photo arrives.
- `loading="lazy"` on the `<img>` so off-screen cards don't trigger Pixabay round-trips until they scroll into view — important for the 20-per-page grid so the backend isn't slammed with 20 simultaneous Pixabay calls on first load.
- Match-score / "No shopping" / "Need N items" badges moved to `z-10` so they remain above both the gradient icon and any loaded photo.

### Added — Pixabay attribution line

**Module:** `frontend/src/modules/meals`

- Muted single-line credit below the recipe grid: *"Recipe photos from Pixabay. Cards without a match fall back to a category-coloured hero."* Required by Pixabay's API TOS ("show your users where the images and videos are from, whenever search results are displayed") and also tells the user *why* some cards have photos and some don't — so missing photos read as a deliberate design choice, not a bug.
- Only rendered when the grid actually has at least one recipe; empty-state doesn't need the disclaimer.

### Notes

- The frontend now imports `API_BASE` from `src/lib/api.js` so the hero `<img>` can hit the absolute backend URL directly. `apiFetch` stays unchanged; `<img>` can't flow through it because we need the raw URL, not a JSON response.
- No new dependencies. The whole feature sits on an `<img>` element plus `useState`.
- If `PIXABAY_API_KEY` is absent in the backend's environment, every `/api/meals/recipe-image/:id` call returns 404 and every card falls back gracefully. The feature is fully optional — nothing breaks when the key isn't there.

---

## [1.6.1] — 2026-04-23

### Changed — Meals page sort set rationalised; tag icons + egg icon fixed; legend expanded

**Module:** `frontend/src/modules/meals`, `frontend/src/shared`

- **Sort options reduced from 5 to 4** to remove redundancy with the `Cook without shopping` filter and the default match ordering:
  - Removed `Quickest` (ranking by minutes) and `Fewest missing ingredients` (ranking by `total - match_count`, which duplicated the default `Best match` ordering and was essentially a fuzzier version of the `Cook without shopping` filter).
  - Added `Highest calories` as the inverse pair to `Lowest calories`.
  - Final set: `Best match` (default), `Highest protein`, `Lowest calories`, `Highest calories`.
- **`TAG_STYLES` extracted to `frontend/src/shared/recipeTags.js`** so the filter chips on the Meals page and the new "Recipe tags" section in the legend share one source of truth. Also exported `TAG_STYLE_FALLBACK` to replace the inline literals.
- **Two tag icons corrected:**
  - `low_carb`: `grain` (amber cluster of dots — it literally depicts the thing being reduced) → **`grass`** (lime green `#65a30d` / bg `#ecfccb`). Signals plant/veggie focus instead of carbs.
  - `simple`: `looks_one` (a "1" in a square — arbitrary, since the rule is ≤ 5 ingredients, not 1) → **`format_list_bulleted`**. Reads as "short list".
- **Recipe-card meta strip** — the `egg` icon next to "2/4 in fridge" read as "egg", not "fridge items". Replaced with `kitchen` (refrigerator glyph) to match the label.

### Added — Recipe tags in the Legend popover

**Module:** `frontend/src/shared`

- `NutritionLegend` now accepts an optional `recipeTagDefs` prop. When provided (Meals page passes `tagDefs` from `/api/meals/tags`), a second "Recipe tags" section renders below the ingredient-level categories, with each tag's icon, label, and rule description. The `drink` tag is hidden in this section to stay consistent with the filter row (`Hide drinks` covers the negative case).
- Legend popover retitled from "Nutritional categories" → "Legend"; the previous heading becomes an uppercase section header. Added `max-h-[70vh] overflow-y-auto` so the taller popover doesn't clip on short viewports.

### Notes

- Backend sort keys and frontend sort options must stay in lockstep. The `meal_plan` backend now advertises exactly four: `match`, `highest_protein`, `lowest_calories`, `highest_calories`. URLs with the retired `quickest` or `fewest_missing` silently fall back to `match`.

---

## [1.6.0] — 2026-04-23

### Fixed — Blank Meals page on load

**Module:** `frontend/src/modules/meals`

- `MealsPage.jsx` used `<AnimatePresence>` without importing it. React threw `AnimatePresence is not defined` on first render and the entire `/meals` route rendered empty. Import fixed to `import { motion, AnimatePresence } from 'framer-motion'`. This was the root cause of the "page shows blank" report from the last user test.

### Added — Real nutrition popover and custom sort dropdown

**Module:** `frontend/src/modules/meals`

- **`NutritionPopover.jsx`** — hover/focus popover wrapping each recipe card's meta strip. Reads six percent-Daily-Value columns (`protein`, `carbohydrates`, `total_fat`, `sugar`, `saturated_fat`, `sodium`) plus raw-kcal `calories` from the meal response; converts %DV → grams via FDA reference amounts, then to kcal per macro (4/4/9) before computing each macro's share of total energy. Renders a stacked macro bar, per-macro rows (grams · kcal · % of macro calories), and an "Also in this serving" block. Exports `computeMacros()` separately for reuse.
- **`SortDropdown.jsx`** — themed Framer-Motion dropdown replacing the native `<select>`. Click-outside close, Escape close, stagger-in option entrance, rotating chevron, `✓` on the selected option. Accessible: `aria-haspopup`, `aria-expanded`, `role="listbox"`, `role="option"`, `aria-selected`.
- **Active-sort indicator pill** — when `sortKey !== 'match'`, a small `Sorted by <label> ✕` pill appears below the filter bar. Click to reset to Best match. Addresses the user-visible problem that changing sort felt silent.
- **`FilterChip` component** — white pill with category-coloured icon when inactive, fully filled on active. Spring hover-lift (`y: -1`, `scale: 1.02`) and tap snap. Material-symbols icon variable-font flips to `FILL 1` when active to reinforce the state change.

### Changed — Filter bar redesigned (two explicit groups, lighter treatment)

**Module:** `frontend/src/modules/meals`

- Filter section rebuilt from the 1.5.0 heavy-card single row into **two clearly labelled rows with no wrapping card**:
  - **Show** — global modes (`Cook without shopping`, `Hide drinks`) with the `Sort` dropdown pushed right.
  - **Recipe type** — the tag-chip group.
- **`drink` tag filtered out of the tag row.** `Hide drinks` already covers the sensible use case; exposing both a positive-`Drink` chip and a negative-`Hide drinks` mode on the same page was a UX conflict flagged during review.
- **Meta line consolidated** into a single horizontal row: fridge summary toggle · `Diet: …` · results count (`N recipes · showing X–Y`). The separate "Ranked Recommendations" header from 1.5.0 is gone; the count now lives in the meta line.
- **Expanded fridge panel** restyled as a light translucent container (was a bordered white card in 1.5.0) that sits under the meta line when toggled open.

### Changed — Recipe card ingredient block

**Module:** `frontend/src/modules/meals`

- The always-on full ingredient list (with category-coloured ✓ ticks) is **collapsed behind a "View all N ingredients" disclosure** by default. The default view now shows a single summary line:
  - `Still need: <comma-separated missing items>` — when some ingredients are missing, or
  - `You have everything to make this` — when `match_count === total_ingredients`.
- Rationale: in a fridge-keyed experience, the useful delta is *what's missing*. Showing every ingredient on every card duplicated information already conveyed by the hero match badge and `Need N items` pill.

### Removed

**Module:** `frontend/src/modules/meals`

- Unused `CategoryTag` import (the per-card "Recipe by category" block that used it was already removed in 1.5.0's layout pass).
- `handleSortChange(e)` native-select handler — `SortDropdown`'s direct-key `onChange` replaces it.

### Notes for maintainers

- **This release reintroduces framer-motion animations on the Meals page.** The 1.5.0 maintainer note stating "The Meals page has no framer-motion animations" is superseded. Animations in use: `FilterChip` spring hover, `RecipeCard` hover lift, match-score pill scale-in, `NutritionPopover` slide-in, `SortDropdown` stagger + chevron rotate, sort-indicator enter/exit, fridge-expand height animation, ingredient-disclosure expand. **No parent-level `variants={stagger}` / child `variants={riseIn}` pattern is used** — the Dashboard regression from 1.3.0 is deliberately avoided.
- DB nutrition values in the `recipes` table are **% Daily Value, not grams** (except `calories`, which is raw kcal). Any consumer surfacing nutrition must either route through `NutritionPopover.computeMacros` or clearly label the unit as `%DV`.
- Sort is computed server-side. A Flask process returning a response without a `sort` field indicates the backend pre-dates the sort-param implementation (`base_response` won't contain `sort`, `strict_count`, or `one_missing_count` either). Restart the backend after pulling `routes.py` changes. Symptom during this iteration: sort dropdown appeared to do nothing.
- `SORT_OPTIONS` in `MealsPage.jsx` must stay in sync with `SORT_KEYS` in `backend/modules/meal_plan/routes.py`.

---

## [1.5.0] — 2026-04-23

### Added — Meals page overhaul + sort dropdown

**Module:** `frontend/src/modules/meals`

- **Sort dropdown** in the recommendations header. Five options wired to the new backend `?sort=` param: Best match (default), Quickest, Fewest missing ingredients, Highest protein, Lowest calories.
- **Informative recommendations header** driven by backend counts (`strict_count`, `one_missing_count`) — reads *"3 recipes match everything in your fridge"* / *"5 recipes need just 1 more item"* / *"Top matches from your fridge"* / *"No matching recipes"* depending on the data shape.
- **No-dietary-prefs indicator** — when a user has no dietary filters set, the page now explicitly shows "No dietary filters active · Edit in Profile" instead of staying silent.
- **"No shopping" / "Need N items"** pills on each recipe card, layered under the existing match-% pill. Green for 100% match, amber for partial. Communicates the frugal story without needing price data.

### Changed — Meals page copy, layout, and filter UX

**Module:** `frontend/src/modules/meals`

- Headline "What's Cooking, Friend?" → **"Smart meals from your fridge"** (green accent on "from your fridge").
- "Cook Now" button renamed to **"Cook without shopping"** (less techy, more descriptive of its behaviour). Also updates the empty-state CTA from "Turn off Cook Now" to **"Allow shopping"**.
- **Unified single filter row** replaces the previous two-row layout. `Cook without shopping`, `Hide drinks`, and the eight recipe-property tag chips all sit in one wrapping row with consistent inactive styling (dashed outline + 50% opacity) and active styling (filled + white text + slight scale). The "FILTER BY:" label is gone. A single "Clear filters" link resets all three filter types at once.
- "Your fridge ingredients" card **collapsed by default** to a single line summary ("38 ingredients · strongest in proteins and beverages") with a "View all" toggle. Expanding shows the full pill list. Gives the fold back to the actual recipes.
- Dietary preferences indicator demoted to a smaller quieter line below the filter row — it's settings metadata, not a page filter.

### Changed — Shared shell and navigation

**Module:** `frontend/src/shared`

- `SideNav.jsx` labels unified with the top nav terminology. Previously: `Overview / Receipts / Inventory / Recipes / Settings`. Now: `Dashboard / Virtual Fridge / Upload Receipt / Meal Plans / Shopping List / Profile`.
- Dropped the "Kitchen Manager / Australian Household" placeholder header from the side nav.
- `AppShell.jsx`: `DevResetButton` now rendered only in dev mode via `{import.meta.env.DEV && <DevResetButton />}`. Production builds strip it entirely so a mentor can't accidentally click it mid-demo and wipe the database.

### Notes for maintainers

- The Meals page relies on two new response fields from the backend: `strict_count` (recipes with 100% fridge match) and `one_missing_count` (recipes missing exactly one ingredient). If the backend endpoint loses them, the informative header silently falls back to generic copy but won't crash.
- Frontend `SORT_OPTIONS` in `MealsPage.jsx` must stay in sync with backend `SORT_KEYS` in `meal_plan/routes.py`. Adding a sort requires editing both.
- The Meals page has **no framer-motion animations**. An earlier attempt caused a Dashboard regression (cards stuck at opacity 0 via `motion.create(Link)` + parent variants). If reintroduced, test on a single card first.
- No price data is shown anywhere on the page. Deferred to a later iteration. The "frugal story" is currently carried by the "No shopping" / "Need N items" badges on recipe cards.

---

## [1.4.0] — 2026-04-23

### Changed — Receipt upload page overhauled (copy, validation, animations)

**Module:** `frontend/src/modules/receipt`

- **Copy refresh.** All user-facing "OCR" jargon removed across the page (subtitle, step 2 in "How it works", warning panel). Page title changed from "New Receipt." to **"Upload a receipt"**. Subtitle rewritten to *"Drop in a photo of your grocery receipt and we'll pull out the items. You review and confirm before anything hits your fridge."* File-types hint dropped the false "PNG, JPG, or PDF from any Australian retailer" claim and now reads *"PNG or JPG. A clear, well-lit photo works best."* (backend does not support PDFs; no `pdf2image` in `backend/requirements.txt`). Warning panel flipped from the apologetic "OCR isn't perfect" to the proactive **"You have the final say"**.
- **Scan button is context-aware.** Label now reads "Choose a file first" when no file is selected, "Scan receipt" when ready, and "Scanning receipt..." during OCR.
- **Discard button.** The header action renamed from generic "Cancel" to **"Discard draft"** and is now only rendered during the `review` phase (it made no sense in idle/parsing/committing). "View fridge →" still shows on `done`.

### Added — Drag-and-drop, client-side validation, thumbnail preview

**Module:** `frontend/src/modules/receipt`

- Drag-and-drop handlers wired to the drop zone (`onDragEnter`, `onDragOver`, `onDragLeave`, `onDrop`). The zone's "Drop your receipt here" copy is no longer false advertising.
- Client-side file validation via a new `applyFile()` helper: accepts `image/*` MIME types only; caps size at 10 MB. Friendly error messages ("That doesn't look like a photo…", "That file is X.X MB…") surface in the existing status banner.
- `<input accept="image/*" capture="environment">` — removed `.pdf` (matches updated copy), added `capture` hint so mobile devices offer the rear camera.
- File preview thumbnail (160×160) via `URL.createObjectURL(file)`, managed through a `useEffect` that cleans up with `URL.revokeObjectURL` on unmount/change so there are no memory leaks.
- `×` remove button on the thumbnail to clear the file and reset state.

### Added — Animations (all tied to real state, no theatre)

**Module:** `frontend/src/modules/receipt`

- Drop zone scales 1.01 with a spring and border flips from dashed outline-variant to solid primary when a file is dragged over.
- Three content states (empty / dragging / file-selected) cross-fade via `AnimatePresence mode="wait"`.
- Scanning-line overlay on the user's actual receipt thumbnail during `parsing` phase — emerald gradient line sweeps top-to-bottom (1.4s loop) with a 14px glow and a 10%-primary tint. Reuses the visual language of HeroDemo but applied to the user's own photo.
- Scan button pulses (`scale 1 → 1.04 → 1`) the moment the file state becomes valid. Fired imperatively inside `applyFile()` via `useAnimation()` controls — it responds to a real state change, not a timer.
- Review-table rows stagger in when the review phase mounts (scale 0.97 → 1, y 8 → 0, 60ms per row).
- `×` remove-button icon rotates 90° on hover (scoped `group/remove` so it doesn't collide with the outer drop-zone `group`).
- Discard button tints red on hover via the existing `error-container` / `error` MD3 tokens.

### Changed — Dashboard copy (for wording consistency with receipt page)

**Module:** `frontend/src/modules/dashboard`

- "How it works" step 2 on the dashboard sidebar: "OCR scans and adds items to your fridge" → **"We read the items and add them to your fridge"**. No other dashboard changes.

### Removed — Orphaned profile files carrying fake data

**Module:** `frontend/src/modules/profile`

- Deleted `useBudget.jsx` — contained hardcoded `spent = 84.60` mock value and was never imported.
- Deleted `ProfileForm.jsx` — contained hardcoded `'Karl Wang'` / `'karl@example.com'` / `'42.10'` defaults, used `localStorage` instead of the API, and was not routed in `App.jsx` (the `/profile` route points to `dashboard/myProfile.jsx`). Both deletions verified safe with a grep for active imports across `frontend/src/`.

### Notes for maintainers

- An attempt to add framer-motion animations to Dashboard, Fridge, Meals, Shopping, and MyProfile was reverted after the Dashboard bento grid rendered invisibly. Cause: `motion.create(Link)` with parent `variants={stagger}` and child `variants={riseIn}` — cards stayed in the `hidden` state (opacity 0). The same pattern works on HomePage, so the specific trigger is unclear. Before retrying that pattern anywhere, test locally on a single card first, or wrap a regular `<Link>` inside a `<motion.div>` rather than converting the Link itself.
- The Receipt page scan-line animation is **tied to the real `phase === 'parsing'` state** only. When the backend responds, the overlay disappears. There is no fake progress bar, no `setTimeout`-driven phase rotation, and no fabricated percentages on this page.

---

## [1.3.0] — 2026-04-22

### Added — Shared modal components

**Module:** `frontend/src/shared`

- `PrivacyPolicyModal.jsx` — scrollable legal-style modal opened from the "Privacy Policy" footer link. Fixed header + scrollable body + fixed footer layout. Slate colour palette, deliberately neutral (not emerald). Closes on Escape, backdrop click, or close button. Locks body scroll while open.
- `MadeByModal.jsx` — credits/colophon modal opened from the new "Made by" footer link. Cinematic dark-cosmic theme (navy→purple gradient with amber, cyan, and pink accents) deliberately contrasting the app's emerald palette. Three drifting blurred gradient orbs in the background, blur-to-focus title entry, spring-staggered team names with per-member LinkedIn support, scroll-triggered section reveals scoped to the modal body (via `viewport.root`), custom scrollbar. Saubhagya Das's row links to LinkedIn (opens in a new tab) with a hover `↗` arrow indicator; other members render as plain text until their LinkedIn URLs are added to the `TEAM` array.

**Module:** `frontend/src/modules/home`

- `HowItWorksModal.jsx` — "Coming soon" placeholder modal wired to the previously-dead "See How It Works" hero button. Explains that the full interactive walkthrough ships with Iteration 2.

### Added — Landing-page scroll-triggered entrance animations

**Module:** `frontend/src/modules/home`

- Hero left column staggers in on mount (badge → headline → description → CTA buttons) using framer-motion `variants` with a `staggerChildren` parent.
- Feature section heading fades up on scroll-into-view.
- Feature bento grid staggers in as children when the grid enters the viewport.
- "Smart Receipt Parsing" budget bar animates width `0 → 75%` when the card is 50% visible.
- CTA section fades + scales in when scrolled to.
- All viewport configs use `once: true` plus an `amount` threshold (0.15–0.5) to prevent fast-scroll flicker that occurred when we briefly experimented with reverse-on-exit animations.

### Added — Clickable feature bento cards

**Module:** `frontend/src/modules/home`

- All five feature cards in the bento grid converted to `MotionLink` (via `motion.create(Link)` from framer-motion v12) routing to real app pages:
  - The Virtual Fridge → `/fridge`
  - Smart Receipt Parsing → `/upload-receipt`
  - Budget Benchmarks → `/profile`
  - Meal Planning → `/meals`
  - Community Insights → `/shopping` (placeholder; this feature is not implemented — card copy may need updating or replacing)
- Each card has a snappy hover lift (`y: -6` with spring stiffness 380, damping 26) and shadow growth. Clickability is now visually obvious.

### Changed — CTA section rewrite

**Module:** `frontend/src/modules/home`

- Headline changed from "Ready to nurture your kitchen?" to **"Turn your next receipt into dinner."**
- Description rewritten to *"Snap a grocery receipt, let us build your virtual fridge, and get recipes from what you already have. Free while we're in beta."* — removes the fabricated "15,000+ Australian households" claim.
- Button text changed from "Join Trolley for Tomorrow" to **"Scan my first receipt"**.
- Button link changed from `/signup` (dead-end visual mockup) to `/upload-receipt` (the actual first action users take).
- Card width widened from `max-w-5xl` to `max-w-7xl` to match the hero and feature-grid horizontal footprint.

### Changed — Footer (both the homepage inline footer and `shared/Footer.jsx`)

- Copyright line changed from "© 2024 Trolley for Tomorrow. Nurturing Australian Kitchens." to "© 2026 Trolley for Tomorrow · Monash FIT5120 student project".
- "Privacy Policy" link wired to open `PrivacyPolicyModal` (was an empty `href="#"`).
- "Community Guidelines" link replaced with **"Made by"**, wired to open `MadeByModal`.
- "Feedback" link now points to `https://forms.gle/gBfeEqRoa2Qx9X69A` and opens in a new tab (was an empty `href="#"`).
- "Support" link removed entirely (had no destination and no planned feature behind it).

### Removed

- Floating cart FAB button on the home page (fixed bottom-right, labelled "Plan Weekly Meals"). Visual clutter with no functional gain.

### Notes for maintainers

- The three modals (`HowItWorksModal`, `PrivacyPolicyModal`, `MadeByModal`) share the same pattern: open/close state held by the parent, Escape key and backdrop click both close, body scroll locked while open, backdrop fades + panel slides/scales with a 0.35s cubic-bezier entry.
- `MadeByModal` uses scroll-triggered animations scoped to the modal body (`viewport.root` points at the scroll container `ref`), so inner reveals fire on in-modal scroll rather than window scroll.
- Current build emits a chunk-size warning (~506 KB / ~148 KB gzipped). Non-blocking. If you want to split, the three modals are strong `React.lazy()` candidates — they never render until a button click.

---

## [1.2.0] — 2026-04-22

### Added — Landing-page interactive demo

**Module:** `frontend/src/modules/home`

- `HeroDemo.jsx` — animated state-machine component cycling through 7 phases (receipt → scanning → budget → fridge → nutrition → recipe → shopping), built with framer-motion. ~14s per loop. Respects `prefers-reduced-motion` with a static fallback; pauses when the browser tab is hidden.
- `heroDemoData.js` — 3 rotated demo sequences (Omelette at Woolworths, Stir-fry at Coles, Penne at Aldi) plus a local copy of the recipe tag-style tokens to avoid cross-module coupling.
- Replaced the hardcoded "Live Inventory" block in `HomePage.jsx` with `<HeroDemo />`; decorative background blobs preserved.

**Module:** `frontend/` (project root)

- Added `framer-motion@12.38.0` as a runtime dependency.

### Changed — Brand unification and hero copy

- Unified brand to **"Trolley for Tomorrow"** across the top nav, footer, auth pages, dashboard, and HTML document title. Removed every occurrence of "The Living Larder" and the "Trolly" typo (17 string replacements across `index.html`, `shared/TopNav.jsx`, `shared/Footer.jsx`, `modules/home/HomePage.jsx`, `modules/auth/LoginPage.jsx`, `modules/auth/SignupPage.jsx`, `modules/dashboard/DashboardPage.jsx`).
- Hero headline rewritten from "Nurturing Australian Kitchens" to **"Eat well. Spend smart. Waste nothing."** — green accent moved from "Australian" to "Waste nothing.".
- Hero description rewritten to mirror the three-part tagline: *"Scan your grocery receipts, cook meals from what's already in your fridge, and keep your weekly budget in check."*
- Hero kicker badge changed to **"Beta · Prototype in development"** (previously duplicated the brand name).

### Removed — Misleading homepage mockup

- Removed the hardcoded "Live Inventory" card from `HomePage.jsx`: `<h3>Live Inventory</h3>` heading, "SYDNEY METRO" pill, Organic Eggs row with "Expires in 3 days", Spinach Bunch row with "Use today", and the "Waste-Free Omelette" suggested-recipe block with an externally hotlinked Google image. The card advertised features not present in the codebase (expiry tracking, geolocation) and depended on an image URL that could rot.

---

## [1.1.0] — 2026-04-05

### Added — Homepage (Iteration 1)

**Module:** `frontend/src/modules/home`

- `HomePage.jsx` — top-level page component, composes all homepage sections
- `HeroSection.jsx` — landing hero with headline, CTA buttons, and fridge preview cards (virtual fridge, budget tracker, nutrition colour coding)
- `LiveDemo.jsx` — interactive ingredient picker + real-time recipe suggestion panel, no account required
- `useDemo.js` — hook encapsulating ingredient selection state, recipe matching logic, and loading state
- `FrozenCard.jsx` — reusable frozen feature card component with ice overlay, crack SVG, and lock badge
- `FrozenFeatures.jsx` — 6-card frozen features grid (Weekly Meal Planner, Receipt Scanning, Expiry Alerts, Smart Shopping List, Eco Impact Score, Cooking Guides) with central unlock CTA and animated lock visual

**Module:** `frontend/src/shared`

- `NavBar.jsx` — responsive navigation bar; desktop shows full links + login/signup buttons; mobile collapses to hamburger menu with animated dropdown

**Module:** `frontend/` (project root)

- Initialised Vite + React project structure
- Configured Tailwind CSS v4 via `@tailwindcss/vite` plugin
- Added `react-router-dom` for client-side routing
- Created `index.html` entry point
- Created `src/main.jsx` and `src/index.css`
- Updated `vite.config.js` with React and Tailwind plugins
- Added dev/build/preview scripts to `package.json`

---

## [1.0.0] — 2026-04-03

### Added — Initial frontend scaffold

- Created `frontend/` directory with placeholder `README.md`
- Created `src/modules/` and `src/shared/` folder structure matching agreed architecture
- Created placeholder files for `fridge/`, `profile/`, and `receipt/` modules