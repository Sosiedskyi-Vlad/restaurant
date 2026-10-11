ALTER TABLE restaurant_tables ADD COLUMN zone VARCHAR(50) DEFAULT 'MAIN';
ALTER TABLE restaurant_tables ADD COLUMN shape VARCHAR(20) DEFAULT 'SQUARE';
ALTER TABLE restaurant_tables ADD COLUMN seats INT DEFAULT 4;
ALTER TABLE restaurant_tables ADD COLUMN rotation INT DEFAULT 0;

CREATE TABLE hall_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    zone VARCHAR(50) NOT NULL DEFAULT 'MAIN',
    position_x DOUBLE PRECISION NOT NULL,
    position_y DOUBLE PRECISION NOT NULL,
    width DOUBLE PRECISION DEFAULT 16.0,
    height DOUBLE PRECISION DEFAULT 10.0,
    rotation INT DEFAULT 0
);

-- Початкові декоративні елементи для основного залу
INSERT INTO hall_elements (name, type, zone, position_x, position_y, width, height, rotation)
VALUES 
    ('Вхід', 'ENTRANCE', 'MAIN', 50.0, 92.0, 14.0, 6.0, 0),
    ('Барна стійка', 'BAR', 'MAIN', 82.0, 22.0, 24.0, 12.0, 0),
    ('Роздача кухні', 'KITCHEN', 'MAIN', 18.0, 15.0, 20.0, 10.0, 0),
    ('Вбиральня', 'WC', 'MAIN', 90.0, 85.0, 12.0, 8.0, 0);
