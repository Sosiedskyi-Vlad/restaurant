CREATE TABLE promotions (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    badge_text VARCHAR(255),
    short_description VARCHAR(500),
    full_content TEXT,
    image_url VARCHAR(1000),
    action_type VARCHAR(50) NOT NULL DEFAULT 'NONE',
    target_menu_item_id BIGINT REFERENCES menu_items(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE,
    updated_at TIMESTAMP WITHOUT TIME ZONE
);
