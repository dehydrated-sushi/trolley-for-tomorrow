# Frontend Changelog

All notable changes to the frontend module are documented here.
Follows semantic versioning as defined in the root README.

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