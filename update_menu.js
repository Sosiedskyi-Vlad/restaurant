const fs = require('fs');

const items = [
    { name: "Англійський сніданок", ingredients: "Яйця, бекон, сосиски, квасоля в томатному соусі, печериці, тости", allergens: "Яйця, Глютен", favorites: 142 },
    { name: "Вівсянка з ягодами", ingredients: "Вівсяні пластівці, молоко, свіжі ягоди, мед, мигдаль", allergens: "Лактоза, Горіхи", favorites: 89 },
    { name: "Сирники зі сметаною", ingredients: "Домашній сир, яйця, борошно, ваніль, сметана, ягідний кюлі", allergens: "Лактоза, Яйця, Глютен", favorites: 356 },
    { name: "Яйця Бенедикт", ingredients: "Яйця пашот, булочка бріош, бекон, голландський соус", allergens: "Яйця, Глютен, Лактоза", favorites: 210 },
    
    { name: "Стейк Рибай", ingredients: "Мармурова яловичина (Ribeye), морська сіль, чорний перець, розмарин, вершкове масло", allergens: "Лактоза", favorites: 430 },
    { name: "Лосось на грилі", ingredients: "Філе лосося, лимон, спаржа, оливкова олія, соус тар-тар", allergens: "Риба, Яйця", favorites: 275 },
    { name: "Паста Карбонара", ingredients: "Паста спагетті, гуанчіале, яєчний жовток, сир Пекоріно Романо, чорний перець", allergens: "Глютен, Яйця, Лактоза", favorites: 512 },
    { name: "Куряче філе з овочами", ingredients: "Куряче філе су-від, броколі, морква, цукіні, соєвий соус", allergens: "Соя", favorites: 120 },
    
    { name: "Піца Маргарита", ingredients: "Тісто для піци, томатний соус пелаті, моцарела, свіжий базилік", allergens: "Глютен, Лактоза", favorites: 340 },
    { name: "Піца Чотири Сири", ingredients: "Тісто, вершковий соус, моцарела, горгонзола, пармезан, емменталь", allergens: "Глютен, Лактоза", favorites: 489 },
    { name: "Піца Пепероні", ingredients: "Тісто, томатний соус, моцарела, італійські ковбаски пепероні", allergens: "Глютен, Лактоза", favorites: 620 },
    
    { name: "Класичний Чизбургер", ingredients: "Булочка бріош, яловича котлета, сир чеддер, мариновані огірки, кетчуп, гірчиця", allergens: "Глютен, Лактоза, Гірчиця", favorites: 310 },
    { name: "Бургер з рваною свининою", ingredients: "Булочка, томлена свинина (pulled pork), соус барбекю, салат коул слоу", allergens: "Глютен, Яйця", favorites: 185 },
    { name: "Дабл Біф Бургер", ingredients: "Булочка, дві яловичі котлети, подвійний сир чеддер, бекон, фірмовий соус", allergens: "Глютен, Лактоза, Яйця", favorites: 405 },
    
    { name: "Салат Цезар з куркою", ingredients: "Мікс салату ромен, куряче філе гриль, перепелині яйця, пармезан, крутони, соус цезар", allergens: "Глютен, Лактоза, Яйця, Риба (в соусі)", favorites: 580 },
    { name: "Грецький салат", ingredients: "Помідори, огірки, болгарський перець, сир фета, оливки каламата, червона цибуля, оливкова олія", allergens: "Лактоза", favorites: 290 },
    { name: "Салат з тунцем", ingredients: "Мікс салатів, консервований тунець, стручкова квасоля, помідори чері, яйце, гірчична заправка", allergens: "Риба, Яйця, Гірчиця", favorites: 145 },
    
    { name: "Капучино", ingredients: "Еспресо, збите гаряче молоко", allergens: "Лактоза", favorites: 850 },
    { name: "Лате", ingredients: "Еспресо, багато гарячого молока, легка молочна піна", allergens: "Лактоза", favorites: 720 },
    { name: "Матча Лате", ingredients: "Японський зелений чай матча, гаряче молоко, сироп агави", allergens: "Лактоза", favorites: 315 },
    { name: "Лимонад Маракуйя", ingredients: "Пюре маракуйї, лимонний сік, цукровий сироп, содова, лід, м'ята", allergens: "", favorites: 420 },
    { name: "Мохіто б/а", ingredients: "Свіжа м'ята, лайм, тростинний цукор, содова, лід", allergens: "", favorites: 380 },
    { name: "Апельсиновий фреш", ingredients: "100% свіжовичавлений сік апельсина", allergens: "", favorites: 210 },
    
    { name: "Тірамісу", ingredients: "Печиво савоярді, сир маскарпоне, еспресо, яйця, какао-порошок, лікер Амаретто", allergens: "Глютен, Лактоза, Яйця", favorites: 670 },
    { name: "Шоколадний Фондан", ingredients: "Чорний шоколад, вершкове масло, яйця, цукор, борошно. Подається з кулькою ванільного морозива", allergens: "Глютен, Лактоза, Яйця", favorites: 530 },
    { name: "Чизкейк Нью-Йорк", ingredients: "Крем-сир, вершки, яйця, цукор, пісочна основа, ванільний екстракт", allergens: "Глютен, Лактоза, Яйця", favorites: 490 },
    { name: "Макаруни (сет 5 шт)", ingredients: "Мигдальне борошно, білки, цукор, ганаш на основі білого шоколаду та фруктових пюре", allergens: "Горіхи, Яйця, Лактоза", favorites: 275 }
];

