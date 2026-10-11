with open('src/main/java/com/vlad/restaurant/dto/TableResponse.java', 'r') as f:
    content = f.read()

content = content.replace(
    "String qrCodeHash)",
    "String qrCodeHash, Double positionX, Double positionY)"
)

content = content.replace(
    "t.getQrCodeHash())",
    "t.getQrCodeHash(), t.getPositionX(), t.getPositionY())"
)

with open('src/main/java/com/vlad/restaurant/dto/TableResponse.java', 'w') as f:
    f.write(content)
