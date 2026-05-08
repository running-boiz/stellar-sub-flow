// Simple validation test to ensure our test setup works
describe('Test Configuration Validation', () => {
  it('should have test environment variables set', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.JWT_SECRET).toBe('test-jwt-secret-key-for-testing');
    expect(process.env.STRIPE_SECRET_KEY).toBe('sk_test_stripe_secret_key');
    expect(process.env.STRIPE_WEBHOOK_SECRET).toBe('whsec_test_webhook_secret');
  });

  it('should have required modules available', () => {
    expect(require('mongoose')).toBeTruthy();
    expect(require('supertest')).toBeTruthy();
    expect(require('stripe')).toBeTruthy();
  });

  it('should have model files available', () => {
    expect(require('../src/models/User')).toBeTruthy();
    expect(require('../src/models/Plan')).toBeTruthy();
    expect(require('../src/models/Subscription')).toBeTruthy();
  });

  it('should have helper functions available', () => {
    const helpers = require('./helpers');
    expect(helpers.createTestUser).toBeTruthy();
    expect(helpers.createTestPlan).toBeTruthy();
    expect(helpers.createTestSubscription).toBeTruthy();
    expect(helpers.loginTestUser).toBeTruthy();
    expect(helpers.createStripeWebhookEvent).toBeTruthy();
  });
});
