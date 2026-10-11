ALTER TABLE restaurant_info ADD COLUMN latitude DOUBLE PRECISION;
ALTER TABLE restaurant_info ADD COLUMN longitude DOUBLE PRECISION;

UPDATE restaurant_info 
SET latitude = 50.4485, longitude = 30.5186 
WHERE id = 1 AND latitude IS NULL;
