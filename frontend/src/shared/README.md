# Shared Frontend Primitives

Components and stores that cross module boundaries. Anything in here is expected to be imported from more than one place in `src/modules/`. If a primitive drifts back to single-caller, move it next to its caller and delete the shared copy.

---

## App shell & navigation

- **`AppShell.jsx`** — outermost layout wrapper mounted by the router. Holds the side/top nav, the main content outlet, the `<Footer>`, and single-instance primitives like `<Toast />`. Anything that should render exactly once per app lifetime belongs here.
- **`NavBar.jsx`**, **`SideNav.jsx`**, **`TopNav.jsx`**, **`MobileBottomNav.jsx`** — navigation chrome, responsive variants.
- **`Footer.jsx`**, **`MadeByModal.jsx`**, **`PrivacyPolicyModal.jsx`** — marketing / legal surfaces.
- **`ProtectedRoute.jsx`** — router guard for authenticated routes. Stubbed in the single-user demo; wires JWT check when auth is on.
- **`PageShell.jsx`** — per-page container (max-width, horizontal padding, header slot). Use this for consistency; avoid bare `<div className="px-6 max-w-…">` at page top.

---

## Nutrition + recipe metadata

- **`nutrition.js`** — `getCategoryInfo(category)` returns `{ label, icon, colour, bg }` for the seven nutritional categories (`protein`, `vegetables`, `fruits`, `grains`, `fats`, `beverages`, `other`). Single palette source of truth across the Meals legend, shopping list category groups, and every chip that carries a category tint.
- **`recipeTags.js`** — `TAG_STYLES` map + `TAG_STYLE_FALLBACK` for the Meals-page recipe tags (`high_protein`, `low_carb`, `light`, `hearty`, `quick`, `sweet`, `simple`, `drink`). Mirrors `backend/modules/meal_plan/routes.py::TAG_DEFINITIONS`.
- **`NutritionLegend.jsx`** — the expandable legend shown on the Meals and Shopping pages. Reads from `nutrition.js` + `recipeTags.js` for labels; takes an optional `recipeTagDefs` prop to include the backend's tag descriptions when available.
- **`CategoryTag.jsx`** — small pill component for a single nutritional category.

---

## Notifications (single-instance)

- **`Toast.jsx`** — fixed bottom-right viewport. Mounted once in `AppShell.jsx`. Subscribes to the `toastBus` event bus; framer-motion fade + slide in, 3 s auto-dismiss, replaces-latest semantics, optional action button (used for "Undo"). Three tones: `default` (emerald), `muted` (surface), `error` (error-container). `aria-live="polite"` so screen readers announce without interrupting.
- **`toastBus.js`** — the event bus consumed by `Toast.jsx`. Exports `toast.show({ message, tone, duration, action })` for callers across the app. **Not `toast.js`** — macOS's case-insensitive filesystem collapses `Toast.jsx` + `toast.js` on import resolution, so the event bus module uses a distinct stem.

```js
import { toast } from '../../shared/toastBus'

toast.show({ message: 'Added milk to your shopping list' })
toast.show({ message: 'Already in list', tone: 'muted' })
toast.show({
  message: 'Added chicken',
  action: { label: 'Undo', onClick: () => removeItem(id) },
})
```

---

## Shopping list (localStorage-backed)

- **`shoppingList.js`** — per-device shopping list CRUD + fuzzy matcher. Storage key `trolley_shopping_list_v1` (versioned for forward-compatible schema changes). Every mutation notifies local subscribers immediately; cross-tab sync is via the native `storage` event.

  Item shape:

  ```js
  { id, name, category, checked, source, added_at }
  ```

  `source` is informational (`manual` / `recipe` / `staple` / `favourite`) — doesn't affect behaviour, used for the source badge on the Shopping page.

  Categorisation strategy:
  1. `_localClassify(name)` runs a small keyword-map regex check — covers ~80 % of grocery inputs instantly with no network.
  2. If the local classifier falls through to `'other'`, an async call to `/api/ingredients/classify` refines the category when the response lands. The item appears in the list the moment the user hits Enter; its category tag updates silently a few hundred ms later.

  API:

  ```js
  // Core CRUD
  getItems()
  addItem(name, { source })                  // → { added, item } | { added: false, existing }
  removeItem(id)
  toggleChecked(id)
  markChecked(ids)                           // bulk check by id array (idempotent, one write)
  clearChecked()
  clearAll()

  // Lookups
  hasItem(name)                              // case-insensitive membership
  findByName(name)                           // → item | null
  findUncheckedMatches(receiptItems)         // token-overlap matcher
                                             // → [{ item, matchedReceiptName }]

  // Reactivity
  subscribe(fn)                              // returns unsubscribe; fires on every mutation
                                             // from this tab or (via storage event) others
  ```

  **`findUncheckedMatches(receiptItems)`** is the fuzzy matcher used by the Receipt page's post-commit reconciliation panel. Any single meaningful token in common counts as a match. Stopwords stripped (colour, size, style adjectives), trailing-s stemmed, minimum token length 3. The matcher is deliberately loose because the UX contract is always "show the user the guesses and let them confirm" — false positives are absorbed by the confirm step, while a stricter matcher would miss real "I did buy this" cases.

---

## Utility components

- **`AnimatedNumber.jsx`** — smooth number tween via framer-motion's `MotionValue` + `useTransform`. Used on the Dashboard for budget + stat counters.
- **`ConfirmDialog.jsx`** — imperative confirm prompt (promise-based). Use for destructive actions.
- **`EmptyState.jsx`** — shared empty-state block (icon + title + copy + optional action).
- **`DevResetButton.jsx`** — dev-only button that clears the single-user demo's fridge, budget, favourites, and shopping list. Hidden in prod builds.

---

## Conventions for adding to this folder

- If only one module imports it, it does not belong here.
- If a component carries UI state specific to a page (e.g., filter popovers, page-level sort controls), keep it in the module, not in `shared`.
- Data stores that persist across modules (localStorage, server state caches) do belong here.
- Never add a filename whose stem differs only in case from an existing one. Case-insensitive filesystems (macOS APFS default, Windows NTFS) will break the build silently — see the `toastBus.js` history for the cautionary tale.
