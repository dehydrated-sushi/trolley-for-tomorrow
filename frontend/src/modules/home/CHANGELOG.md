# Home Module Changelog

All notable changes to the `frontend/src/modules/home` module are documented here.
Follows semantic versioning as defined in the root README.

---

## [1.2.0] — 2026-04-22

### Added

- `HowItWorksModal.jsx` — placeholder modal wired to the formerly-dead "See How It Works" hero button. Tells visitors the full interactive walkthrough ships with Iteration 2. Backdrop fade + panel slide/scale entry, closes on Escape / backdrop click / close button, locks body scroll while open.
- Scroll-triggered entrance animations across the home page, all using a shared cubic-bezier `[0.22, 1, 0.36, 1]`:
  - Hero left column (badge, h1, description, CTA row) staggers in on mount via framer-motion `variants` with `staggerChildren`.
  - Feature section heading and bento grid each fade + translate up on scroll-into-view.
  - "Smart Receipt Parsing" card's inline budget bar animates width `0 → 75%` when the card is 50% visible.
  - CTA section fades + scales from `0.97 → 1` when scrolled to.
  - All viewport configs use `once: true` with `amount` thresholds (0.15–0.5) for fast-scroll stability.
- Feature bento cards are now clickable. All five converted from `<div>` to `MotionLink` (via `motion.create(Link)` from framer-motion v12) so they participate in the stagger entry AND get their own `whileHover` lift. Routes: Virtual Fridge → `/fridge`, Smart Receipt Parsing → `/upload-receipt`, Budget Benchmarks → `/profile`, Meal Planning → `/meals`, Community Insights → `/shopping`. Hover lift uses spring stiffness 380, damping 26, `y: -6`.
- Import of `PrivacyPolicyModal` and `MadeByModal` from `../../shared`; matching `useState` + render in the fragment tail so the homepage's inline footer can open both modals independently of the shared AppShell footer.

### Changed

- **CTA section rewrite.** Headline "Ready to nurture your kitchen?" → **"Turn your next receipt into dinner."**. Description rewritten to *"Snap a grocery receipt, let us build your virtual fridge, and get recipes from what you already have. Free while we're in beta."* — removes the fabricated "15,000+ Australian households" claim. Button text "Join Trolley for Tomorrow" → **"Scan my first receipt"**. Button link `/signup` (dead-end) → `/upload-receipt`. Card width `max-w-5xl` → `max-w-7xl` to match the hero and feature-grid horizontal footprint.
- **"See How It Works"** button is no longer an inert `<button>`; it now opens `HowItWorksModal`.
- **Homepage inline footer:**
  - Copyright line 2024 → 2026, dropped "Nurturing Australian Kitchens." tagline, added "Monash FIT5120 student project".
  - "Privacy Policy" link now opens `PrivacyPolicyModal`.
  - "Community Guidelines" replaced with **"Made by"**, opens `MadeByModal`.
  - "Feedback" now links to `https://forms.gle/gBfeEqRoa2Qx9X69A` in a new tab.
  - "Support" link removed.
- Copy fix: "let Trolley build your virtual fridge" → "let us build your virtual fridge" in the CTA description.

### Removed

- Floating cart FAB in `HomePage.jsx` (the fixed bottom-right "Plan Weekly Meals" link with the `add_shopping_cart` Material icon).

### Notes

- When we first added scroll-triggered animations we omitted `once: true`, causing fast-scroll flicker (elements animating in, getting interrupted by reverse-on-exit, re-entering mid-animation). Reverting to `once: true` plus `amount` thresholds is the Linear / Stripe / Vercel pattern and fixed the issue cleanly.
- Tuning knobs still live at the top of `HeroDemo.jsx` (`DURATIONS`, `PAUSE_BETWEEN_SEQUENCES_MS`). Homepage entry animations use their own constants at the top of `HomePage.jsx` (`EASE`, `stagger`, `riseIn`, `hoverLift`).

---

## [1.1.0] — 2026-04-22

CHANGELOG started. Prior scaffolding in this module (`HomePage.jsx`,
`HeroSection.jsx`, `LiveDemo.jsx`, `FrozenCard.jsx`, `FrozenFeatures.jsx`,
`useDemo.js`) was introduced in frontend 1.1.0 and not previously tracked at
module level.

### Added

