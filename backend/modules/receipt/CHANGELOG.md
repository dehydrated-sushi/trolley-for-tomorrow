# Backend Receipt Module Changelog

All notable changes to the `backend/modules/receipt` module are documented here.
Follows semantic versioning as defined in the root README.

---

## [1.1.0] — 2026-04-27

### Added

- Added `receipts` as the receipt scan/session table: one row per OCR upload or manual commit fallback.
- Added nullable `receipt_id` support on `receipt_items` so new scans are grouped while old rows remain valid.
- Parse now creates a receipt session and returns `receipt_id` before users review OCR draft items.
- Commit now saves confirmed items against the receipt session and returns the linked `receipt_id`.
- Added `GET /api/receipts/sessions` for viewing recent receipt scan sessions in the frontend.
- Added `GET /api/receipts/sessions/<id>` for opening one session and viewing the bought items attached to it.
- Added idempotent schema creation/upgrade helper for local SQLite and AWS PostgreSQL environments.
