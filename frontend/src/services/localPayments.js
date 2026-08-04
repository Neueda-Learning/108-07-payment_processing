import { paymentsApi } from './api';

export async function localCreatePayment(payload) {
  const res = await paymentsApi.create(payload);
  return res.data;
}

export async function localGetAllPayments(status) {
  const res = await paymentsApi.getAll(status);
  return res.data || [];
}

export async function localGetPaymentById(id) {
  try {
    const res = await paymentsApi.getById(id);
    return res.data;
  } catch (error) {
    if (error?.response?.status === 404) {
      const err = new Error('Payment not found: ' + id);
      err.code = 'PAYMENT_NOT_FOUND';
      throw err;
    }
    throw error;
  }
}

export async function localGetPaymentHistory(id) {
  const res = await paymentsApi.getHistory(id);
  return res.data || [];
}

export async function localAdvanceStatus(id) {
  const res = await paymentsApi.advanceStatus(id);
  return res.data;
}

export async function localFailPayment(id, errorCode) {
  const res = await paymentsApi.failPayment(id, errorCode);
  return res.data;
}

export async function localGetStats() {
  const res = await paymentsApi.getStats();
  return res.data;
}
