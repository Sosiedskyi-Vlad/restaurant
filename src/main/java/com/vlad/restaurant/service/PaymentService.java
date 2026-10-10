package com.vlad.restaurant.service;

import com.vlad.restaurant.dto.CheckoutRequest;
import com.vlad.restaurant.dto.CheckoutResponse;
import com.vlad.restaurant.dto.OrderResponse;
import com.vlad.restaurant.dto.PaymentResponse;
import com.vlad.restaurant.entity.Order;
import com.vlad.restaurant.entity.OrderStatus;
import com.vlad.restaurant.entity.Payment;
import com.vlad.restaurant.entity.PaymentStatus;
import com.vlad.restaurant.exception.BadRequestException;
import com.vlad.restaurant.exception.ConflictException;
import com.vlad.restaurant.exception.ResourceNotFoundException;
import com.vlad.restaurant.payment.LiqPayClient;
import com.vlad.restaurant.repository.OrderRepository;
import com.vlad.restaurant.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

// Методи навмисно без @Transactional: HTTP-запит до LiqPay не повинен тримати відкриту
// транзакцію БД. Транзакції відкриваються точково через TransactionTemplate.
@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private static final Set<String> SUCCESS_STATUSES = Set.of("success", "sandbox");
    private static final Set<String> FAILURE_STATUSES = Set.of("failure", "error", "reversed");

    private record Prepared(Payment payment, int tableNumber) {}

    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final OrderService orderService;
    private final LiqPayClient liqPay;
    private final TransactionTemplate tx;

    // Крок 1: гість натискає "Оплатити" - отримує параметри для переходу на сторінку LiqPay
    public CheckoutResponse checkout(UUID tableId, CheckoutRequest request) {
        liqPay.requireConfigured(); // швидка відповідь 503 до звернення в БД

        Prepared prepared = tx.execute(status -> {
            Order order = orderRepository.findWithDetailsById(request.orderId())
                    .filter(o -> o.getTable() != null && o.getTable().getId().equals(tableId))
                    .orElseThrow(() -> new ResourceNotFoundException("Замовлення не знайдено"));
            if (order.isPaid() || order.getStatus() == OrderStatus.PAID) {
                throw new ConflictException("Замовлення вже оплачене");
            }
            Payment p = new Payment();
            p.setOrder(order);
            p.setAmount(OrderResponse.from(order).total()); // сума рахується на сервері, не приходить від клієнта
            p.setCurrency(liqPay.currency());
            return new Prepared(paymentRepository.save(p), order.getTable().getNumber());
        });

        Payment payment = prepared.payment();
        String data = liqPay.buildCheckoutData(payment.getId(), payment.getAmount(),
                "Замовлення, стіл №" + prepared.tableNumber());
        return new CheckoutResponse(payment.getId(), liqPay.checkoutUrl(), data, liqPay.sign(data),
                payment.getAmount(), payment.getCurrency());
    }

    // Крок 2а: server-to-server callback від LiqPay. Довіряємо лише підписаним даним.
    public void handleCallback(String data, String signature) {
        if (!liqPay.verifySignature(data, signature)) {
            throw new BadRequestException("Невірний підпис");
        }
        LiqPayClient.Result result;
        try {
            result = liqPay.parse(data);
        } catch (RuntimeException e) {
            throw new BadRequestException("Некоректні дані callback");
        }
        apply(result);
    }

    // Крок 2б: гість повернувся зі сторінки оплати - сервер сам питає LiqPay про статус.
    // Це робить систему стійкою, навіть якщо callback не дійшов (або його неможливо отримати локально).
    public PaymentResponse sync(UUID tableId, UUID paymentId) {
        PaymentStatus current = tx.execute(s -> paymentRepository.findById(paymentId)
                .filter(p -> p.getOrder().getTable() != null && p.getOrder().getTable().getId().equals(tableId))
                .orElseThrow(() -> new ResourceNotFoundException("Платіж не знайдено"))
                .getStatus());

        if (current == PaymentStatus.PENDING) {
            Optional<LiqPayClient.Result> result = liqPay.fetchStatus(paymentId);
            result.ifPresent(this::apply);
        }
        return tx.execute(s -> PaymentResponse.from(paymentRepository.findById(paymentId).orElseThrow()));
    }

    // Єдина точка застосування результату платежу (ідемпотентна)
    public void apply(LiqPayClient.Result result) {
        tx.executeWithoutResult(s -> {
            Payment payment = paymentRepository.findByIdForUpdate(result.paymentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Платіж не знайдено"));
            payment.setProviderStatus(result.status());
            payment.setProviderPaymentId(result.providerPaymentId());

            if (payment.getStatus() != PaymentStatus.PENDING) {
                return; // повторний callback
            }
            if (SUCCESS_STATUSES.contains(result.status())) {
                boolean amountMatches = payment.getAmount().compareTo(result.amount()) == 0
                        && payment.getCurrency().equals(result.currency());
                if (!amountMatches) {
                    // Підпис валідний, але сума не збігається - не закриваємо замовлення
                    log.error("Платіж {}: очікувалось {} {}, отримано {} {}", payment.getId(),
                            payment.getAmount(), payment.getCurrency(), result.amount(), result.currency());
                    payment.setStatus(PaymentStatus.FAILED);
                    payment.setCompletedAt(LocalDateTime.now());
                    return;
                }
                payment.setStatus(PaymentStatus.SUCCESS);
                payment.setCompletedAt(LocalDateTime.now());
                orderService.markPaidOnline(payment.getOrder().getId());
            } else if (FAILURE_STATUSES.contains(result.status())) {
                payment.setStatus(PaymentStatus.FAILED);
                payment.setCompletedAt(LocalDateTime.now());
            }
            // інші статуси (processing, wait_accept...) - залишаємось у PENDING
        });
    }
}
