-- Demo catalog seed, previously loaded from Hibernate import.sql (which only runs
-- when Hibernate manages schema creation). With Flyway the seed lives in a migration.
INSERT INTO product (name, price, available, stock_quantity, image_url)
VALUES ('Apple', 2.29, TRUE, 100, 'https://via.placeholder.com/150?text=Apple');
INSERT INTO product (name, price, available, stock_quantity, image_url)
VALUES ('Banana', 2.19, TRUE, 100, 'https://via.placeholder.com/150?text=Banana');
INSERT INTO product (name, price, available, stock_quantity, image_url)
VALUES ('Carrot', 2.45, TRUE, 100, 'https://via.placeholder.com/150?text=Carrot');
INSERT INTO product (name, price, available, stock_quantity, image_url)
VALUES ('Dairy Milk', 2.49, TRUE, 100, 'https://via.placeholder.com/150?text=Dairy+Milk');
INSERT INTO product (name, price, available, stock_quantity, image_url)
VALUES ('Eggs', 2.99, TRUE, 100, 'https://via.placeholder.com/150?text=Eggs');