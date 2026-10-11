import re

with open('src/main/java/com/vlad/restaurant/service/OrderService.java', 'r') as f:
    content = f.read()

old_code = """                    if (menuItem.getVariations() != null && !menuItem.getVariations().isBlank()) {
                        java.util.List<Map<String, Object>> variations = mapper.readValue(menuItem.getVariations(), new com.fasterxml.jackson.core.type.TypeReference<>() {});
                        for (Map.Entry<String, String> entry : itemRequest.options().entrySet()) {
                            for (Map<String, Object> varGroup : variations) {
                                if (entry.getKey().equals(varGroup.get("name"))) {
                                    java.util.List<Map<String, Object>> options = (java.util.List<Map<String, Object>>) varGroup.get("options");
                                    for (Map<String, Object> opt : options) {
                                        if (entry.getValue().equals(opt.get("name"))) {
                                            java.math.BigDecimal optPrice = new java.math.BigDecimal(opt.get("price").toString());
                                            Boolean isAbsolute = (Boolean) opt.get("isAbsolute");
                                            if (Boolean.TRUE.equals(isAbsolute)) {
                                                finalPrice = optPrice;
                                            } else {
                                                finalPrice = finalPrice.add(optPrice);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }"""

new_code = """                    if (menuItem.getVariations() != null && !menuItem.getVariations().isBlank()) {
                        java.util.List<Map<String, Object>> variations = mapper.readValue(menuItem.getVariations(), new com.fasterxml.jackson.core.type.TypeReference<>() {});
                        java.util.List<Map<String, Object>> selectedOpts = new java.util.ArrayList<>();
                        
                        for (Map.Entry<String, String> entry : itemRequest.options().entrySet()) {
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
                        }
                        
                        // First apply absolute prices
                        for (Map<String, Object> opt : selectedOpts) {
                            Boolean isAbsolute = (Boolean) opt.get("isAbsolute");
                            if (Boolean.TRUE.equals(isAbsolute)) {
                                finalPrice = new java.math.BigDecimal(opt.get("price").toString());
                            }
                        }
                        
                        // Then apply additive prices
                        for (Map<String, Object> opt : selectedOpts) {
                            Boolean isAbsolute = (Boolean) opt.get("isAbsolute");
                            if (!Boolean.TRUE.equals(isAbsolute)) {
                                finalPrice = finalPrice.add(new java.math.BigDecimal(opt.get("price").toString()));
                            }
                        }
                    }"""

content = content.replace(old_code, new_code)

with open('src/main/java/com/vlad/restaurant/service/OrderService.java', 'w') as f:
    f.write(content)
