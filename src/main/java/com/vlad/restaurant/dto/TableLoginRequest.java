package com.vlad.restaurant.dto;

import jakarta.validation.constraints.NotBlank;

public record TableLoginRequest(@NotBlank String qrHash) {}
