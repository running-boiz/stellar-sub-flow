const request = require('supertest');
const app = require('../src/index');
const User = require('../src/models/User');
const Plan = require('../src/models/Plan');
const Subscription = require('../src/models/Subscription');

const getAuthHeaders = (token) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
});

const createTestUser = async (userData = {}) => {
  const defaultUserData = {
    email: 'test@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User'
  };
  
  const user = new User({ ...defaultUserData, ...userData });
  return await user.save();
};

const createTestPlan = async (planData = {}) => {
  const defaultPlanData = {
    name: 'Test Plan',
    description: 'A test subscription plan',
    price: 9.99,
    currency: 'usd',
    interval: 'month',
    intervalCount: 1,
    stripePriceId: 'price_test123',
    stripeProductId: 'prod_test123',
    features: ['Feature 1', 'Feature 2'],
    trialPeriodDays: 0
  };
  
  const plan = new Plan({ ...defaultPlanData, ...planData });
  return await plan.save();
};

const createTestSubscription = async (userId, planId, subscriptionData = {}) => {
  const defaultSubscriptionData = {
    user: userId,
    plan: planId,
    stripeSubscriptionId: 'sub_test123',
    stripeCustomerId: 'cus_test123',
    status: 'active',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  };
  
  const subscription = new Subscription({ ...defaultSubscriptionData, ...subscriptionData });
  return await subscription.save();
};

const loginTestUser = async (email = 'test@example.com', password = 'password123') => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  
  return response.body.token;
};

const registerTestUser = async (userData = {}) => {
  const defaultUserData = {
    email: 'newuser@example.com',
    password: 'password123',
    firstName: 'New',
    lastName: 'User'
  };
  
  const response = await request(app)
    .post('/api/auth/register')
    .send({ ...defaultUserData, ...userData });
  
  return response.body;
};

const createStripeWebhookEvent = (eventType, eventData = {}) => {
  const defaultEventData = {
    id: 'evt_test123',
    object: 'event',
    type: eventType,
    data: {
      object: eventData
    }
  };
  
  return defaultEventData;
};

module.exports = {
  getAuthHeaders,
  createTestUser,
  createTestPlan,
  createTestSubscription,
  loginTestUser,
  registerTestUser,
  createStripeWebhookEvent
};
