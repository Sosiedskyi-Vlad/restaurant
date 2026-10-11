with open('src/main/java/com/vlad/restaurant/controller/TableController.java', 'r') as f:
    content = f.read()

content = content.replace("@PreAuthorize(\"hasRole('ADMIN')\")\npublic class", "public class")
content = content.replace("public List<TableResponse> getAll()", "@PreAuthorize(\"hasAnyRole('ADMIN', 'WAITER')\")\n    public List<TableResponse> getAll()")
content = content.replace("public TableResponse create(", "@PreAuthorize(\"hasRole('ADMIN')\")\n    public TableResponse create(")
content = content.replace("public TableResponse regenerateQr(", "@PreAuthorize(\"hasRole('ADMIN')\")\n    public TableResponse regenerateQr(")
content = content.replace("public ResponseEntity<byte[]> qrImage(", "@PreAuthorize(\"hasRole('ADMIN')\")\n    public ResponseEntity<byte[]> qrImage(")

with open('src/main/java/com/vlad/restaurant/controller/TableController.java', 'w') as f:
    f.write(content)
