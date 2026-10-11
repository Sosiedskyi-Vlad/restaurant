with open('src/main/java/com/vlad/restaurant/dto/OrderCreateRequest.java', 'r') as f:
    content = f.read()

content = content.replace("Map<String, String> options", "Map<String, List<String>> options")

with open('src/main/java/com/vlad/restaurant/dto/OrderCreateRequest.java', 'w') as f:
    f.write(content)


with open('src/main/java/com/vlad/restaurant/service/OrderService.java', 'r') as f:
    content = f.read()

old_service = """                        for (Map.Entry<String, String> entry : itemRequest.options().entrySet()) {
                            for (Map<String, Object> varGroup : variations) {
                                if (entry.getKey().equals(varGroup.get("name"))) {
                                    java.util.List<Map<String, Object>> options = (java.util.List<Map<String, Object>>) varGroup.get("options");
                                    for (Map<String, Object> opt : options) {
                                        if (entry.getValue().equals(opt.get("name"))) {
                                            selectedOpts.add(opt);
                                        }
                                    }
                                }
                            }
                        }"""

new_service = """                        for (Map.Entry<String, java.util.List<String>> entry : itemRequest.options().entrySet()) {
                            for (Map<String, Object> varGroup : variations) {
                                if (entry.getKey().equals(varGroup.get("name"))) {
                                    java.util.List<Map<String, Object>> options = (java.util.List<Map<String, Object>>) varGroup.get("options");
                                    for (Map<String, Object> opt : options) {
                                        if (entry.getValue().contains(opt.get("name"))) {
                                            selectedOpts.add(opt);
                                        }
                                    }
                                }
                            }
                        }"""

content = content.replace(old_service, new_service)

with open('src/main/java/com/vlad/restaurant/service/OrderService.java', 'w') as f:
    f.write(content)
