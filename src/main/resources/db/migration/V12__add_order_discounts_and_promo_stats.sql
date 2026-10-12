-- Додавання відсотка знижки та аналітики використання до акцій
ALTER TABLE promotions 
ADD COLUMN discount_percent INT DEFAULT 0,
ADD COLUMN usage_count INT NOT NULL DEFAULT 0,
ADD COLUMN total_discount_given NUMERIC(10,2) NOT NULL DEFAULT 0.00;

-- Додавання знижки та прив'язки акції до замовлень
ALTER TABLE orders
ADD COLUMN discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN applied_promotion_id UUID REFERENCES promotions(id) ON DELETE SET NULL,
ADD COLUMN applied_promotion_title VARCHAR(255);

-- Оновлюємо початкову акцію на день народження
UPDATE promotions
SET discount_percent = 15
WHERE title LIKE '%День народження%' OR title LIKE '%Дня народження%';
