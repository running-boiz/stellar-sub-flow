const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/index');
const User = require('../src/models/User');
const Plan = require('../src/models/Plan');
const Subscription = require('../src/models/Subscription');
const { createTestUser, createTestPlan, createTestSubscription, loginTestUser } = require('./helpers');

// Mock Stripe using a self-contained factory with a stable shared instance
jest.mock('stripe', () => {
  const instance = {
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_test123' }),
      update: jest.fn().mockResolvedValue({}),
    },
    paymentMethods: {
      attach: jest.fn().mockResolvedValue({}),
    },
    subscriptions: {
      create: jest.fn().mockResolvedValue({
        id: 'sub_test123',
        status: 'incomplete',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
        latest_invoice: { payment_intent: { client_secret: 'pi_test123_secret' } }
      }),
      update: jest.fn().mockResolvedValue({ cancel_at_period_end: true }),
    }
  };
  const stripeMock = jest.fn().mockReturnValue(instance);
  stripeMock._instance = instance;
  return stripeMock;
});

describe('Subscription Endpoints', () => {
  let authToken;
  let testUser;
  let testPlan;

  beforeEach(async () => {
    testUser = await createTestUser({
      email: 'subscriptiontest@example.com',
      password: 'password123'
    });
    
    testPlan = await createTestPlan({
      stripePriceId: 'price_test123',
      stripeProductId: 'prod_test123'
    });
    
    authToken = await loginTestUser('subscriptiontest@example.com', 'password123');
  });

  describe('POST /api/subscriptions/create', () => {
    describe('Happy Path', () => {
      it('should create a new subscription successfully', async () => {
        const subscriptionData = {
          planId: testPlan._id.toString(),
          paymentMethodId: 'pm_test123'
        };

        const response = await request(app)
          .post('/api/subscriptions/create')
          .set('Authorization', `Bearer ${authToken}`)
          .send(subscriptionData)
          .expect(201);

        expect(response.body).toHaveProperty('subscription');
        expect(response.body).toHaveProperty('clientSecret');
        expect(response.body.subscription.user.toString()).toBe(testUser._id.toString());
        expect(response.body.subscription.plan.toString()).toBe(testPlan._id.toString());
        expect(response.body.subscription.status).toBe('incomplete');
        expect(response.body.clientSecret).toBe('pi_test123_secret');

        // Verify subscription was saved to database
        const subscription = await Subscription.findOne({ stripeSubscriptionId: 'sub_test123' });
        expect(subscription).toBeTruthy();
        expect(subscription.user.toString()).toBe(testUser._id.toString());
      });

      it('should create a Stripe customer if user does not have one', async () => {
        const subscriptionData = {
          planId: testPlan._id.toString(),
          paymentMethodId: 'pm_test123'
        };

        await request(app)
          .post('/api/subscriptions/create')
          .set('Authorization', `Bearer ${authToken}`)
          .send(subscriptionData)
          .expect(201);

        // Verify user was updated with Stripe customer ID
        const updatedUser = await User.findById(testUser._id);
        expect(updatedUser.stripeCustomerId).toBe('cus_test123');
      });

      it('should use existing Stripe customer if user already has one', async () => {
        // Update user with existing Stripe customer ID
        await User.findByIdAndUpdate(testUser._id, { stripeCustomerId: 'cus_existing123' });

        const subscriptionData = {
          planId: testPlan._id.toString(),
          paymentMethodId: 'pm_test123'
        };

        await request(app)
          .post('/api/subscriptions/create')
          .set('Authorization', `Bearer ${authToken}`)
          .send(subscriptionData)
          .expect(201);

        // User should still have the same customer ID
        const updatedUser = await User.findById(testUser._id);
        expect(updatedUser.stripeCustomerId).toBe('cus_existing123');
      });
    });

    describe('Validation Errors', () => {
      it('should return 401 for unauthenticated request', async () => {
        const subscriptionData = {
          planId: testPlan._id.toString(),
          paymentMethodId: 'pm_test123'
        };

        const response = await request(app)
          .post('/api/subscriptions/create')
          .send(subscriptionData)
          .expect(401);

        expect(response.body).toHaveProperty('message');
      });

      it('should return 400 for invalid planId format', async () => {
        const subscriptionData = {
          planId: 'invalid-plan-id',
          paymentMethodId: 'pm_test123'
        };

        const response = await request(app)
          .post('/api/subscriptions/create')
          .set('Authorization', `Bearer ${authToken}`)
          .send(subscriptionData)
          .expect(400);

        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.some(error => error.path === 'planId')).toBe(true);
      });

      it('should return 400 for empty paymentMethodId', async () => {
        const subscriptionData = {
          planId: testPlan._id.toString(),
          paymentMethodId: ''
        };

        const response = await request(app)
          .post('/api/subscriptions/create')
          .set('Authorization', `Bearer ${authToken}`)
          .send(subscriptionData)
          .expect(400);

        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.some(error => error.path === 'paymentMethodId')).toBe(true);
      });

      it('should return 404 for non-existent plan', async () => {
        const subscriptionData = {
          planId: new mongoose.Types.ObjectId().toString(),
          paymentMethodId: 'pm_test123'
        };

        const response = await request(app)
          .post('/api/subscriptions/create')
          .set('Authorization', `Bearer ${authToken}`)
          .send(subscriptionData)
          .expect(404);

        expect(response.body).toHaveProperty('message', 'Plan not found');
      });

      it('should return 400 for inactive plan', async () => {
        await Plan.findByIdAndUpdate(testPlan._id, { isActive: false });

        const subscriptionData = {
          planId: testPlan._id.toString(),
          paymentMethodId: 'pm_test123'
        };

        const response = await request(app)
          .post('/api/subscriptions/create')
          .set('Authorization', `Bearer ${authToken}`)
          .send(subscriptionData)
          .expect(404);

        expect(response.body).toHaveProperty('message', 'Plan not found');
      });

      it('should return 400 if user already has active subscription', async () => {
        // Create an existing active subscription
        await createTestSubscription(testUser._id, testPlan._id, {
          status: 'active',
          stripeSubscriptionId: 'sub_existing123'
        });

        const subscriptionData = {
          planId: testPlan._id.toString(),
          paymentMethodId: 'pm_test123'
        };

        const response = await request(app)
          .post('/api/subscriptions/create')
          .set('Authorization', `Bearer ${authToken}`)
          .send(subscriptionData)
          .expect(400);

        expect(response.body).toHaveProperty('message', 'User already has an active subscription');
      });
    });

    describe('Edge Cases', () => {
      it('should handle Stripe API errors gracefully', async () => {
        require('stripe')._instance.subscriptions.create.mockRejectedValueOnce(new Error('Stripe API Error'));

        const subscriptionData = {
          planId: testPlan._id.toString(),
          paymentMethodId: 'pm_test123'
        };

        const response = await request(app)
          .post('/api/subscriptions/create')
          .set('Authorization', `Bearer ${authToken}`)
          .send(subscriptionData)
          .expect(500);

        expect(response.body).toHaveProperty('message', 'Server error');
      });
    });
  });

  describe('POST /api/subscriptions/cancel', () => {
    let activeSubscription;

    beforeEach(async () => {
      activeSubscription = await createTestSubscription(testUser._id, testPlan._id, {
        status: 'active',
        stripeSubscriptionId: 'sub_cancel_test123'
      });
    });

    describe('Happy Path', () => {
      it('should cancel subscription successfully', async () => {
        const cancelData = {
          subscriptionId: activeSubscription._id.toString()
        };

        const response = await request(app)
          .post('/api/subscriptions/cancel')
          .set('Authorization', `Bearer ${authToken}`)
          .send(cancelData)
          .expect(200);

        expect(response.body).toHaveProperty('message', 'Subscription will be canceled at the end of the billing period');
        expect(response.body).toHaveProperty('subscription');
        expect(response.body.subscription.cancelAtPeriodEnd).toBe(true);

        // Verify subscription was updated in database
        const subscription = await Subscription.findById(activeSubscription._id);
        expect(subscription.cancelAtPeriodEnd).toBe(true);
      });
    });

    describe('Validation Errors', () => {
      it('should return 401 for unauthenticated request', async () => {
        const cancelData = {
          subscriptionId: activeSubscription._id.toString()
        };

        const response = await request(app)
          .post('/api/subscriptions/cancel')
          .send(cancelData)
          .expect(401);

        expect(response.body).toHaveProperty('message');
      });

      it('should return 400 for invalid subscriptionId format', async () => {
        const cancelData = {
          subscriptionId: 'invalid-subscription-id'
        };

        const response = await request(app)
          .post('/api/subscriptions/cancel')
          .set('Authorization', `Bearer ${authToken}`)
          .send(cancelData)
          .expect(400);

        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.some(error => error.path === 'subscriptionId')).toBe(true);
      });

      it('should return 404 for non-existent subscription', async () => {
        const cancelData = {
          subscriptionId: new mongoose.Types.ObjectId().toString()
        };

        const response = await request(app)
          .post('/api/subscriptions/cancel')
          .set('Authorization', `Bearer ${authToken}`)
          .send(cancelData)
          .expect(404);

        expect(response.body).toHaveProperty('message', 'Subscription not found');
      });

      it('should return 404 for subscription belonging to another user', async () => {
        const otherUser = await createTestUser({ email: 'other@example.com' });
        const otherSubscription = await createTestSubscription(otherUser._id, testPlan._id);

        const cancelData = {
          subscriptionId: otherSubscription._id.toString()
        };

        const response = await request(app)
          .post('/api/subscriptions/cancel')
          .set('Authorization', `Bearer ${authToken}`)
          .send(cancelData)
          .expect(404);

        expect(response.body).toHaveProperty('message', 'Subscription not found');
      });

      it('should return 400 for inactive subscription', async () => {
        await Subscription.findByIdAndUpdate(activeSubscription._id, { status: 'canceled' });

        const cancelData = {
          subscriptionId: activeSubscription._id.toString()
        };

        const response = await request(app)
          .post('/api/subscriptions/cancel')
          .set('Authorization', `Bearer ${authToken}`)
          .send(cancelData)
          .expect(400);

        expect(response.body).toHaveProperty('message', 'Subscription is not active');
      });
    });

    describe('Edge Cases', () => {
      it('should handle Stripe API errors gracefully', async () => {
        require('stripe')._instance.subscriptions.update.mockRejectedValueOnce(new Error('Stripe API Error'));

        const cancelData = {
          subscriptionId: activeSubscription._id.toString()
        };

        const response = await request(app)
          .post('/api/subscriptions/cancel')
          .set('Authorization', `Bearer ${authToken}`)
          .send(cancelData)
          .expect(500);

        expect(response.body).toHaveProperty('message', 'Server error');
      });
    });
  });
});
