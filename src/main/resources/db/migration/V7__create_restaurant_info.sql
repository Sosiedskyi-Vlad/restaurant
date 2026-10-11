CREATE TABLE restaurant_info (
    id BIGINT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description VARCHAR(255),
    wifi_ssid VARCHAR(100),
    wifi_password VARCHAR(100),
    working_hours VARCHAR(100),
    address VARCHAR(200),
    phone VARCHAR(50),
    allergens_note TEXT
);

INSERT INTO restaurant_info (id, name, description, wifi_ssid, wifi_password, working_hours, address, phone, allergens_note)
VALUES (
    1,
    'Ресторан «RestoFlow»',
    'Авторська кухня, затишна атмосфера та швидкий сервіс',
    'Resto_Guest',
    'resto2026',
    'Пн–Нд: 10:00 – 22:00',
    'вул. Володимирська, 24',
    '+380442345678',
    'Якщо у вас є харчова алергія або особливі побажання до інгредієнтів, будь ласка, повідомте про це офіціанта.'
)
ON CONFLICT (id) DO NOTHING;
