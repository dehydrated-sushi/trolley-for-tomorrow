# Frontend Changelog

All notable changes to the frontend module are documented here.
Follows semantic versioning as defined in the root README.

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