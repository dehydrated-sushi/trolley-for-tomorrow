# Frontend

React + Vite frontend for Trolley for Tomorrow.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Build tool | Vite 6 |
| Styling | Tailwind CSS v4 |
| Routing | React Router v7 |
| Language | JavaScript (JSX) |

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Install and run

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`

### Build for production

```bash
npm run build
npm run preview
```

---

## Folder Structure

```
frontend/
├── index.html
├── vite.config.js
├── package.json
├── CHANGELOG.md
└── src/
    ├── main.jsx              # App entry point
    ├── index.css             # Tailwind import
    ├── App.jsx               # Router setup
    ├── modules/
    │   ├── home/             # Homepage (unauthenticated landing page)
    │   │   ├── HomePage.jsx
    │   │   ├── HeroSection.jsx
    │   │   ├── LiveDemo.jsx
    │   │   ├── FrozenFeatures.jsx
    │   │   ├── FrozenCard.jsx
    │   │   └── useDemo.js
    │   ├── fridge/           # Virtual fridge (planned)
    │   ├── profile/          # User profile + budget (planned)
    │   └── receipt/          # Receipt scanning (planned)
    └── shared/
        ├── NavBar.jsx        # Responsive navigation bar
        ├── ColorTag.jsx      # Nutrition colour tag (planned)
        ├── ColorLegend.jsx   # Colour legend (planned)
        └── ConfirmDialog.jsx # Delete confirmation dialog (planned)
```

---

## Current Status (Iteration 1)

| Page / Feature | Status |
|---|---|
| Project setup (Vite + React + Tailwind) | ✅ Done |
| Responsive NavBar | ✅ Done |
| Homepage — Hero section | ✅ Done |
| Homepage — Live demo (ingredient picker + recipe results) | ✅ Done |
| Homepage — Frozen features + unlock CTA | ✅ Done |
| Virtual Fridge page | 🔲 Planned |
| Receipt Scanner page | 🔲 Planned |
| Profile + Budget page | 🔲 Planned |
| Meal Planner page | 🔲 Planned |
| Shopping List page | 🔲 Planned |

---

## Routes

| Path | Component | Auth required |
|---|---|---|
| `/` | `HomePage` | No |
| `/fridge` | `FridgeView` | Yes (planned) |
| `/meals` | TBC | Yes (planned) |
| `/shopping` | TBC | Yes (planned) |
| `/profile` | `ProfileForm` | Yes (planned) |
| `/login` | TBC | No (planned) |
| `/signup` | TBC | No (planned) |

---

## Tailwind Responsive Breakpoints

Follows Tailwind's mobile-first convention:

| Prefix | Width | Device |
|---|---|---|
| (none) | all sizes | Mobile first |
| `sm:` | ≥ 640px | Large phone |
| `md:` | ≥ 768px | Tablet |
| `lg:` | ≥ 1024px | Desktop |
| `xl:` | ≥ 1280px | Large desktop |

---

## Notes for Team

- No separate `.css` files — all styling is done via Tailwind utility classes directly in JSX
- Shared components go in `src/shared/` — do not duplicate across modules
- Each module folder owns its own logic via custom hooks (e.g. `useDemo.js`, `useFridge.js`)
- Backend API calls will be added once endpoints are confirmed with the backend team