const urls = {
    "Англійський сніданок": "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600&q=80",
    "Вівсянка з ягодами": "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=600&q=80",
    "Сирники зі сметаною": "https://images.unsplash.com/photo-1525385133512-2f3bdd039054?w=600&q=80",
    "Яйця Бенедикт": "https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=600&q=80",
    "Стейк Рибай": "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80",
    "Лосось на грилі": "https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=600&q=80",
    "Паста Карбонара": "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=600&q=80",
    "Куряче філе з овочами": "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&q=80",
    "Піца Маргарита": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80",
    "Піца Чотири Сири": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80",
    "Піца Пепероні": "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&q=80",
    "Класичний Чизбургер": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80",
    "Бургер з рваною свининою": "https://images.unsplash.com/photo-1520072959219-c595dc870360?w=600&q=80",
    "Дабл Біф Бургер": "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&q=80",
    "Салат Цезар з куркою": "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=600&q=80",
    "Грецький салат": "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&q=80",
    "Салат з тунцем": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80",
    "Капучино": "https://images.unsplash.com/photo-1534040385115-33dcb3acba5b?w=600&q=80",
    "Лате": "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=600&q=80",
    "Матча Лате": "https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?w=600&q=80",
    "Лимонад Маракуйя": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&q=80",
    "Мохіто б/а": "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=600&q=80",
    "Апельсиновий фреш": "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&q=80",
    "Тірамісу": "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=600&q=80",
    "Шоколадний Фондан": "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&q=80",
    "Чизкейк Нью-Йорк": "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&q=80",
    "Макаруни (сет 5 шт)": "https://images.unsplash.com/photo-1569864358642-9d1684040f43?w=600&q=80"
};

let query = "UPDATE menu_items SET ingredients = CASE name\n";
for(const item of items) {
    query += "  WHEN '" + item.name + "' THEN '" + item.ingredients + "'\n";
}
query += "  ELSE ingredients END,\nallergens = CASE name\n";
for(const item of items) {
    query += "  WHEN '" + item.name + "' THEN '" + item.allergens + "'\n";
}
query += "  ELSE allergens END,\nfavorites_count = CASE name\n";
for(const item of items) {
    query += "  WHEN '" + item.name + "' THEN " + item.favorites + "\n";
}
query += "  ELSE favorites_count END,\nimage_url = CASE name\n";
for(const item of items) {
    query += "  WHEN '" + item.name + "' THEN '" + urls[item.name] + "'\n";
}
query += "  ELSE image_url END;\n";

fs.writeFileSync('update_db.sql', query);
