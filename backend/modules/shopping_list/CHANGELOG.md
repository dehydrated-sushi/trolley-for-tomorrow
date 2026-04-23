# Shopping List Module Changelog

All notable changes to the `backend/modules/shopping_list` module are documented here.
Follows semantic versioning as defined in the root README.

---

## [1.1.0] — 2026-04-23

### Added — `/recommendations` endpoint powering the three rails

- **`GET /api/shopping/recommendations`** returns all three Shopping-page rails in a single round-trip:
  - `staples` — items bought ≥ 2× historically in `receipt_items` whose most recent purchase is older than 7 days. Ordered by purchase frequency desc, last-seen asc, cap 6. Naturally empty when the user has uploaded fewer than two receipts containing overlapping items; the frontend renders empty-state copy in that case.
  - `complete_recipes` — union of missing ingredients across the top match-scored recipes (≤ 5 considered). Each item carries a `completes` list of `{id, name}` recipes it would unlock, and items appearing in multiple top recipes are ranked first. Shares the `find_matching_item`, `SKIP_ITEMS`, `MIN_ITEM_LENGTH` helpers already imported from `meal_plan.routes` — no duplication.
  - `from_favourites` — missing ingredients across every recipe the user has starred via `/api/profile/favourites`. Items that happen to be in the fridge are filtered out via the same matcher. `completes` list surfaces the favourite names each item would help cook.
- **Attribution for each rail is structural, not copied**: the endpoint returns raw `{name, category, …}` objects so the frontend controls rail-specific UI (chip colours, tooltip copy, etc.) without server coupling.

### Preserved

- **`GET /api/shopping/list` is untouched** — still returns the original "top 5 recipes' missing ingredients aggregated by nutritional category" shape in case any teammate's code still calls it.

### Notes for maintainers

- All three rails are computed from scratch on each call. Under current data shape the combined query comes in under ~150 ms against a warm DB. If this ever feels slow, wrap `get_recommendations()` with a 60 s in-memory TTL keyed on `(user_id, latest receipt_items.created_at, latest user_favourites.created_at)` — stale reads across those surfaces are safe.
- The `_rail_staples` / `_rail_complete_recipes` / `_rail_from_favourites` helpers are module-level so unit tests or admin scripts can call them directly without going through Flask.
- `_DEMO_USER_ID = 1` is referenced in the favourites rail. Keep in sync with `profile/routes.py::_DEMO_USER_ID` if the single-user assumption is ever pivoted.
