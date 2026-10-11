with open('src/main/java/com/vlad/restaurant/service/TableService.java', 'r') as f:
    content = f.read()

import_stmt = "import com.vlad.restaurant.dto.TableResponse;"
new_import = "import com.vlad.restaurant.dto.TableResponse;\nimport com.vlad.restaurant.dto.TablePositionUpdateRequest;"
content = content.replace(import_stmt, new_import)

# Find the last brace and insert the method
idx = content.rfind('}')
if idx != -1:
    method = """
    @Transactional
    public void updatePositions(List<TablePositionUpdateRequest> requests) {
        for (TablePositionUpdateRequest req : requests) {
            repository.findById(req.id()).ifPresent(t -> {
                t.setPositionX(req.positionX());
                t.setPositionY(req.positionY());
            });
        }
    }
}"""
    content = content[:idx] + method

with open('src/main/java/com/vlad/restaurant/service/TableService.java', 'w') as f:
    f.write(content)
