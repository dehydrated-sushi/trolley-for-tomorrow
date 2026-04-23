# Fridge Module Changelog

All notable changes to the `backend/modules/fridge` module are documented here.
Follows semantic versioning as defined in the root README.

---

## [1.1.0] — 2026-04-24

### Added — Manual fridge CRUD endpoints

- **`POST /api/fridge/items`** — manual fridge entry accepting `{ name, qty?, price? }`. Reuses the existing `receipt_items` table with sentinel values `receipt_filename = 'manual_entry'` / `receipt_path = 'manual'` for the NOT-NULL columns, so the OCR and manual paths share one schema. Category is classified on-the-fly via the existing `modules.nutrition.classifier.classify` helper and returned on the response. Validates `price >= 0` and numeric; returns 400 on malformed input.
- **`PATCH /api/fridge/items/<int:item_id>`** — partial update. Any subset of `{ name, qty, price }` may be supplied; unspecified fields are untouched. Dynamic SET clause built from the payload keys. Returns 404 when the item is missing. Used for the "+1 to existing" duplicate-shortcut and the edit-item flow.
- **`DELETE /api/fridge/items/<int:item_id>`** — hard delete. No soft-delete column because the undo UX is client-side state during a 4 s window — backend sees either the delete or it doesn't happen. Returns 404 when no row matched.
- All three endpoints follow the module's existing error-handling convention (rollback on exception, return 500 with the error message).

### Notes for maintainers

- Manual rows are indistinguishable from receipt rows by all downstream consumers (Meals matching, Shopping staples rail, budget calculation) — this is **intentional**. A user's manually-added chicken breast should count toward meal matches exactly like a scanned one. If you ever need to discriminate (e.g. analytics on "what fraction of inventory is scanned vs typed"), filter on `receipt_filename = 'manual_entry'`.
- The `price` column in `receipt_items` contributes to `profile/budget-status` regardless of provenance. If manual rows shouldn't count toward weekly spend, add a provenance filter to `_weekly_spend_query` in `profile/routes.py` — but that's a product call, not a technical one.
- Schema changes were intentionally avoided. A dedicated `source` column was considered and rejected as premature given single-user demo scope.
