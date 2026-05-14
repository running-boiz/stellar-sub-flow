import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // send httpOnly refresh token cookie
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => (error ? prom.reject(error) : prom.resolve(token)));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        localStorage.setItem('token', data.token);
        processQueue(null, data.token);
        originalRequest.headers.Authorization = `Bearer ${data.token}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
};

export const subscriptionAPI = {
  getPlans: () => api.get('/subscriptions/plans'),
  createSubscription: (data) => api.post('/subscriptions/create', data),
  getUserSubscriptions: () => api.get('/subscriptions/user'),
  getSubscription: (id) => api.get(`/subscriptions/${id}`),
  cancelSubscription: (subscriptionId) => api.post('/subscriptions/cancel', { subscriptionId }),
  updateSubscription: (subscriptionId, newPlanId) =>
    api.post('/subscriptions/update', { subscriptionId, newPlanId }),
};

export const paymentAPI = {
  createPaymentIntent: (amount, currency = 'usd') =>
    api.post('/payments/create-intent', { amount, currency }),
  createSetupIntent: () => api.post('/payments/create-setup-intent'),
  getPaymentMethods: () => api.get('/payments/payment-methods'),
  attachPaymentMethod: (paymentMethodId) =>
    api.post('/payments/attach-payment-method', { paymentMethodId }),
};

export default api;
