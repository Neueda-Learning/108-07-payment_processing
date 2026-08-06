package com.payments.service;

import com.payments.exception.PaymentValidationException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ExchangeRateServiceTest {

    private final ExchangeRateService service = new ExchangeRateService();

    @Test
    void getRate_sameCurrency_returnsOne() {
        assertThat(service.getRate("USD", "USD")).isEqualByComparingTo(BigDecimal.ONE);
        assertThat(service.getRate("eur", "EUR")).isEqualByComparingTo(BigDecimal.ONE);
    }

    @Test
    void getRate_usdToEur_matchesTable() {
        // toRate / fromRate = 0.92 / 1.00
        assertThat(service.getRate("USD", "EUR")).isEqualByComparingTo(new BigDecimal("0.920000"));
    }

    @Test
    void getRate_eurToUsd_isInverse() {
        // 1.00 / 0.92, rounded to 6dp
        assertThat(service.getRate("EUR", "USD")).isEqualByComparingTo(new BigDecimal("1.086957"));
    }

    @Test
    void getRate_isCaseInsensitive() {
        assertThat(service.getRate("usd", "inr")).isEqualByComparingTo(service.getRate("USD", "INR"));
    }

    @Test
    void getRate_unsupportedCurrency_throws() {
        assertThatThrownBy(() -> service.getRate("USD", "GBP"))
                .isInstanceOf(PaymentValidationException.class)
                .hasMessageContaining("GBP");

        assertThatThrownBy(() -> service.getRate("GBP", "USD"))
                .isInstanceOf(PaymentValidationException.class)
                .extracting(ex -> ((PaymentValidationException) ex).getErrorCode())
                .isEqualTo("UNSUPPORTED_CURRENCY");
    }

    @Test
    void convert_sameCurrency_returnsSameAmount() {
        assertThat(service.convert(new BigDecimal("100.00"), "USD", "USD"))
                .isEqualByComparingTo(new BigDecimal("100.00"));
    }

    @Test
    void convert_crossCurrency_roundsToTwoDecimalPlaces() {
        // 100 USD -> EUR at 0.92 => 92.00
        assertThat(service.convert(new BigDecimal("100.00"), "USD", "EUR"))
                .isEqualByComparingTo(new BigDecimal("92.00"));
    }
}
