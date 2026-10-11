with open('src/main/java/com/vlad/restaurant/repository/AnalyticsRepository.java', 'r') as f:
    content = f.read()

new_query = """    // Різниця між створенням і вирішенням виклику, у секундах
    @Query(value = \"\"\"
            select avg(extract(epoch from (s.resolved_at - s.created_at)))
            from service_calls s
            where s.resolved_at is not null and s.resolved_at >= :from and s.resolved_at < :to
            \"\"\", nativeQuery = true)
    Double avgWaiterReactionSeconds(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}"""

content = content.replace("}", new_query)
content = content.replace("}\n}", "}")

with open('src/main/java/com/vlad/restaurant/repository/AnalyticsRepository.java', 'w') as f:
    f.write(content)


with open('src/main/java/com/vlad/restaurant/dto/AnalyticsResponse.java', 'r') as f:
    content = f.read()

content = content.replace("Double avgCookingMinutes,", "Double avgCookingMinutes,\n        Double avgWaiterReactionMinutes,")

with open('src/main/java/com/vlad/restaurant/dto/AnalyticsResponse.java', 'w') as f:
    f.write(content)


with open('src/main/java/com/vlad/restaurant/service/AnalyticsService.java', 'r') as f:
    content = f.read()

old_minutes = "Double minutes = seconds == null ? null : Math.round(seconds / 60.0 * 10) / 10.0;"
new_minutes = """Double minutes = seconds == null ? null : Math.round(seconds / 60.0 * 10) / 10.0;
        
        Double waiterSeconds = repository.avgWaiterReactionSeconds(start, end);
        Double waiterMinutes = waiterSeconds == null ? null : Math.round(waiterSeconds / 60.0 * 10) / 10.0;"""

content = content.replace(old_minutes, new_minutes)
content = content.replace("return new AnalyticsResponse(from, to, revenue, paidOrders, average, minutes, top, byDay);", "return new AnalyticsResponse(from, to, revenue, paidOrders, average, minutes, waiterMinutes, top, byDay);")

with open('src/main/java/com/vlad/restaurant/service/AnalyticsService.java', 'w') as f:
    f.write(content)
