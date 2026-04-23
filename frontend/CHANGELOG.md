# Frontend Changelog

All notable changes to the frontend module are documented here.
Follows semantic versioning as defined in the root README.

---

## [1.14.0] — 2026-04-24

### Added — TopNav recipe search

The decorative `Search recipes...` input in the top nav is now functional. Spotlight-style keyboard-driven tool; pill input with attached dropdown, not a modal.

**Modules:** `backend/modules/meal_plan` (new `/search` endpoint), `frontend/src/shared/SearchDropdown.jsx` (new), `frontend/src/shared/TopNav.jsx`

#### Backend

- `GET /api/meals/search?q=<query>&limit=8` — `ILIKE '%q%'` against `recipes.name`, prefix matches rank above substring matches, ties broken alphabetically on `LOWER(name)`. Returns `{ id, name, calories, minutes, match_type }`. 2-character minimum enforced server-side.

#### Frontend

- **`shared/SearchDropdown.jsx`** — new component. Focus lights an emerald ring (kills the browser's default blue which clashed with the palette). Typing debounces 250 ms then fires, with a sequence counter guarding against out-of-order responses.
- **Attached dropdown** — when open, the input rounds only its top corners and the dropdown takes the bottom radius, visually becoming one shape. Rejected the floating-panel-with-gap alternative as it reads like a legacy dropdown.
- **Result row** — 40×40 thumbnail (Pixabay-backed via the existing `/recipe-image/:id` endpoint, first-letter emerald fallback on 404), recipe name with matched substring bolded in emerald, kcal + minutes meta in a monospace sub-line, and an `↵` hint on the active row.
- **Keyboard navigation**: Arrow keys move highlight, Enter navigates, first Esc closes dropdown, second Esc blurs the input. Mouse-hover also moves highlight so keyboard and mouse stay in sync.
- **Loading affordance** — thin 2 px emerald bar under the input while fetching (not an icon swap on the magnifying glass, which is jarring at small sizes and triggers the classic "did I do anything?" problem).
- **Selection closes the loop** — picking a result navigates to `/meals?highlight=<id>`, which reuses the existing scroll-and-pulse deep link and auto-expand-on-highlight behaviour from the Meals page.

### Notes for maintainers

- The shared layout surfaces (TopNav ↔ Meals page ↔ Shopping page rails ↔ Favourites modal) all converge on the same `/meals?highlight=<id>` deep-link pattern. If you change the highlight contract (param name, consumed-immediately behaviour, or the pulse duration), grep for `?highlight=` across the frontend — four surfaces depend on it.
- Don't lower the 2-character `MIN_QUERY_LEN` threshold. Single-character queries return noisy results and load the backend with every keystroke.
- The `fetchSeqRef` sequence counter inside `SearchDropdown` is load-bearing. Without it, a slow response for "co" can arrive after the faster response for "coco" and overwrite the newer results with stale ones. Tested manually by throttling the network tab.

---

## [1.13.0] — 2026-04-24

### Added — Forward-looking `/roadmap` page

A dedicated route that tells users (and mentors) what's shipping next. Forward-looking only; no recap of iteration 1.

**Modules:** `frontend/src/modules/roadmap` (new), `frontend/src/shared/SideNav.jsx`, `frontend/src/modules/dashboard/DashboardPage.jsx`, `frontend/src/App.jsx`

#### Page composition

- **Hero** — masked-reveal headline + subhead, per-word fade-in with a 30 ms stagger (not a typewriter; that pattern is already used on `HeroDemo`). Emerald "PRODUCT ROADMAP" eyebrow pill above the title with a pulsing dot.
- **Iteration 2 · In development** — seven feature cards in a 2-column grid. Each card has a pulsing emerald status dot + "In dev" tag.
- **Iteration 3 · Planned** — six feature cards with dashed border, slightly reduced opacity, muted slate dot + "Planned" tag.
- **Static dashed divider** between sections with a small caption ("Further out"). No animated-timeline-line drawing because it jitters on low-end hardware and `useInView`-driven reveals already pace the content.
- **Feedback CTA** — full-width emerald-gradient card at the bottom with a `mailto:` placeholder linking to the team (swap for the Google Form URL when finalised).

#### Micro-demos (6 of 13 cards)

- **Expiry tracking** — 7×4 mini calendar, one date pulsing red with a "Milk · 2d" chip above. Copy mentions the optional recipe-prioritisation toggle that surfaces expiring items in meal recommendations.
- **Prices on the shopping list** — three ingredient rows with `$` amounts staggering in, plus an "Estimated total" tweened via `AnimatedNumber`.
- **Estimated meal cost** — three recipe rows with `$` amounts ticking up via `AnimatedNumber`.
- **Real user profiles** — emerald-gradient avatar + name + "✓ Synced" chip + four preference pills (Vegetarian / Family of 4 / $150 per week / No nuts) staggering in.
- **Nutritional information** — four coloured bars filling to protein / carbs / fats / fiber percentages with live counters.
- **Fridge YOLO scanning** — scaled reimplementation of the AR scan (dark backdrop, SVG silhouettes, cyan bounding box + corner brackets, tiny "🍏 Granny Smith · 88%" detection card, looping scan line).

The remaining 7 cards are elegant static cards (icon + title + description + status chip): Better receipt OCR in iteration 2; Food map, Best prices from your history, Community support, Your food insights, Welfare food sources, Smart waste tracker in iteration 3. Rejected "animation on every card" — 13 bespoke demos is 8–10+ hours of work where most don't teach the user anything the description doesn't already say. Ship where the motion teaches; static where it doesn't.

#### Iteration 3 roster (6 cards)

1. **Food map** — community fridges, affordable grocers, farmers markets
2. **Best prices from your history** — route shopping runs to cheapest store per-basket using receipt history
3. **Community support** — user-shared discount tips and store finds; entries auto-populate the food map
4. **Your food insights** — interactive charts for weekly spend, waste, other facts from history
5. **Welfare food sources** — directory of food-bank programs, community meals, emergency relief
6. **Smart waste tracker** — YOLO rot detection + user-confirmed "cooked with X" + "past expiry but still in fridge" diffs

#### Entry points (2, not 4)

- **Sidebar nav link** — "What's next" with `upcoming` icon, last in the list.
- **Dashboard Quick Actions row** — appended as the 4th row with a pulsing green "NEW" badge. Discoverable without dominating the hero action list.
- **Rejected** the AI's suggested Footer link (noise) and Made-By-modal CTA (wrong context — users open that for team credits).

#### Copy conventions established

- **No em dashes in user-facing copy.** They survive only in code comments. Replaced with periods, colons, or restructured phrasing across the hero, every card description, and both section descriptions. Per explicit user request: em dashes read as AI-generated filler to many readers.
- **No week labels on cards.** Originally shipped with "Week 8 / Week 9 …" subtitles; dropped because a public roadmap shouldn't commit to sprint-level dates it can't guarantee. The pulsing-dot status chip conveys relative priority without the overpromise.

### Notes for maintainers

- Roadmap content lives in two arrays at the bottom of `RoadmapPage.jsx`. Editing a card is a one-entry change.
- The YOLO card **deliberately doesn't import** `ARScanModal` — it reimplements a smaller version inline. Reusing the full modal would drag in body-scroll-lock, Escape handling, and the full photo backdrop for what should be a ~200 px card preview.
- `FEEDBACK_URL` is a `mailto:` stub at the top of `RoadmapPage.jsx`. Swap to the Google Form URL when the team finalises it.
- Every micro-demo is gated behind an `active` boolean that only flips to true once the card enters the viewport (via `useInView({ once: true })`). Fast-scrolling past a card doesn't waste cycles animating something the user won't see.
- `prefers-reduced-motion` is handled at the hero level (masked-reveal becomes static) and at the demo level (users' systems suppress the animated transitions natively while content stays intact).
- **Do not add em dashes to user-facing copy.** Project-wide convention established this session.

---

## [1.12.0] — 2026-04-24

### Added — Manual fridge CRUD + AR scan preview modal

Two fridge-page features landed together. The first is real functionality (users can finally add/edit/remove items without going through a receipt upload); the second is a deliberately flashy "coming soon" preview that gives mentors a taste of where iteration 2 is going.

**Modules:** `frontend/src/modules/fridge`, `backend/modules/fridge`

#### Manual add / edit / delete (real feature)

- **`+ Add item`** header button opens a modal with a single compact row (name, quantity, price). Autofocused name input; quantity is free-text to match the receipt review schema. Live category classification on a 300 ms debounce via `/api/ingredients/classify` — a coloured chip spring-materialises next to the input once a category is known, clickable to override.
- **Duplicate-name detection** surfaces a tertiary-container banner with a `+1 existing` shortcut (PATCHes the existing row's qty) when the typed name matches a current fridge item case-insensitively. User can still add as a separate entry.
- **Card-fly-to-grid morph** on save — same pattern as the Shopping page's chip-to-list morph: capture the button's bounding rect, render a fixed-position ghost, animate to the grid's first cell over 650 ms. The real card fades up in place underneath.
- **Hover actions** (pencil, ×) on each card for edit and remove.
- **Inline undo on delete**, 4 s window. No confirm dialog — the clicked card overlays with a surface-high panel showing "Removed {name}" + an **Undo** pill and a linear 4 s progress bar. Timer fires the real DELETE if undo isn't clicked.

Backend (`backend/modules/fridge`) — new `POST`, `PATCH`, `DELETE` endpoints reusing the `receipt_items` table with sentinel `receipt_filename = 'manual_entry'` / `receipt_path = 'manual'` values so manual and OCR provenances share one schema. Downstream consumers (Meals matching, Shopping staples rail, budget calculation) treat manual rows identically to scanned ones — a user's typed chicken breast should count for meal matches exactly like a receipt-scanned one.

#### AR scan preview modal (iteration 2 placeholder)

- **`Scan fridge` header button** (on-surface pill with a cyan `preview` badge) opens a self-contained cyberpunk modal:
  - Scale-from-scaleY-0.02 curtain entrance (evokes a display powering on).
  - `AR_SYSTEM_BOOTING...` typewriter → solid-cyan `AR_SYSTEM_ACTIVE` status pill.
  - Scan-line sweep (1.5 s cyan-glow gradient, repeats on a 1.8 s loop once detections are in).
  - Four hardcoded detections framed with animated L-bracket corners (40 ms stagger between corners) and glassmorphic detection cards (monospace uppercase for system text, display font for item names; cyan border for new, emerald for existing).
  - FPS/LAT HUD with realistic number flicker (±1 fps, ±3 ms, 500–900 ms jitter period).
  - Preview ribbon `PREVIEW · SHIPPING IN ITERATION 2` top-center.
  - Clicking any card's `+ ADD` drops an `ITERATION 2 FEATURE` banner — the only "the truth" surface in the modal; everything else is preview-as-theatre.
- **Synthesized backdrop** — dark radial gradient + three horizontal shelf lines + four CSS item silhouettes. Zero photo dependencies. The modal runs self-contained.
- **`prefers-reduced-motion` fallback** skips the animations but preserves the static detected state. Visual polish intact without the motion.
- **Deliberately cyan-accented, not emerald** — reads as a different system temporarily taking over the screen, not part of the regular app chrome.

### Notes for maintainers

- The manual-add and AR modals are both in `frontend/src/modules/fridge/` alongside `FridgeView.jsx`. Tree: `ManualAddModal.jsx`, `ARScanModal.jsx`.
- Ghost-morph pattern is now used twice (`MorphGhost` on Shopping, `FridgeCardMorph` on Fridge). If a third surface needs the same effect, lift to `shared/` at that point. Don't pre-lift — the two copies are small and diverge on surface-specific details.
- `ARScanModal` uses inline hex-rgb colours for cyan and emerald accents rather than theme tokens, intentionally — theming it would blend it back into the app and lose the "foreign system" feel that makes the preview land.
- `deleteTimersRef` cleanup on unmount fires outstanding DELETE requests so a mid-window navigation doesn't leave ghost rows in the DB after a refresh.

---

## [1.11.0] — 2026-04-24

### Added — Receipt reconciliation · Favourites modal · Shopping page polish

Cross-cutting follow-up to 1.10.0. Closes the loop between the shopping list and the receipt upload, gives starred recipes a proper home, and tightens the Shopping page's visual hierarchy + motion language.

**Modules:** `frontend/src/shared`, `frontend/src/modules/receipt`, `frontend/src/modules/meals`, `frontend/src/modules/shopping`

#### Receipt reconciliation (`modules/receipt`)

- **Post-commit panel** on the Upload-receipt page. After the user confirms items into their fridge, the page computes token-overlap matches between the confirmed names and the user's unchecked shopping list items. Any hits render as a checklist (pre-ticked) with a "Cross off N" button that bulk-checks the matched shopping-list items. Panel collapses to a small "Shopping list updated · View list" confirmation row after action.
- Matches are frontend-only (no backend round-trip) — the fuzzy matcher lives in `shared/shoppingList.js::findUncheckedMatches`. Token normalisation, stopword stripping, trailing-s stemming. Any single meaningful token in common counts as a match; the user confirms before anything changes, so a slightly loose matcher is the right tradeoff.

#### Favourites modal (`modules/meals`)

- **Trigger pill** appears in the Meals filter row only when `favouriteIds.size > 0` — shows "★ N favourites" with a live count. Springy hover, entry animation.
- **Scrollable modal** (scrim + backdrop-blur, scale-in modal) lists every starred recipe with the same sort/filter grammar as the Meals page. Sort options: Recently starred, Highest protein, Lowest calories, Highest calories. Filters: tag chips (computed client-side from nutrition fields to mirror `meal_plan.routes._compute_tags`), Hide-drinks toggle.
- **Detail view inside the modal**: clicking any row crossfades the list for a full recipe view — hero image, tag pills, meta row, ingredients (2-col stagger-fade-in grid), numbered steps, nutrition grid. Back button (or Escape) returns to the list. A secondary "Open on Meals page" action in the footer jumps to the Meals page for users who want the recommendation-context view.
- Modal works even when the recipe is not on the currently-rendered Meals page (pagination / filters can hide it) — data is fed from the favourites payload, not from `/api/meals/recommendations`.

#### Meals page (`modules/meals`)

- `?highlight=<id>` deep-link now also **auto-expands the card's detail panel** on arrival. Landing on a collapsed card after following a link would have required a second click; users now land with ingredients + steps open.
- `favouriteRecipes` (full array) kept in state alongside the existing `favouriteIds: Set<number>`. Toggle handler updates both atomically; on add, the current recipe record is lifted from `recommendations` into the array with a just-now `favourited_at` so "Recently starred" ordering is correct before the next refetch.

#### Shopping page (`modules/shopping`) — hierarchy + motion pass

- Each recommendation rail now renders as a **self-contained card** (white surface, rounded, 1 px border, subtle shadow) with a coloured icon badge (emerald / indigo / amber), a proper display header, and a lighter subhead. All-caps kickers dropped.
- New **"Your list" divider** with em-dashes and a small caption visually separates the recommendations zone from the manual list.
- **Rail stagger on page entrance** — 90 ms between rails (`staggerChildren` variants on the grid wrapper; each Rail consumes the variant).
- **Strikethrough wipe** on check — replaces CSS `line-through` with an animated 1.5 px bar that scales from left (`transform-origin: left`, 280 ms).
- **Amber flash with shake** on duplicate-add — replaced the previous yellow pulse with a softer amber (`rgba(251,191,36,*)`) plus a 600 ms horizontal shake (`x: [0, -4, 4, -3, 3, 0]`). Triggered by the same `shopping:flash` CustomEvent from either the rail chip or a Meals-page `+` attempt.
- **Chip-to-list morph** — clicking `+` on any rail chip captures the chip's bounding rect, renders a portal-style `MorphGhost` pill at that position, and flies it to the "Your list" heading over 600 ms with a scale dip + fade-out. Teaches the user's eye that "add" means "the thing went over there" instead of relying on them to notice the list has grown by one.

#### Shared primitives changed

- **`shared/toast.js` → `shared/toastBus.js`** — rename forced by a case-insensitive filesystem collision with `Toast.jsx`. Vite was resolving `from './Toast'` to the event bus (no default export) instead of the component, blanking the whole app. Three import sites updated (`Toast.jsx`, `MealsPage.jsx`, `ShoppingListPage.jsx`).
- **`shared/shoppingList.js`** now also exposes `markChecked(ids)` (bulk-check, idempotent, single subscriber notification) and `findUncheckedMatches(receiptItems)` (the fuzzy matcher described above).

### Notes for maintainers

- Never name a `.js` and `.jsx` in the same directory whose names differ only by case. Case-insensitive filesystems (default macOS APFS, Windows NTFS) will collapse the import lookup and Vite's extension-resolution order will bite.
- `findUncheckedMatches` is deliberately loose (any one token in common wins). The confirm-before-mutate pattern in the receipt page absorbs the false-positive cost. Don't tighten the matcher without also changing the UX contract.
- The favourites modal's tag computation intentionally duplicates `meal_plan.routes._compute_tags` thresholds. If those thresholds shift on the backend, mirror the change in `FavouritesModal.jsx::deriveTags`. The 'drink' tag is a name-regex fallback because the favourites endpoint doesn't include ingredient classifier output.
- `MorphGhost` runs on a fixed-position layer; it reads `toRect` once on mount, so mid-flight scrolls will miss the target. Acceptable at current scroll velocity; revisit if ever noticeable.
- `detailRecipe` state in the favourites modal is intentionally ephemeral — closing the modal resets it, so reopening always lands on the list. Routing a `?recipe=<id>` param into the modal was considered and rejected (URL state vs. transient UI).

---

## [1.10.0] — 2026-04-23

### Added — Favourites + Add-to-shopping + Shopping List rebuild

Cross-cutting feature pass that makes the shopping list the page where a user actually plans what to buy, wired to a new favourites system and a + button on every missing ingredient in the Meals view.

**Modules:** `frontend/src/shared`, `frontend/src/modules/meals`, `frontend/src/modules/shopping`

#### New shared primitives

- **Toast** (`shared/Toast.jsx` + `shared/toastBus.js` event bus) — single-slot, fixed bottom-right, 3 s auto-dismiss, replaces-latest, optional Undo action. Mounted once in `AppShell.jsx`. `aria-live="polite"` so screen readers announce politely. Three tones: default (emerald), muted, error.
- **shoppingList** (`shared/shoppingList.js`) — localStorage-backed list CRUD with cross-tab `storage` event subscription. Items categorised instantly by a small local keyword map (covers ~80 % of common grocery inputs); misses fall through to "Other" and are refined asynchronously by `/api/ingredients/classify` when the response lands. Versioned storage key (`trolley_shopping_list_v1`) for future schema changes.

#### Meals page (`modules/meals`)

- **Favourite star** in the title row of each `RecipeCard`, server-persisted via the new `/api/profile/favourites` endpoints. Optimistic toggle with revert-on-error.
- **Clickable chips** replace the "Still need: X, Y, Z" text — each missing ingredient is a `+` chip, items already in the shopping list render as muted ✓ pills.
- **"Add all missing"** button batch-adds everything on the card, with Undo on the toast.
- **`?highlight=<id>` deep link** — when the Shopping page's rail-popover links land here, the target card scrolls into view and runs a 1.6 s emerald shadow-pulse. URL param is consumed immediately; `activeHighlight` state carries the animation through.

#### Shopping page (`modules/shopping`) — full rebuild (v1 → v2)

- Top zone: three rails powered by `/api/shopping/recommendations` — "You buy this often" (staples), "Complete a recipe" (top matches' missing ingredients), "From your favourites" (missing ingredients from starred recipes). Hover/focus on rail-2/3 chips reveals a popover with clickable recipe links that route back to Meals via `?highlight=`.
- Bottom zone: manual shopping list grouped by nutritional category. Text-to-add with Enter submission. Checked items strikethrough and drop to the bottom of their group. Clear-checked + Clear-all (with confirm) controls.
- Source badge (`recipe`, `staple`, `favourite`) on non-manual items so provenance stays visible.
- Duplicate-add → 850 ms yellow flash on the existing row via `shopping:flash` CustomEvent + muted toast. Works across both rails and Meals-page adds.

### Notes for maintainers

- The old `/api/shopping/list` endpoint is preserved server-side; this page no longer calls it.
- `CATEGORY_ORDER` in `ShoppingListPage.jsx` controls vertical grouping. Mirror any changes in the Meals legend.
- The local keyword map in `shared/shoppingList.js::_KEYWORD_MAP` is intentionally short — extending it is cheap and improves classify-hit rate, but anything not matched still gets backend refinement, so don't fear the cold path.
- Toast slot is single-instance by design. A fresh `toast.show()` replaces whatever's on screen — queueing is almost always worse UX than showing the latest action.
- Favourites are server-persisted (single-user, `user_id = 1`); shopping list is localStorage (per-device). Inconsistent by intent: favourites follow the user, the shopping list follows the moment.

---

## [1.9.0] — 2026-04-23

### Changed — Trolley Tips is now an auto-rotating, hover-pausable carousel

**Module:** `frontend/src/modules/dashboard`

- The static single-tip widget from 1.8.0 becomes a carousel: a new FoodKeeper tip every 9 seconds, with a crossfade + 10 px vertical shift (`opacity 0 → 1`, `y 12 → 0 → -8`, 450 ms, cubic-bezier `[0.22, 1, 0.36, 1]`). No 3D flips, no slides, no scale — the card is a stage, the content rotates through it.
- **Progress ring traces the card's full perimeter**, not a top-edge bar. Rendered as an SVG `<rect>` with matching rounded corners (`rx` chosen to align with the card's `rounded-[2rem]`), sized via a `ResizeObserver` so it follows the card as the layout flexes. A dim emerald-300 background stroke at `opacity 0.18` defines the track; a bright emerald-300 stroke at `opacity 0.85` paints clockwise over it, driven by `strokeDashoffset` going `1 → 0` over each 9 s window. `pathLength="1"` normalises the dasharray so the same offset value works regardless of rendered perimeter length. `strokeLinecap="round"` rounds the trace's leading edge for a polished feel. Resets each rotation, freezes mid-trace on hover.
- **Hover / focus pauses the timer in place.** Moving away resumes the progress from where it paused — not from 0. Implemented by driving the progress with a framer-motion `MotionValue` and calling `.pause()` / `.play()` on the returned playback controls imperatively. Focus pause uses `e.currentTarget.contains(e.relatedTarget)` so tabbing into the back button doesn't unpause.
- **Back button appears only on hover/focus**, and only when a previous tip is actually available. Positioned bottom-right, 10 px uppercase pill with an arrow icon, fades in on `x: 8 → 0`. Clicking it shows the previously displayed tip; the tip that was on screen is parked as the "next", so forward rotation resumes smoothly from there.
- **Memory footprint is bounded**: at any moment we hold at most three tips — previous (for back button), current (on screen), next (pre-fetched to make rotations instant). No history beyond one level back.
- **Pre-fetch on each rotation**: while the current tip is on screen, the next one is fetched in the background. Rotations therefore swap without a visible network delay. Cold-path (pre-fetch in flight when rotation fires) falls back to a direct fetch.
- **Lightbulb and eco drift animations are unchanged and deliberately kept outside the AnimatePresence**, so the rotating content doesn't force a re-render of those decorative elements.
- **Accessibility**: outer card is `tabIndex={0}` so keyboard users can reach and pause it. Back button has `aria-label="Show previous tip"` and gains focus-visible ring styling. All pause/resume logic works identically for hover and keyboard focus.

### Notes for maintainers

- Rotation duration is a module constant `TIP_DURATION_S = 10`. Change if copy testing shows people need more time.
- The tip-change effect re-runs on every `tip` state update; `rotateRef` holds the latest `rotate` callback so the effect's dep array stays `[tip, progress]` and the animation doesn't get cancelled mid-progress when the `nextTip` pre-fetch completes.
- If the `/api/foodkeeper/tips` endpoint is unreachable the fallback "Revive Your Greens" tip is displayed and no rotation happens (since we never get a second tip to rotate to) — the behaviour gracefully collapses to the 1.7.x static experience.
- `FALLBACK_TIP` is exported-shaped but not exported — keep it module-local; it's a last-resort UI string, not a shared resource.
- MotionValue-based progress bar bypasses React reconciliation per frame, so the CPU cost of the rotation itself is near-zero. The rotation cost is dominated by the `apiFetch` network round-trip, which is debounced to one concurrent request per rotation.

---

## [1.8.0] — 2026-04-23

### Changed — Dashboard Trolley Tips now sourced from USDA FoodKeeper

**Module:** `frontend/src/modules/dashboard`

- The hardcoded "Revive Your Greens" tip on the Dashboard is replaced with a random deduplicated tip fetched from the new backend endpoint `GET /api/foodkeeper/tips?limit=1`. Title becomes the FoodKeeper product name (e.g. "Sugar", "Bagel", "Canned goods"); body is the USDA-authored tip text.
- **Attribution link** added beneath the tip body: small uppercase link reading *"Source · USDA FSIS FoodKeeper Data"*, opening https://catalog.data.gov/dataset/fsis-foodkeeper-data in a new tab. Required by data.gov's attribution conventions and also demonstrates real source-backed content for tutor review.
- **Graceful fallback**: if the fetch fails (endpoint not reachable, tables not seeded, CORS error, etc.) the previous hardcoded "Revive Your Greens" tip is shown instead. The Dashboard never renders a blank tip card.
- Independent `apiFetch` call inside `DashboardPage.jsx`'s `useEffect` — runs in parallel with the fridge and budget fetches, failures don't cascade.

### Notes for maintainers

- Backend dependency: see `backend/modules/foodkeeper/` and `backend/scripts/seed_foodkeeper.py`. The seed must have been run at least once against the target database for real tips to appear — until then, the fallback renders.
- Tip title currently uses the FoodKeeper product name verbatim. Some product names are long or slightly technical (e.g. "Chicken broth/stock/consommé"); rendering is with the existing headline style (no CSS `capitalize`, since product names already have proper casing and the slash/special chars would render oddly under title-case transform).
- No new npm dependencies. Feature is a `useState` + single `apiFetch`.

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