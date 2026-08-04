// Local payments service — stores payments in localStorage.
// Replace with real API calls (paymentsApi.*) once the Spring Boot backend is running.

const PAYMENTS_KEY = 'pps_payments';
const HISTORY_KEY  = 'pps_history';

// ── helpers ────────────────────────────────────────────────────────────────

function now() {
  return new Date().toISOString();
}

function generatePaymentId(existingPayments) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const length = 12;

  for (let attempt = 0; attempt < 50; attempt += 1) {
    let id = '';
    for (let i = 0; i < length; i += 1) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    if (!existingPayments.some((p) => p.id === id)) {
      return id;
    }
  }

  return (Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2).toUpperCase())
    .slice(0, 12)
    .padEnd(12, '0');
}

function getPayments() {
  try { return JSON.parse(localStorage.getItem(PAYMENTS_KEY)) || []; }
  catch { return []; }
}

function savePayments(payments) {
  localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments));
}

function getAllHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
  catch { return []; }
}

function saveAllHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function addHistoryEntry(paymentId, fromStatus, toStatus, errorCode, note) {
  const history = getAllHistory();
  history.push({
    paymentId,
    fromStatus: fromStatus || null,
    status: toStatus,
    timestamp: now(),
    errorCode: errorCode || null,
    note: note || null,
  });
  saveAllHistory(history);
}

const STATUS_FLOW = ['CREATED', 'VALIDATED', 'SENT', 'COMPLETED'];

// ── public API ──────────────────────────────────────────────────────────────

export function localCreatePayment(payload) {
  const payments = getPayments();

  // Idempotency check
  if (payload.idempotencyKey) {
    const existing = payments.find((p) => p.idempotencyKey === payload.idempotencyKey);
    if (existing) return existing;
  }

  const payment = {
    id:                 generatePaymentId(payments),
    sourceAccount:      payload.sourceAccount,
    destinationAccount: payload.destinationAccount,
    amount:             payload.amount,
    currency:           payload.currency,
    reference:          payload.reference || null,
    idempotencyKey:     payload.idempotencyKey || null,
    status:             'CREATED',
    errorCode:          null,
    errorMessage:       null,
    createdAt:          now(),
    updatedAt:          now(),
  };

  payments.unshift(payment);
  savePayments(payments);
  addHistoryEntry(payment.id, null, 'CREATED', null, 'Payment submitted');
  return payment;
}

export function localGetAllPayments(status) {
  const payments = getPayments();
  return status ? payments.filter((p) => p.status === status) : payments;
}

export function localGetPaymentById(id) {
  const payment = getPayments().find((p) => p.id === id);
  if (!payment) {
    const err = new Error('Payment not found: ' + id);
    err.code = 'PAYMENT_NOT_FOUND';
    throw err;
  }
  return payment;
}

export function localGetPaymentHistory(id) {
  return getAllHistory()
    .filter((h) => h.paymentId === id)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

export function localAdvanceStatus(id) {
  const payments = getPayments();
  const idx = payments.findIndex((p) => p.id === id);
  if (idx === -1) { const e = new Error('Payment not found'); e.code = 'PAYMENT_NOT_FOUND'; throw e; }

  const payment = payments[idx];
  const currentIdx = STATUS_FLOW.indexOf(payment.status);

  if (payment.status === 'FAILED') {
    const e = new Error('Cannot advance a FAILED payment'); e.code = 'INVALID_STATUS_TRANSITION'; throw e;
  }
  if (payment.status === 'COMPLETED') {
    const e = new Error('Payment is already COMPLETED'); e.code = 'INVALID_STATUS_TRANSITION'; throw e;
  }

  const nextStatus = STATUS_FLOW[currentIdx + 1];
  const prevStatus = payment.status;
  payments[idx] = { ...payment, status: nextStatus, updatedAt: now() };
  savePayments(payments);
  addHistoryEntry(id, prevStatus, nextStatus, null, `Advanced to ${nextStatus}`);
  return payments[idx];
}

export function localFailPayment(id, errorCode) {
  const payments = getPayments();
  const idx = payments.findIndex((p) => p.id === id);
  if (idx === -1) { const e = new Error('Payment not found'); e.code = 'PAYMENT_NOT_FOUND'; throw e; }

  const payment = payments[idx];
  if (payment.status === 'COMPLETED' || payment.status === 'FAILED') {
    const e = new Error(`Cannot fail a ${payment.status} payment`); e.code = 'INVALID_STATUS_TRANSITION'; throw e;
  }

  const prevStatus = payment.status;
  payments[idx] = { ...payment, status: 'FAILED', errorCode: errorCode || 'PROCESSING_ERROR', updatedAt: now() };
  savePayments(payments);
  addHistoryEntry(id, prevStatus, 'FAILED', errorCode, `Payment failed: ${errorCode}`);
  return payments[idx];
}

export function localGetStats() {
  const payments = getPayments();
  const counts = payments.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});
  return {
    total:     payments.length,
    created:   counts.CREATED   || 0,
    validated: counts.VALIDATED || 0,
    sent:      counts.SENT      || 0,
    completed: counts.COMPLETED || 0,
    failed:    counts.FAILED    || 0,
  };
}
