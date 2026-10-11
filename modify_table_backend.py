with open('src/main/java/com/vlad/restaurant/entity/RestaurantTable.java', 'r') as f:
    content = f.read()

content = content.replace(
    "private String qrCodeHash;",
    "private String qrCodeHash;\n\n    @Column(name = \"position_x\")\n    private Double positionX;\n\n    @Column(name = \"position_y\")\n    private Double positionY;"
)
with open('src/main/java/com/vlad/restaurant/entity/RestaurantTable.java', 'w') as f:
    f.write(content)

with open('src/main/java/com/vlad/restaurant/dto/TableResponse.java', 'r') as f:
    content = f.read()

content = content.replace(
    "String qrCodeUrl",
    "String qrCodeUrl,\n        Double positionX,\n        Double positionY"
)
content = content.replace(
    "\"/tables/\" + t.getId() + \"/qr\"",
    "\"/tables/\" + t.getId() + \"/qr\",\n                t.getPositionX(),\n                t.getPositionY()"
)
with open('src/main/java/com/vlad/restaurant/dto/TableResponse.java', 'w') as f:
    f.write(content)

import os
with open('src/main/resources/db/migration/V6__add_table_coordinates.sql', 'w') as f:
    f.write("ALTER TABLE restaurant_tables ADD COLUMN position_x DOUBLE PRECISION;\nALTER TABLE restaurant_tables ADD COLUMN position_y DOUBLE PRECISION;\n")

