ALTER TABLE menu_items
ADD COLUMN ingredients TEXT,
ADD COLUMN allergens TEXT,
ADD COLUMN favorites_count INT NOT NULL DEFAULT 0;
