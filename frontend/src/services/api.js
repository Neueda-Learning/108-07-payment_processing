import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001',
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

function makeToken(username) {
  const payload = { sub: username, iat: Date.now(), exp: Date.now() + 86400000 };
  return btoa(JSON.stringify(payload));
}

function nowIso() {
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

const STATUS_FLOW = ['CREATED', 'VALIDATED', 'SENT', 'COMPLETED'];

// ── Auth ──
export const authApi = {
  login: async (username, password) => {
    const usersRes = await api.get('/users');
    const users = usersRes.data || [];
    const user = users.find(
      (u) => u.username?.toLowerCase() === username.toLowerCase() && u.password === password
    );

    if (!user) {
      const err = new Error('Invalid username or password.');
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }

    return { data: { token: makeToken(user.username) } };
  },

  register: async (username, password) => {
    const usersRes = await api.get('/users');
    const users = usersRes.data || [];

    const exists = users.some((u) => u.username?.toLowerCase() === username.toLowerCase());
    if (exists) {
      const err = new Error('Username already taken.');
      err.code = 'USERNAME_TAKEN';
      throw err;
    }

    const createRes = await api.post('/users', {
      username,
      password,
      createdAt: nowIso(),
    });

    return { data: { token: makeToken(createRes.data.username) } };
  },
};

// ── Payments ──
export const paymentsApi = {
  getAll: (status) => api.get('/payments', { params: status ? { status } : {} }),

  getById: async (id) => {
    const res = await api.get(`/payments/${id}`);
    if (!res.data) {
      const err = new Error('Payment not found');
      err.code = 'PAYMENT_NOT_FOUND';
      throw err;
    }
    return res;
  },

  create: async (payload) => {
    if (payload.idempotencyKey) {
      const idemRes = await api.get('/payments', {
        params: { idempotencyKey: payload.idempotencyKey },
      });
      if ((idemRes.data || []).length > 0) {
        return { data: idemRes.data[0] };
      }
    }

    const allRes = await api.get('/payments');
    const payments = allRes.data || [];
    const payment = {
      id: generatePaymentId(payments),
      sourceAccount: payload.sourceAccount,
      destinationAccount: payload.destinationAccount,
      amount: payload.amount,
      currency: payload.currency,
      reference: payload.reference || null,
      idempotencyKey: payload.idempotencyKey || null,
      status: 'CREATED',
      errorCode: null,
      errorMessage: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    const created = await api.post('/payments', payment);
    await api.post('/paymentHistory', {
      paymentId: payment.id,
      fromStatus: null,
      status: 'CREATED',
      timestamp: nowIso(),
      errorCode: null,
      note: 'Payment submitted',
    });
    return created;
  },

  getHistory: async (id) => {
    const res = await api.get('/paymentHistory', { params: { paymentId: id } });
    const sorted = (res.data || []).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    return { data: sorted };
  },

  advanceStatus: async (id) => {
    const paymentRes = await paymentsApi.getById(id);
    const payment = paymentRes.data;

    if (payment.status === 'FAILED') {
      const err = new Error('Cannot advance a FAILED payment');
      err.code = 'INVALID_STATUS_TRANSITION';
      throw err;
    }
    if (payment.status === 'COMPLETED') {
      const err = new Error('Payment is already COMPLETED');
      err.code = 'INVALID_STATUS_TRANSITION';
      throw err;
    }

    const currentIdx = STATUS_FLOW.indexOf(payment.status);
    const nextStatus = STATUS_FLOW[currentIdx + 1];
    const updated = {
      ...payment,
      status: nextStatus,
      updatedAt: nowIso(),
    };

    const updatedRes = await api.put(`/payments/${id}`, updated);
    await api.post('/paymentHistory', {
      paymentId: id,
      fromStatus: payment.status,
      status: nextStatus,
      timestamp: nowIso(),
      errorCode: null,
      note: `Advanced to ${nextStatus}`,
    });
    return updatedRes;
  },

  failPayment: async (id, errorCode) => {
    const paymentRes = await paymentsApi.getById(id);
    const payment = paymentRes.data;

    if (payment.status === 'COMPLETED' || payment.status === 'FAILED') {
      const err = new Error(`Cannot fail a ${payment.status} payment`);
      err.code = 'INVALID_STATUS_TRANSITION';
      throw err;
    }

    const failureCode = errorCode || 'PROCESSING_ERROR';
    const updated = {
      ...payment,
      status: 'FAILED',
      errorCode: failureCode,
      updatedAt: nowIso(),
    };

    const updatedRes = await api.put(`/payments/${id}`, updated);
    await api.post('/paymentHistory', {
      paymentId: id,
      fromStatus: payment.status,
      status: 'FAILED',
      timestamp: nowIso(),
      errorCode: failureCode,
      note: `Payment failed: ${failureCode}`,
    });
    return updatedRes;
  },

  getStats: async () => {
    const res = await api.get('/payments');
    const payments = res.data || [];
    const counts = payments.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {});
    return {
      data: {
        total: payments.length,
        created: counts.CREATED || 0,
        validated: counts.VALIDATED || 0,
        sent: counts.SENT || 0,
        completed: counts.COMPLETED || 0,
        failed: counts.FAILED || 0,
      },
    };
  },
};

export default api;