- `HeroDemo.jsx` — new component replacing the static "Live Inventory" card in
  the hero section. Animated state machine that cycles through 7 phases on a
  timer:
  1. **Receipt** (1.2s) — cream receipt paper slides in from above with store
     name, itemised lines, and total.
  2. **Scanning** (1.4s) — emerald laser line sweeps top-to-bottom; each
     receipt line pulses emerald as the scan passes it.
  3. **Budget** (1.8s) — weekly-budget card; a `+$X.XX` chip flies in from
     above, the progress bar animates from the "before" spend to the "after"
     spend, and a dollar counter tweens (requestAnimationFrame + ease-out
     cubic). Colour-aware status line: green for normal, amber for tight
     (≥85% used), red for over-budget.
  4. **Fridge** (2.0s) — items pop in one-by-one with spring motion
     (stiffness 280, damping 22), each with its nutritional category icon.
  5. **Nutrition** (1.8s) — fridge shrinks; stacked-category proportion bar
     fills in, legend pills appear, and a balance verdict is rendered
     ("Well balanced", "Protein-heavy · add variety", etc.).
  6. **Recipe** (2.0s) — dark gradient recipe card slides up with match %
     badge, minutes, and tag pills (Quick, High protein, etc.).
  7. **Shopping** (2.0s) — "Next shopping list" card with items missing for
     the matched recipes, estimated cost, and a "Fits your budget" pill.
  8. **Reset** (0.7s) — fade out; next sequence in the rotation begins.

  Built with `framer-motion@12.38.0`. Uses `useReducedMotion` — users with
  `prefers-reduced-motion: reduce` receive a static fallback showing the
  fridge and recipe stages side-by-side. Pauses when the browser tab is
  hidden via `visibilitychange`. Custom cubic-bezier easing
  `[0.22, 1, 0.36, 1]` for slide entries; spring motion for fridge items.

- `heroDemoData.js` — demo sequence catalogue. Three sequences rotate:
  Omelette (Woolworths, protein-heavy fridge), Stir-fry (Coles, well-balanced),
  and Penne (Aldi, veg-heavy, also exercises the amber "tight week" budget
  state). Shape: `{ id, store, date, receiptItems, receiptTotal, budget,
  fridgeItems, recipe, shoppingList }`. Also exports `TAG_STYLES`, a local
  subset of the tag-colour tokens mirrored from
  `frontend/src/modules/meals/MealsPage.jsx` so this module has no
  cross-module coupling.

### Changed

- `HomePage.jsx` — hero section:
  - Headline changed from "Nurturing Australian Kitchens." to
    **"Eat well. Spend smart. Waste nothing."** The green accent moved from
    "Australian" to "Waste nothing.".
  - Description rewritten to: *"Scan your grocery receipts, cook meals from
    what's already in your fridge, and keep your weekly budget in check."*
  - Kicker badge changed to **"Beta · Prototype in development"**. The badge
    text was iterated through "Free for Australian households" and
    "Student project · Monash FIT5120 TA23" during the session before
    landing on the current value.
  - "The Living Larder" occurrences replaced with "Trolley for Tomorrow"
    across the hero nav, CTA section, and footer (5 substitutions).
- `HomePage.jsx` — hero demo card region: replaced the inline 45-line "Live
  Inventory" mockup block with a single `<HeroDemo />` import. Decorative
  blurred background blobs (`-top-10 -right-10` and `-bottom-10 -left-10`)
  retained.

### Removed

- Inline "Live Inventory" mockup in `HomePage.jsx`. The removed block contained:
  - `<h3>Live Inventory</h3>` heading and "SYDNEY METRO" pill (geolocation is
    not a feature of the app).
  - Organic Eggs row with "Expires in 3 days" text and Spinach Bunch row
    with "Use today" text (expiry tracking is not implemented;
    `receipt_items` has no expiry column).
  - "Suggested Recipe: Waste-Free Omelette" block with an externally
    hotlinked Google image (dependency on a URL that could rot; no such
    recipe in the 231k-recipe catalogue).

### Notes for future maintainers

- All timing constants live at the top of `HeroDemo.jsx`: `PHASES`,
  `DURATIONS` (ms per phase), `PAUSE_BETWEEN_SEQUENCES_MS`. Adjust rhythm
  there without touching render code.
- Sequence variety: add, remove, or edit entries in `heroDemoData.js`.
  Shape must stay stable; component assumes each sequence supplies every
  field.
- **The demo does not fetch real data.** By design it always plays
  hardcoded sequences regardless of backend state, so the marketing
  homepage is consistent across visits, DB resets, and multi-user
  scenarios.
- `CATEGORY_COLOURS` in `HeroDemo.jsx` duplicates `CATEGORY_FALLBACK` from
  `shared/nutrition.js`. If the app-wide colour tokens change, update both.
