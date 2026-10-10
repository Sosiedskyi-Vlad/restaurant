
## Фронтенд

У проєкті реалізовано React-фронтенд (на базі Vite і Tailwind CSS), який слугує одночасно:
- **Мобільним застосунком для гостя** (меню, виклик офіціанта, кошик, оплата LiqPay). Відкривається при скануванні QR-коду столу.
- **Дошкою для персоналу (Kitchen Display System)**. Доступна за адресою `/kitchen`. Слухає WebSocket-події і в реальному часі оновлює статуси (Нові, Готуються, Очікують видачі).

### Розробка фронтенду
Для запуску розробницького сервера (HMR, гаряче перезавантаження):
```bash
cd frontend
npm install
npm run dev
```
Фронтенд автоматично проксіює API-запити (`/api/*`) та WebSocket (`/ws/*`) на локальний Spring Boot бекенд (`http://localhost:8080`), тому проблеми з CORS не виникають.

### Збирання
Для production (чи для Docker) фронтенд збирається командою `npm run build` у папку `frontend/dist`.

## Запуск (Docker Compose)
Для запуску всього стеку (БД, бекенд і фронтенд):
```bash
# Скопіюйте приклад змінних оточення і заповніть ключі LiqPay
cp .env.docker.example .env

# Запустіть контейнери
docker-compose up --build -d
```
- Додаток гостя і дошка кухні: `http://localhost:5173`
- Swagger UI: `http://localhost:8080/swagger-ui.html`

Тестові акаунти: `admin@restaurant.com` (пароль `admin123`), `cook@restaurant.com` (`cook123`), `waiter@restaurant.com` (`waiter123`).
