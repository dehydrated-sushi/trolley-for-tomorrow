# Frontend Changelog

All notable changes to the frontend module are documented here.
Follows semantic versioning as defined in the root README.

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