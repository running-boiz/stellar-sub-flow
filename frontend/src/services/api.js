import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
};

export const subscriptionAPI = {
  getPlans: () => api.get('/subscriptions/plans'),
  createSubscription: (data) => api.post('/subscriptions/create', data),
  getUserSubscriptions: () => api.get('/subscriptions/user'),
  getSubscription: (id) => api.get(`/subscriptions/${id}`),
  cancelSubscription: (subscriptionId) => api.post('/subscriptions/cancel', { subscriptionId }),
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
