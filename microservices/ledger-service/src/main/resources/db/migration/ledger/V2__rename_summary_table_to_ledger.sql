-- The Summary -> Ledger rename moved the entity and its migration directory,
-- but V1 still creates the table under the old name. Hibernate's physical
-- naming strategy maps the Ledger entity to "ledger", so ddl-auto=validate
-- aborted with a missing-table error on the docker and e2e profiles.
--
-- Added as V2 rather than editing V1 so that databases that already applied V1
-- keep a valid checksum and migrate in place.
ALTER TABLE summary RENAME TO ledger;

-- Rename the order_id indexes alongside the table for consistency.
ALTER INDEX idx_summary_order_id RENAME TO idx_ledger_order_id;
ALTER INDEX uk_summary_order_id RENAME TO uk_ledger_order_id;
