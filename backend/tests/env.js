// Set environment variables before any modules are loaded
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.STRIPE_SECRET_KEY = 'sk_test_stripe_secret_key';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_webhook_secret';
process.env.FRONTEND_URL = 'http://localhost:3000';
