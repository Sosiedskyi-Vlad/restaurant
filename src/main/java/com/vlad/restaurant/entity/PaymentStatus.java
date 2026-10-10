package com.vlad.restaurant.entity;

public enum PaymentStatus {
    PENDING, // платіж створено, очікуємо підтвердження від LiqPay
    SUCCESS, // гроші списано
    FAILED   // відхилено / помилка / повернено
}
