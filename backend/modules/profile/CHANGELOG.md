# Profile Module Changelog

All notable changes to the `backend/modules/profile` module are documented here.
Follows semantic versioning as defined in the root README.

---

## [1.1.1] — 2026-04-30

### Fixed — Favourites ON CONFLICT crash on shared PostgreSQL DB

- `_ensure_table()` now runs `CREATE UNIQUE INDEX IF NOT EXISTS idx_user_favourites_unique ON user_favourites (user_id, recipe_id)` after the `CREATE TABLE IF NOT EXISTS` for `user_favourites`. The shared RDS instance had the table created without a primary key constraint (likely by an older migration path), which caused `ON CONFLICT (user_id, recipe_id) DO NOTHING` to throw `psycopg.errors.InvalidColumnReference`. A unique index satisfies `ON CONFLICT` identically to a composite PK. The index creation is idempotent — safe to run against DBs that already have the PK.
- Removed `PRIMARY KEY (user_id, recipe_id)` from the `CREATE TABLE` DDL to avoid a conflict if the table already exists without it; the unique index now carries that responsibility.

---

## [1.1.0] — 2026-04-23

### Added — Favourite recipes

- **New `user_favourites` table** (composite primary key `(user_id, recipe_id)`), lazily created on first request via the existing `_ensure_table()` idiom used for `user_budget` and `user_preferences`. Composite PK makes stars naturally idempotent — re-starring is a no-op at the DB level thanks to `ON CONFLICT (user_id, recipe_id) DO NOTHING`. Single-user demo uses `user_id = 1`; schema supports multi-user without migration.
- **`GET /api/profile/favourites`** — returns both `favourite_recipe_ids` (flat list, cheap for Meals page "is this starred?" lookups) and `favourites` (full joined recipe records with `ingredients` and `steps` split the same way `meal_plan/routes.py` does). One round-trip for the Meals page on mount.
- **`PUT /api/profile/favourites/<int:recipe_id>`** — idempotent add. Validates the recipe exists via `SELECT id FROM recipes WHERE id = :rid` before insert; returns 404 otherwise so stale clients don't create orphan rows. Returns `{ recipe_id, favourited: true }`.
- **`DELETE /api/profile/favourites/<int:recipe_id>`** — idempotent remove. No-op on absent rows.

### Notes

- The Shopping page's `/api/shopping/recommendations` endpoint reads from this table for its "From your favourites" rail via raw SQL — no cross-module imports.
- Everything rolls back on any exception and returns a 500 — consistent with the rest of the module's error handling.
