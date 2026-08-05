import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalize the backend's ErrorResponse { errorCode, message, timestamp } onto the
// error object as `code`/`message` so callers can branch without reaching into
// error.response.data, and drop an expired/invalid session back to the login page.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthEndpoint = error.config?.url?.includes('/auth/');
    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('jwt_token');
      window.location.href = '/login';
    }

    const data = error.response?.data;
    if (data?.errorCode) {
      error.code = data.errorCode;
    }
    if (data?.message) {
      error.message = data.message;
    }
    return Promise.reject(error);
  }
);

// ── Auth ──
export const authApi = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  register: (username, password) => api.post('/auth/register', { username, password }),
};

// ── Payments ──
export const paymentsApi = {
  getAll: (status) => api.get('/payments', { params: status ? { status } : {} }),

  getById: (id) => api.get(`/payments/${id}`),

  create: (payload) =>
    api.post('/payments', {
      amount: payload.amount,
      currency: payload.currency,
      sourceAccount: payload.sourceAccount,
      destinationAccount: payload.destinationAccount,
      description: payload.description,
      idempotencyKey: payload.idempotencyKey,
    }),

  getHistory: (id) => api.get(`/payments/${id}/history`),

  advanceStatus: (id) => api.post(`/payments/${id}/process`),

  failPayment: (id, errorCode) =>
    api.post(`/payments/${id}/fail`, errorCode ? { errorCode } : {}),

  getStats: () => api.get('/payments/stats'),
};

// ── Accounts ──
export const accountsApi = {
  getAll: () => api.get('/accounts'),

  create: (payload) =>
    api.post('/accounts', {
      accountNumber: payload.accountNumber,
      currency: payload.currency,
      accountHolderName: payload.accountHolderName,
      bankName: payload.bankName,
      accountType: payload.accountType,
    }),
};

export default api;
