// Fully frontend-only payment store, backed by localStorage. No backend calls are
// made here so payment ids, account fields, descriptions and failure details can be
// shaped exactly as the UI needs, independent of the Java API.

const PAYMENTS_KEY = 'flashpay_payments';
const HISTORY_KEY = 'flashpay_payment_history';

const STATUS_FLOW = ['CREATED', 'VALIDATED', 'SENT', 'COMPLETED'];

// Picked when an in-flight payment is randomly failed during auto-advance.
const FAILURE_REASONS = [
  { errorCode: 'INSUFFICIENT_FUNDS', errorMessage: 'Source account has insufficient funds.' },
  { errorCode: 'INVALID_ACCOUNT', errorMessage: 'Account number is invalid or does not exist.' },
  { errorCode: 'PROCESSING_ERROR', errorMessage: 'Internal error during payment processing.' },
  { errorCode: 'NETWORK_ERROR', errorMessage: 'Communication failure with payment network.' },
];

function readPayments() {
  try {
    return JSON.parse(localStorage.getItem(PAYMENTS_KEY)) || [];
  } catch {
    return [];
  }
}

function writePayments(payments) {
  localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments));
}

function readHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function writeHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function notFoundError(id) {
  const err = new Error('Payment not found: ' + id);
  err.code = 'PAYMENT_NOT_FOUND';
  return err;
}

/** Random 12-digit numeral id (never starts with 0), unique among existing payments. */
function generatePaymentId(existingIds) {
  let id;
  do {
    id = String(Math.floor(100_000_000_000 + Math.random() * 900_000_000_000));
  } while (existingIds.has(id));
  return id;
}

function appendHistory(paymentId, oldStatus, status, reason, errorCode, errorMessage) {
  const history = readHistory();
  history.push({
    paymentId,
    oldStatus: oldStatus || null,
    status,
    timestamp: new Date().toISOString(),
    reason: reason || null,
    errorCode: errorCode || null,
    errorMessage: errorMessage || null,
  });
  writeHistory(history);
}

export async function localCreatePayment(payload) {
  const payments = readPayments();
  const id = generatePaymentId(new Set(payments.map((p) => p.id)));
  const now = new Date().toISOString();

  const payment = {
    id,
    amount: payload.amount,
    currency: payload.currency,
    sourceAccount: payload.sourceAccount,
    destinationAccount: payload.destinationAccount,
    description: payload.description || '',
    status: 'CREATED',
    createdAt: now,
  };

  payments.unshift(payment);
  writePayments(payments);
  appendHistory(id, null, 'CREATED', 'Payment created', null, null);

  return payment;
}

export async function localGetAllPayments(status) {
  const payments = readPayments()
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return status ? payments.filter((p) => p.status === status) : payments;
}

export async function localGetPaymentById(id) {
  const payment = readPayments().find((p) => p.id === id);
  if (!payment) throw notFoundError(id);
  return payment;
}

export async function localGetPaymentHistory(id) {
  return readHistory()
    .filter((h) => h.paymentId === id)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

export async function localAdvanceStatus(id) {
  const payments = readPayments();
  const payment = payments.find((p) => p.id === id);
  if (!payment) throw notFoundError(id);

  const idx = STATUS_FLOW.indexOf(payment.status);
  if (idx === -1 || idx === STATUS_FLOW.length - 1) {
    const err = new Error('Payment has already finished processing.');
    err.code = 'INVALID_STATUS_TRANSITION';
    throw err;
  }

  const oldStatus = payment.status;

  // Small chance of a simulated failure so the failure UI has something to show.
  if (Math.random() < 0.15) {
    const { errorCode, errorMessage } =
      FAILURE_REASONS[Math.floor(Math.random() * FAILURE_REASONS.length)];

    payment.status = 'FAILED';
    writePayments(payments);
    appendHistory(id, oldStatus, 'FAILED', 'Payment failed', errorCode, errorMessage);

    const err = new Error(errorMessage);
    err.code = errorCode;
    throw err;
  }

  const next = STATUS_FLOW[idx + 1];
  payment.status = next;
  writePayments(payments);
  appendHistory(id, oldStatus, next, 'Advanced to ' + next, null, null);

  return payment;
}

export async function localFailPayment(id, errorCode, errorMessage) {
  const payments = readPayments();
  const payment = payments.find((p) => p.id === id);
  if (!payment) throw notFoundError(id);

  if (payment.status === 'COMPLETED' || payment.status === 'FAILED') {
    const err = new Error('Payment has already finished processing.');
    err.code = 'INVALID_STATUS_TRANSITION';
    throw err;
  }

  const oldStatus = payment.status;
  const code = errorCode || 'PROCESSING_ERROR';
  const message = errorMessage || `Payment failed while in status ${oldStatus}`;

  payment.status = 'FAILED';
  writePayments(payments);
  appendHistory(id, oldStatus, 'FAILED', 'Payment failed', code, message);

  return payment;
}

export async function localGetStats() {
  const payments = readPayments();
  const stats = { total: payments.length, created: 0, validated: 0, sent: 0, completed: 0, failed: 0 };
  payments.forEach((p) => {
    const key = p.status.toLowerCase();
    stats[key] = (stats[key] || 0) + 1;
  });
  return stats;
}
