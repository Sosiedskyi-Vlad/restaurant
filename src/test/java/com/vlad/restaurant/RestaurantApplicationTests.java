package com.vlad.restaurant;

import com.vlad.restaurant.entity.OrderStatus;
import com.vlad.restaurant.service.OrderService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
class RestaurantApplicationTests {

	@Autowired
	private OrderService orderService;

	@Test
	void contextLoads() {
	}

	@Test
	void testOrderHistoryService() {
		// 1. Without filters
		var pageAll = orderService.getOrderHistory(
				null, null, null, null, null,
				PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt"))
		);
		assertNotNull(pageAll);

		// 2. Today filter
		LocalDateTime todayStart = LocalDateTime.now().toLocalDate().atStartOfDay();
		var pageToday = orderService.getOrderHistory(
				null, null, todayStart, null, null,
				PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt"))
		);
		assertNotNull(pageToday);

		// 3. Paid filter
		var pagePaid = orderService.getOrderHistory(
				OrderStatus.PAID, null, null, null, null,
				PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt"))
		);
		assertNotNull(pagePaid);

		System.out.println(">>> Total orders in DB: " + pageAll.getTotalElements());
		System.out.println(">>> Today orders in DB: " + pageToday.getTotalElements());
		System.out.println(">>> Paid orders in DB: " + pagePaid.getTotalElements());
		if (!pagePaid.getContent().isEmpty()) {
			var first = pagePaid.getContent().get(0);
			System.out.println(">>> Sample order: ID=" + first.id() + ", Table=" + first.tableNumber() + ", Total=" + first.total() + ", Status=" + first.status());
		}
	}
}
