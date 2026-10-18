-- Індекси швидкодії для пошукових та аналітичних запитів (Розділ 2.3.3)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tables_qr_code_hash ON restaurant_tables (qr_code_hash);
CREATE INDEX IF NOT EXISTS idx_orders_table_status ON orders (table_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_status ON orders (created_at, status);
CREATE INDEX IF NOT EXISTS idx_service_calls_created ON service_calls (created_at);
