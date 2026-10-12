-- Додавання типу акції та гнучкої конфігурації комбо-правил
ALTER TABLE promotions
ADD COLUMN promo_type VARCHAR(50) NOT NULL DEFAULT 'ORDER_PERCENT',
ADD COLUMN combo_config TEXT;

-- Оновлюємо існуючі акції
UPDATE promotions
SET promo_type = 'ORDER_PERCENT'
WHERE discount_percent > 0;

UPDATE promotions
SET promo_type = 'INFO'
WHERE discount_percent = 0 OR discount_percent IS NULL;
