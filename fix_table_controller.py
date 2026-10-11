with open('src/main/java/com/vlad/restaurant/controller/TableController.java', 'r') as f:
    content = f.read()

import_stmt = "import com.vlad.restaurant.dto.TableResponse;"
new_import = "import com.vlad.restaurant.dto.TableResponse;\nimport com.vlad.restaurant.dto.TablePositionUpdateRequest;"
content = content.replace(import_stmt, new_import)

idx = content.rfind('}')
if idx != -1:
    method = """
    @PatchMapping("/positions")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void updatePositions(@Valid @RequestBody List<TablePositionUpdateRequest> requests) {
        tableService.updatePositions(requests);
    }
}"""
    content = content[:idx] + method

with open('src/main/java/com/vlad/restaurant/controller/TableController.java', 'w') as f:
    f.write(content)
