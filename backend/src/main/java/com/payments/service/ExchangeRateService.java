package com.payments.service;

import com.payments.exception.PaymentValidationException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Locale;
import java.util.Map;

/**
 * Supplies the conversion rates used when a payment's source and destination
 * accounts are held in different currencies.
 *
 * <p>Only the currencies this system actually operates in are supported: USD, EUR
 * and INR. The table below is a static set of illustrative mid-market rates (units
 * of the currency per 1 USD) and is <b>not</b> live market data. In a real system
 * this would be replaced by calls to a live rate provider (refreshed periodically
 * and cached), but the rest of the payment flow does not need to change to support
 * that swap - only {@link #getRate} would move from a lookup table to an API call.
 */
@Service
public class ExchangeRateService {

    private static final Map<String, BigDecimal> RATES_PER_USD = Map.of(
            "USD", BigDecimal.valueOf(1.00),
            "EUR", BigDecimal.valueOf(0.92),
            "INR", BigDecimal.valueOf(83.30)
    );

    /**
     * The rate to multiply an amount held in {@code fromCurrency} by to arrive at
     * the equivalent amount in {@code toCurrency}.
     */
    public BigDecimal getRate(String fromCurrency, String toCurrency) {
        if (fromCurrency.equalsIgnoreCase(toCurrency)) {
            return BigDecimal.ONE;
        }
        BigDecimal fromRate = rateOf(fromCurrency);
        BigDecimal toRate = rateOf(toCurrency);
        return toRate.divide(fromRate, 6, RoundingMode.HALF_UP);
    }

    /** Converts {@code amount} from {@code fromCurrency} into {@code toCurrency}, rounded to 2dp. */
    public BigDecimal convert(BigDecimal amount, String fromCurrency, String toCurrency) {
        return amount.multiply(getRate(fromCurrency, toCurrency)).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal rateOf(String currency) {
        BigDecimal rate = RATES_PER_USD.get(currency.toUpperCase(Locale.ROOT));
        if (rate == null) {
            throw new PaymentValidationException("UNSUPPORTED_CURRENCY",
                    "No exchange rate available for currency: " + currency);
        }
        return rate;
    }
}
