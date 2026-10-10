package com.vlad.restaurant.config;

import com.vlad.restaurant.entity.Category;
import com.vlad.restaurant.entity.MenuItem;
import com.vlad.restaurant.entity.RestaurantTable;
import com.vlad.restaurant.entity.Role;
import com.vlad.restaurant.entity.User;
import com.vlad.restaurant.repository.CategoryRepository;
import com.vlad.restaurant.repository.MenuItemRepository;
import com.vlad.restaurant.repository.RestaurantTableRepository;
import com.vlad.restaurant.repository.UserRepository;
import com.vlad.restaurant.service.TableService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

// Початкові дані для розробки: адмін, кілька столів і тестове меню.
// Заповнюється лише якщо відповідні таблиці порожні.
@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RestaurantTableRepository tableRepository;
    private final CategoryRepository categoryRepository;
    private final MenuItemRepository menuItemRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.count() == 0) {
            createUser("admin@restaurant.com", "admin123", Role.ROLE_ADMIN);
            createUser("cook@restaurant.com", "cook123", Role.ROLE_COOK);
            createUser("waiter@restaurant.com", "waiter123", Role.ROLE_WAITER);
            log.info("Створено тестових користувачів: admin@/cook@/waiter@restaurant.com");
        }

        if (tableRepository.count() == 0) {
            for (int i = 1; i <= 5; i++) {
                RestaurantTable t = new RestaurantTable();
                t.setNumber(i);
                t.setQrCodeHash(TableService.generateQrHash());
                tableRepository.save(t);
                log.info("Стіл №{} qrHash={}", i, t.getQrCodeHash());
            }
        }

                if (categoryRepository.count() < 5) {
            Category breakfasts = saveCategory("Сніданки");
            Category main = saveCategory("Основні страви");
            Category pizza = saveCategory("Піца");
            Category burgers = saveCategory("Бургери");
            Category salads = saveCategory("Салати");
            Category drinks = saveCategory("Напої");
            Category desserts = saveCategory("Десерти");

            saveItem("Англійський сніданок", "245.00", "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600&q=80", breakfasts);
            saveItem("Вівсянка з ягодами", "150.00", "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=600&q=80", breakfasts);
            saveItem("Сирники зі сметаною", "180.00", "https://images.unsplash.com/photo-1525385133512-2f3bdd039054?w=600&q=80", breakfasts);
            saveItem("Яйця Бенедикт", "210.00", "https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=600&q=80", breakfasts);

            saveItem("Стейк Рибай", "850.00", "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80", main);
            saveItem("Лосось на грилі", "620.00", "https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=600&q=80", main);
            saveItem("Паста Карбонара", "285.00", "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=600&q=80", main);
            saveItem("Куряче філе з овочами", "260.00", "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&q=80", main);

            saveItem("Піца Маргарита", "250.00", "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80", pizza);
            saveItem("Піца Чотири Сири", "320.00", "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80", pizza);
            saveItem("Піца Пепероні", "295.00", "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&q=80", pizza);

            saveItem("Класичний Чизбургер", "230.00", "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80", burgers);
            saveItem("Бургер з рваною свининою", "265.00", "https://images.unsplash.com/photo-1520072959219-c595dc870360?w=600&q=80", burgers);
            saveItem("Дабл Біф Бургер", "340.00", "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&q=80", burgers);

            saveItem("Салат Цезар з куркою", "220.00", "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=600&q=80", salads);
            saveItem("Грецький салат", "190.00", "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&q=80", salads);
            saveItem("Салат з тунцем", "260.00", "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80", salads);

            saveItem("Капучино", "65.00", "https://images.unsplash.com/photo-1534040385115-33dcb3acba5b?w=600&q=80", drinks);
            saveItem("Лате", "70.00", "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=600&q=80", drinks);
            saveItem("Матча Лате", "95.00", "https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?w=600&q=80", drinks);
            saveItem("Лимонад Маракуйя", "110.00", "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&q=80", drinks);
            saveItem("Мохіто б/а", "120.00", "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=600&q=80", drinks);
            saveItem("Апельсиновий фреш", "140.00", "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&q=80", drinks);

            saveItem("Тірамісу", "160.00", "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=600&q=80", desserts);
            saveItem("Шоколадний Фондан", "185.00", "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&q=80", desserts);
            saveItem("Чизкейк Нью-Йорк", "150.00", "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&q=80", desserts);
            saveItem("Макаруни (сет 5 шт)", "220.00", "https://images.unsplash.com/photo-1569864358642-9d1684040f43?w=600&q=80", desserts);
        }
    }

    private void createUser(String email, String rawPassword, Role role) {
        User u = new User();
        u.setEmail(email);
        u.setPassword(passwordEncoder.encode(rawPassword));
        u.setRole(role);
        userRepository.save(u);
    }

    private Category saveCategory(String name) {
        Category c = new Category();
        c.setName(name);
        return categoryRepository.save(c);
    }

    private void saveItem(String name, String price, String imageUrl, Category category) {
        if (menuItemRepository.findAll().stream().anyMatch(i -> i.getName().equals(name))) return;

        MenuItem m = new MenuItem();
        m.setName(name);
        m.setPrice(new BigDecimal(price));
        m.setCategory(category);
        menuItemRepository.save(m);
    }
}
