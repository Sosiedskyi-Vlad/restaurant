with open('src/main/java/com/vlad/restaurant/service/MenuService.java', 'r') as f:
    content = f.read()

imports = """import java.math.RoundingMode;
import java.util.List;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;"""

content = content.replace("import java.math.RoundingMode;\nimport java.util.List;", imports)

# Categories
content = content.replace(
    "@Transactional(readOnly = true)\n    public List<CategoryResponse> getActiveCategories()",
    "@Cacheable(\"categories\")\n    @Transactional(readOnly = true)\n    public List<CategoryResponse> getActiveCategories()"
)

content = content.replace(
    "@Transactional\n    public CategoryResponse createCategory(",
    "@CacheEvict(value = \"categories\", allEntries = true)\n    @Transactional\n    public CategoryResponse createCategory("
)

content = content.replace(
    "@Transactional\n    public CategoryResponse updateCategory(",
    "@Caching(evict = {\n        @CacheEvict(value = \"categories\", allEntries = true),\n        @CacheEvict(value = \"menuItems\", allEntries = true)\n    })\n    @Transactional\n    public CategoryResponse updateCategory("
)

content = content.replace(
    "@Transactional\n    public void deleteCategory(",
    "@Caching(evict = {\n        @CacheEvict(value = \"categories\", allEntries = true),\n        @CacheEvict(value = \"menuItems\", allEntries = true)\n    })\n    @Transactional\n    public void deleteCategory("
)

# Items
content = content.replace(
    "@Transactional(readOnly = true)\n    public List<MenuItemResponse> getItems(",
    "@Cacheable(value = \"menuItems\", key = \"#categoryId != null ? #categoryId : 'ALL'\")\n    @Transactional(readOnly = true)\n    public List<MenuItemResponse> getItems("
)

item_evict = "@CacheEvict(value = \"menuItems\", allEntries = true)\n    @Transactional"
content = content.replace("@Transactional\n    public MenuItemResponse createItem(", item_evict + "\n    public MenuItemResponse createItem(")
content = content.replace("@Transactional\n    public MenuItemResponse updateItem(", item_evict + "\n    public MenuItemResponse updateItem(")
content = content.replace("@Transactional\n    public MenuItemResponse setAvailability(", item_evict + "\n    public MenuItemResponse setAvailability(")
content = content.replace("@Transactional\n    public void deleteItem(", item_evict + "\n    public void deleteItem(")
content = content.replace("@Transactional\n    public void likeItem(", item_evict + "\n    public void likeItem(")
content = content.replace("@Transactional\n    public void unlikeItem(", item_evict + "\n    public void unlikeItem(")
content = content.replace("@Transactional\n    public MenuItemResponse uploadImage(", item_evict + "\n    public MenuItemResponse uploadImage(")

with open('src/main/java/com/vlad/restaurant/service/MenuService.java', 'w') as f:
    f.write(content)
