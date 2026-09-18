ALTER TABLE product ADD COLUMN description VARCHAR(2000);
ALTER TABLE product ADD COLUMN currency VARCHAR(3);

UPDATE product
SET description = 'Product description pending editorial review',
    currency = 'SEK'
WHERE description IS NULL OR currency IS NULL;

ALTER TABLE product ALTER COLUMN description SET NOT NULL;
ALTER TABLE product ALTER COLUMN currency SET NOT NULL;
