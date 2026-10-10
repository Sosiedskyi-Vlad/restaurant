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

            saveItem("Англійський сніданок", "245.00", "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600&q=80", breakfasts, "Яйця, бекон, сосиски, квасоля в томатному соусі, печериці, тости", "Яйця, Глютен", 142);
            saveItem("Вівсянка з ягодами", "150.00", "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=600&q=80", breakfasts, "Вівсяні пластівці, молоко, свіжі ягоди, мед, мигдаль", "Лактоза, Горіхи", 89);
            saveItem("Сирники зі сметаною", "180.00", "https://images.unsplash.com/photo-1525385133512-2f3bdd039054?w=600&q=80", breakfasts, "Домашній сир, яйця, борошно, ваніль, сметана, ягідний кюлі", "Лактоза, Яйця, Глютен", 356);
            saveItem("Яйця Бенедикт", "210.00", "https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=600&q=80", breakfasts, "Яйця пашот, булочка бріош, бекон, голландський соус", "Яйця, Глютен, Лактоза", 210);

            saveItem("Стейк Рибай", "850.00", "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80", main, "Мармурова яловичина (Ribeye), морська сіль, чорний перець, розмарин, вершкове масло", "Лактоза", 430);
            saveItem("Лосось на грилі", "620.00", "https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=600&q=80", main, "Філе лосося, лимон, спаржа, оливкова олія, соус тар-тар", "Риба, Яйця", 275);
            saveItem("Паста Карбонара", "285.00", "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=600&q=80", main, "Паста спагетті, гуанчіале, яєчний жовток, сир Пекоріно Романо, чорний перець", "Глютен, Яйця, Лактоза", 512);
            saveItem("Куряче філе з овочами", "260.00", "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&q=80", main, "Куряче філе су-від, броколі, морква, цукіні, соєвий соус", "Соя", 120);

            saveItem("Піца Маргарита", "250.00", "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80", pizza, "Тісто для піци, томатний соус пелаті, моцарела, свіжий базилік", "Глютен, Лактоза", 340);
            saveItem("Піца Чотири Сири", "320.00", "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80", pizza, "Тісто, вершковий соус, моцарела, горгонзола, пармезан, емменталь", "Глютен, Лактоза", 489);
            saveItem("Піца Пепероні", "295.00", "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&q=80", pizza, "Тісто, томатний соус, моцарела, італійські ковбаски пепероні", "Глютен, Лактоза", 620);

            saveItem("Класичний Чизбургер", "230.00", "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80", burgers, "Булочка бріош, яловича котлета, сир чеддер, мариновані огірки, кетчуп, гірчиця", "Глютен, Лактоза, Гірчиця", 310);
            saveItem("Бургер з рваною свининою", "265.00", "https://images.unsplash.com/photo-1520072959219-c595dc870360?w=600&q=80", burgers, "Булочка, томлена свинина (pulled pork), соус барбекю, салат коул слоу", "Глютен, Яйця", 185);
            saveItem("Дабл Біф Бургер", "340.00", "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&q=80", burgers, "Булочка, дві яловичі котлети, подвійний сир чеддер, бекон, фірмовий соус", "Глютен, Лактоза, Яйця", 405);

            saveItem("Салат Цезар з куркою", "220.00", "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=600&q=80", salads, "Мікс салату ромен, куряче філе гриль, перепелині яйця, пармезан, крутони, соус цезар", "Глютен, Лактоза, Яйця, Риба", 580);
            saveItem("Грецький салат", "190.00", "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&q=80", salads, "Помідори, огірки, болгарський перець, сир фета, оливки каламата, червона цибуля, оливкова олія", "Лактоза", 290);
            saveItem("Салат з тунцем", "260.00", "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80", salads, "Мікс салатів, консервований тунець, стручкова квасоля, помідори чері, яйце, гірчична заправка", "Риба, Яйця, Гірчиця", 145);

            saveItem("Капучино", "65.00", "https://images.unsplash.com/photo-1534040385115-33dcb3acba5b?w=600&q=80", drinks, "Еспресо, збите гаряче молоко", "Лактоза", 850);
            saveItem("Лате", "70.00", "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=600&q=80", drinks, "Еспресо, багато гарячого молока, легка молочна піна", "Лактоза", 720);
            saveItem("Матча Лате", "95.00", "https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?w=600&q=80", drinks, "Японський зелений чай матча, гаряче молоко, сироп агави", "Лактоза", 315);
            saveItem("Лимонад Маракуйя", "110.00", "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&q=80", drinks, "Пюре маракуйї, лимонний сік, цукровий сироп, содова, лід, м'ята", "", 420);
            saveItem("Мохіто б/а", "120.00", "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=600&q=80", drinks, "Свіжа м'ята, лайм, тростинний цукор, содова, лід", "", 380);
            saveItem("Апельсиновий фреш", "140.00", "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&q=80", drinks, "100% свіжовичавлений сік апельсина", "", 210);

            saveItem("Тірамісу", "160.00", "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=600&q=80", desserts, "Печиво савоярді, сир маскарпоне, еспресо, яйця, какао-порошок, лікер Амаретто", "Глютен, Лактоза, Яйця", 670);
            saveItem("Шоколадний Фондан", "185.00", "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&q=80", desserts, "Чорний шоколад, вершкове масло, яйця, цукор, борошно. Подається з морозивом", "Глютен, Лактоза, Яйця", 530);
            saveItem("Чизкейк Нью-Йорк", "150.00", "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&q=80", desserts, "Крем-сир, вершки, яйця, цукор, пісочна основа, ванільний екстракт", "Глютен, Лактоза, Яйця", 490);
            saveItem("Макаруни (сет 5 шт)", "220.00", "https://images.unsplash.com/photo-1569864358642-9d1684040f43?w=600&q=80", desserts, "Мигдальне борошно, білки, цукор, ганаш на основі білого шоколаду та фруктових пюре", "Горіхи, Яйця, Лактоза", 275);
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

    private void saveItem(String name, String price, String imageUrl, Category category, String ingredients, String allergens, int favs) {
        if (menuItemRepository.findAll().stream().anyMatch(i -> i.getName().equals(name))) return;

        MenuItem m = new MenuItem();
        m.setName(name);
        m.setPrice(new BigDecimal(price));
        m.setCategory(category);
        m.setImageUrl(imageUrl);
        m.setIngredients(ingredients);
        m.setAllergens(allergens);
        m.setFavoritesCount(favs);
        menuItemRepository.save(m);
    }
}
