package com.payments.dto;

public record PaymentStatsResponse(

        long total,
        long created,
        long validated,
        long sent,
        long completed,
        long failed
) {
}
