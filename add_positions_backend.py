with open('src/main/java/com/vlad/restaurant/dto/TablePositionUpdateRequest.java', 'w') as f:
    f.write("""package com.vlad.restaurant.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record TablePositionUpdateRequest(
        @NotNull UUID id,
        Double positionX,
        Double positionY
) {}
""")

with open('src/main/java/com/vlad/restaurant/service/TableService.java', 'r') as f:
    content = f.read()

import_stmt = "import com.vlad.restaurant.dto.TableResponse;"
new_import = "import com.vlad.restaurant.dto.TableResponse;\nimport com.vlad.restaurant.dto.TablePositionUpdateRequest;\nimport org.springframework.transaction.annotation.Transactional;"
content = content.replace(import_stmt, new_import)

new_method = """    @Transactional
    public void updatePositions(List<TablePositionUpdateRequest> requests) {
        for (TablePositionUpdateRequest req : requests) {
            tableRepository.findById(req.id()).ifPresent(t -> {
                t.setPositionX(req.positionX());
                t.setPositionY(req.positionY());
            });
        }
    }
}"""
content = content.replace("}", new_method)
content = content.replace("}\n}", "}")

with open('src/main/java/com/vlad/restaurant/service/TableService.java', 'w') as f:
    f.write(content)

with open('src/main/java/com/vlad/restaurant/controller/TableController.java', 'r') as f:
    content = f.read()

import_stmt = "import com.vlad.restaurant.dto.TableResponse;"
new_import = "import com.vlad.restaurant.dto.TableResponse;\nimport com.vlad.restaurant.dto.TablePositionUpdateRequest;"
content = content.replace(import_stmt, new_import)

new_method = """    @PatchMapping("/positions")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void updatePositions(@Valid @RequestBody List<TablePositionUpdateRequest> requests) {
        tableService.updatePositions(requests);
    }
}"""
content = content.replace("}", new_method)
content = content.replace("}\n}", "}")

with open('src/main/java/com/vlad/restaurant/controller/TableController.java', 'w') as f:
    f.write(content)

