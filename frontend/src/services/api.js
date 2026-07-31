import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
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

// Handle 401 globally – redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('jwt_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth ──
export const authApi = {
  login: (username, password) =>
    api.post('/auth/login', { username, password }),

  register: (username, password) =>
    api.post('/auth/register', { username, password }),
};

// ── Payments ──
export const paymentsApi = {
  getAll: (status) =>
    api.get('/payments', { params: status ? { status } : {} }),

  getById: (id) =>
    api.get(`/payments/${id}`),

  create: (payload) =>
    api.post('/payments', payload),

  getHistory: (id) =>
    api.get(`/payments/${id}/history`),

  advanceStatus: (id) =>
    api.post(`/payments/${id}/process`),

  failPayment: (id, errorCode) =>
    api.post(`/payments/${id}/fail`, { errorCode }),

  getStats: () =>
    api.get('/payments/stats'),
};

export default api;
