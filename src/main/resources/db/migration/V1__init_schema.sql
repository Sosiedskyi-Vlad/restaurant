
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    role VARCHAR(255) CHECK (role IN ('ROLE_GUEST', 'ROLE_WAITER', 'ROLE_COOK', 'ROLE_ADMIN'))
);

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE menu_items (
    id BIGSERIAL PRIMARY KEY,
    category_id INT REFERENCES categories(id),
    name VARCHAR(255),
    price NUMERIC(10,2),
    image_url VARCHAR(500),
    is_available BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE restaurant_tables (
    id UUID PRIMARY KEY,
    number INT,
    qr_code_hash VARCHAR(255) UNIQUE
);

CREATE TABLE orders (
    id UUID PRIMARY KEY,
    table_id UUID REFERENCES restaurant_tables(id),
    status VARCHAR(50) NOT NULL,
    paid BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL,
    preparing_at TIMESTAMP,
    ready_at TIMESTAMP,
    paid_at TIMESTAMP
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY,
    order_id UUID REFERENCES orders(id),
    menu_item_id BIGINT REFERENCES menu_items(id),
    quantity INT NOT NULL,
    price_at_time NUMERIC(10,2) NOT NULL
);

CREATE TABLE payments (
    id UUID PRIMARY KEY,
    order_id UUID REFERENCES orders(id) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(50) NOT NULL,
    provider_status VARCHAR(50),
    provider_payment_id VARCHAR(255),
    created_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP
);

CREATE TABLE service_calls (
    id UUID PRIMARY KEY,
    table_id UUID REFERENCES restaurant_tables(id) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    resolved_at TIMESTAMP
);
