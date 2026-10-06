-- Preserve existing ledger entries and indexes after the service/entity rename.
ALTER TABLE summary RENAME TO ledger;
