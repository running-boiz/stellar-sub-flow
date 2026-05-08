const request = require('supertest');
const crypto = require('crypto');
const app = require('../src/index');
const User = require('../src/models/User');
const Plan = require('../src/models/Plan');
const Subscription = require('../src/models/Subscription');
const { createTestUser, createTestPlan, createTestSubscription } = require('./helpers');

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: jest.fn()
    }
  }));
});

describe('Webhook Endpoints', () => {
  let testUser;
  let testPlan;
  let testSubscription;

  beforeEach(async () => {
    testUser = await createTestUser({
      email: 'webhooktest@example.com',
      password: 'password123',
      stripeCustomerId: 'cus_webhook123'
    });
    
    testPlan = await createTestPlan({
      stripePriceId: 'price_webhook123',
      stripeProductId: 'prod_webhook123'
    });
    
    testSubscription = await createTestSubscription(testUser._id, testPlan._id, {
      stripeSubscriptionId: 'sub_webhook123',
      stripeCustomerId: 'cus_webhook123',
      status: 'incomplete'
    });
  });

  describe('POST /api/webhooks/stripe', () => {
    describe('invoice.payment_succeeded Event', () => {
      it('should mark subscription as active when payment succeeds', async () => {
        const stripe = require('stripe');
        const invoiceData = {
          subscription: 'sub_webhook123',
          payment_intent: 'pi_test123'
        };

        const eventData = {
          id: 'evt_test123',
          type: 'invoice.payment_succeeded',
          data: {
            object: invoiceData
          }
        };

        stripe().webhooks.constructEvent.mockReturnValue(eventData);

        const payload = JSON.stringify(eventData);
        const signature = crypto.createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET)
          .update(payload)
          .digest('hex');

        const response = await request(app)
          .post('/api/webhooks/stripe')
          .set('stripe-signature', signature)
          .send(payload)
          .expect(200);

        expect(response.body).toHaveProperty('received', true);

        // Verify subscription was updated
        const updatedSubscription = await Subscription.findById(testSubscription._id);
        expect(updatedSubscription.status).toBe('active');
      });

      it('should handle invoice without subscription gracefully', async () => {
        const stripe = require('stripe');
        const invoiceData = {
          payment_intent: 'pi_test123'
          // No subscription field
        };

        const eventData = {
          id: 'evt_test123',
          type: 'invoice.payment_succeeded',
          data: {
            object: invoiceData
          }
        };

        stripe().webhooks.constructEvent.mockReturnValue(eventData);

        const payload = JSON.stringify(eventData);
        const signature = crypto.createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET)
          .update(payload)
          .digest('hex');

        const response = await request(app)
          .post('/api/webhooks/stripe')
          .set('stripe-signature', signature)
          .send(payload)
          .expect(200);

        expect(response.body).toHaveProperty('received', true);
      });

      it('should handle non-existent subscription gracefully', async () => {
        const stripe = require('stripe');
        const invoiceData = {
          subscription: 'sub_nonexistent',
          payment_intent: 'pi_test123'
        };

        const eventData = {
          id: 'evt_test123',
          type: 'invoice.payment_succeeded',
          data: {
            object: invoiceData
          }
        };

        stripe().webhooks.constructEvent.mockReturnValue(eventData);

        const payload = JSON.stringify(eventData);
        const signature = crypto.createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET)
          .update(payload)
          .digest('hex');

        const response = await request(app)
          .post('/api/webhooks/stripe')
          .set('stripe-signature', signature)
          .send(payload)
          .expect(200);

        expect(response.body).toHaveProperty('received', true);
      });
    });

    describe('customer.subscription.deleted Event', () => {
      it('should mark subscription as canceled when subscription is deleted', async () => {
        const stripe = require('stripe');
        const subscriptionData = {
          id: 'sub_webhook123',
          status: 'canceled',
          ended_at: Math.floor(Date.now() / 1000),
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000)
        };

        const eventData = {
          id: 'evt_test456',
          type: 'customer.subscription.deleted',
          data: {
            object: subscriptionData
          }
        };

        stripe().webhooks.constructEvent.mockReturnValue(eventData);

        const payload = JSON.stringify(eventData);
        const signature = crypto.createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET)
          .update(payload)
          .digest('hex');

        const response = await request(app)
          .post('/api/webhooks/stripe')
          .set('stripe-signature', signature)
          .send(payload)
          .expect(200);

        expect(response.body).toHaveProperty('received', true);

        // Verify subscription was updated
        const updatedSubscription = await Subscription.findById(testSubscription._id);
        expect(updatedSubscription.status).toBe('canceled');
        expect(updatedSubscription.endedAt).toBeTruthy();
      });

      it('should handle non-existent subscription gracefully', async () => {
        const stripe = require('stripe');
        const subscriptionData = {
          id: 'sub_nonexistent',
          status: 'canceled',
          ended_at: Math.floor(Date.now() / 1000)
        };

        const eventData = {
          id: 'evt_test456',
          type: 'customer.subscription.deleted',
          data: {
            object: subscriptionData
          }
        };

        stripe().webhooks.constructEvent.mockReturnValue(eventData);

        const payload = JSON.stringify(eventData);
        const signature = crypto.createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET)
          .update(payload)
          .digest('hex');

        const response = await request(app)
          .post('/api/webhooks/stripe')
          .set('stripe-signature', signature)
          .send(payload)
          .expect(200);

        expect(response.body).toHaveProperty('received', true);
      });
    });

    describe('Webhook Validation', () => {
      it('should return 400 for invalid signature', async () => {
        const stripe = require('stripe');
        stripe().webhooks.constructEvent.mockImplementation(() => {
          throw new Error('Invalid signature');
        });

        const eventData = {
          id: 'evt_test123',
          type: 'invoice.payment_succeeded',
          data: { object: {} }
        };

        const payload = JSON.stringify(eventData);
        const invalidSignature = 'invalid_signature';

        const response = await request(app)
          .post('/api/webhooks/stripe')
          .set('stripe-signature', invalidSignature)
          .send(payload)
          .expect(400);

        expect(response.text).toContain('Webhook Error: Invalid signature');
      });

      it('should return 400 for missing signature header', async () => {
        const eventData = {
          id: 'evt_test123',
          type: 'invoice.payment_succeeded',
          data: { object: {} }
        };

        const payload = JSON.stringify(eventData);

        const response = await request(app)
          .post('/api/webhooks/stripe')
          .send(payload)
          .expect(400);

        expect(response.text).toContain('Webhook Error: No stripe-signature header found');
      });
    });

    describe('Unhandled Events', () => {
      it('should handle unhandled event types gracefully', async () => {
        const stripe = require('stripe');
        const eventData = {
          id: 'evt_test789',
          type: 'account.updated',
          data: { object: {} }
        };

        stripe().webhooks.constructEvent.mockReturnValue(eventData);

        const payload = JSON.stringify(eventData);
        const signature = crypto.createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET)
          .update(payload)
          .digest('hex');

        const response = await request(app)
          .post('/api/webhooks/stripe')
          .set('stripe-signature', signature)
          .send(payload)
          .expect(200);

        expect(response.body).toHaveProperty('received', true);
      });
    });

    describe('Error Handling', () => {
      it('should handle webhook processing errors gracefully', async () => {
        const stripe = require('stripe');
        const invoiceData = {
          subscription: 'sub_webhook123'
        };

        const eventData = {
          id: 'evt_test123',
          type: 'invoice.payment_succeeded',
          data: {
            object: invoiceData
          }
        };

        stripe().webhooks.constructEvent.mockReturnValue(eventData);

        // Mock database error by breaking the Subscription model
        const originalSave = Subscription.prototype.save;
        Subscription.prototype.save = function() {
          throw new Error('Database connection failed');
        };

        const payload = JSON.stringify(eventData);
        const signature = crypto.createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET)
          .update(payload)
          .digest('hex');

        const response = await request(app)
          .post('/api/webhooks/stripe')
          .set('stripe-signature', signature)
          .send(payload)
          .expect(500);

        expect(response.body).toHaveProperty('error', 'Webhook processing failed');

        // Restore the original save method
        Subscription.prototype.save = originalSave;
      });
    });

    describe('Additional Events', () => {
      it('should handle invoice.payment_failed event', async () => {
        const stripe = require('stripe');
        const invoiceData = {
          subscription: 'sub_webhook123'
        };

        const eventData = {
          id: 'evt_test_failed',
          type: 'invoice.payment_failed',
          data: {
            object: invoiceData
          }
        };

        stripe().webhooks.constructEvent.mockReturnValue(eventData);

        const payload = JSON.stringify(eventData);
        const signature = crypto.createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET)
          .update(payload)
          .digest('hex');

        const response = await request(app)
          .post('/api/webhooks/stripe')
          .set('stripe-signature', signature)
          .send(payload)
          .expect(200);

        expect(response.body).toHaveProperty('received', true);

        // Verify subscription was marked as past_due
        const updatedSubscription = await Subscription.findById(testSubscription._id);
        expect(updatedSubscription.status).toBe('past_due');
      });

      it('should handle customer.subscription.updated event', async () => {
        const stripe = require('stripe');
        const subscriptionData = {
          id: 'sub_webhook123',
          status: 'active',
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
          cancel_at_period_end: true,
          canceled_at: Math.floor(Date.now() / 1000)
        };

        const eventData = {
          id: 'evt_test_updated',
          type: 'customer.subscription.updated',
          data: {
            object: subscriptionData
          }
        };

        stripe().webhooks.constructEvent.mockReturnValue(eventData);

        const payload = JSON.stringify(eventData);
        const signature = crypto.createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET)
          .update(payload)
          .digest('hex');

        const response = await request(app)
          .post('/api/webhooks/stripe')
          .set('stripe-signature', signature)
          .send(payload)
          .expect(200);

        expect(response.body).toHaveProperty('received', true);

        // Verify subscription was updated
        const updatedSubscription = await Subscription.findById(testSubscription._id);
        expect(updatedSubscription.status).toBe('active');
        expect(updatedSubscription.cancelAtPeriodEnd).toBe(true);
        expect(updatedSubscription.canceledAt).toBeTruthy();
      });

      it('should handle customer.subscription.created event', async () => {
        const stripe = require('stripe');
        const subscriptionData = {
          id: 'sub_webhook123',
          status: 'trialing',
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
          trial_start: Math.floor(Date.now() / 1000),
          trial_end: Math.floor((Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000)
        };

        const eventData = {
          id: 'evt_test_created',
          type: 'customer.subscription.created',
          data: {
            object: subscriptionData
          }
        };

        stripe().webhooks.constructEvent.mockReturnValue(eventData);

        const payload = JSON.stringify(eventData);
        const signature = crypto.createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET)
          .update(payload)
          .digest('hex');

        const response = await request(app)
          .post('/api/webhooks/stripe')
          .set('stripe-signature', signature)
          .send(payload)
          .expect(200);

        expect(response.body).toHaveProperty('received', true);

        // Verify subscription was updated
        const updatedSubscription = await Subscription.findById(testSubscription._id);
        expect(updatedSubscription.status).toBe('trialing');
        expect(updatedSubscription.trialStart).toBeTruthy();
        expect(updatedSubscription.trialEnd).toBeTruthy();
      });
    });
  });
});
