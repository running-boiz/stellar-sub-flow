# Backend Testing Guide

This document explains the testing setup and how to run tests for the backend application.

## Test Setup

### Dependencies
The following testing dependencies are included in `package.json`:
- `jest` - Test runner
- `supertest` - HTTP assertions for API testing
- `mongodb-memory-server` - In-memory MongoDB for testing

### Configuration
- `jest.config.js` - Jest configuration with test environment setup
- `tests/setup.js` - Global test setup and teardown
- `tests/helpers.js` - Common test utilities and helper functions

## Test Coverage

### Authentication Tests (`tests/auth.test.js`)
- **POST /api/auth/register**
  - Happy path: Successful user registration
  - Validation: Invalid email, short password, empty names, missing fields
  - Edge cases: Email normalization, duplicate users, database errors
- **POST /api/auth/login**
  - Happy path: Successful login with valid credentials
  - Validation: Invalid email format, missing fields
  - Authentication: Non-existent users, wrong passwords, deactivated accounts
  - Edge cases: Email normalization, database errors

### Subscription Tests (`tests/subscriptions.test.js`)
- **POST /api/subscriptions/create**
  - Happy path: Successful subscription creation
  - Stripe integration: Customer creation, existing customers
  - Validation: Invalid IDs, missing fields, inactive plans
  - Business logic: Active subscription checks
  - Error handling: Stripe API errors
- **POST /api/subscriptions/cancel**
  - Happy path: Successful subscription cancellation
  - Validation: Invalid IDs, unauthorized access
  - Business logic: Inactive subscription checks
  - Error handling: Stripe API errors

### Webhook Tests (`tests/webhooks.test.js`)
- **invoice.payment_succeeded** event
  - Marks subscription as active
  - Handles missing subscriptions gracefully
- **customer.subscription.deleted** event
  - Marks subscription as canceled with end date
  - Handles missing subscriptions gracefully
- **Webhook validation**
  - Invalid signature handling
  - Missing signature headers
- **Additional events**
  - invoice.payment_failed
  - customer.subscription.updated
  - customer.subscription.created
- **Error handling**
  - Database errors, unhandled events

## Running Tests

### Prerequisites
Ensure you have Node.js and npm installed:
```bash
node --version
npm --version
```

### Install Dependencies
```bash
cd backend
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

### Run Specific Test File
```bash
npm test auth.test.js
npm test subscriptions.test.js
npm test webhooks.test.js
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

## Test Environment

### Database
Tests use an in-memory MongoDB instance that:
- Starts before all tests
- Cleans data between each test
- Stops after all tests complete

### Environment Variables
Test environment uses mock values:
- `NODE_ENV=test`
- `JWT_SECRET=test-jwt-secret-key-for-testing`
- `STRIPE_SECRET_KEY=sk_test_stripe_secret_key`
- `STRIPE_WEBHOOK_SECRET=whsec_test_webhook_secret`

### Mocking
- Stripe API calls are mocked using Jest mocks
- Database errors can be simulated for error handling tests

## CI/CD Integration

### GitHub Actions
The `.github/workflows/test.yml` file configures CI to:
- Run tests on Node.js 18.x and 20.x
- Test on push to main/develop branches
- Test on pull requests
- Upload coverage reports to Codecov
- Run linting if available

### Test Results
- Tests must pass for PRs to be mergeable
- Coverage reports are generated and uploaded
- Failed tests will block CI/CD pipeline

## Best Practices

### Test Structure
- Use `describe` blocks for logical grouping
- Use `it` blocks for individual test cases
- Group tests by: Happy Path, Validation Errors, Edge Cases

### Test Data
- Use helper functions for creating test data
- Clean up data between tests automatically
- Use realistic but isolated test data

### Assertions
- Test both success and failure cases
- Verify database state changes
- Check response status codes and bodies
- Test error handling and edge cases

### Mocking
- Mock external dependencies (Stripe API)
- Restore original methods after mocking
- Test both mocked and real scenarios where appropriate

## Adding New Tests

1. Create test file in `tests/` directory with `.test.js` suffix
2. Import required modules and helpers
3. Use existing patterns for structure and naming
4. Add test cases for happy path, validation, and edge cases
5. Update this documentation if adding new endpoint coverage

## Troubleshooting

### Common Issues
1. **Port conflicts**: Tests use in-memory database, no port conflicts
2. **Timeout**: Increase timeout in jest.config.js if needed
3. **Memory issues**: Ensure proper cleanup in afterEach hooks
4. **Mock failures**: Verify mock setup and restoration

### Debugging
- Use `console.log` for debugging test failures
- Run specific test files to isolate issues
- Check test output for detailed error messages
- Verify mock configurations match real API responses
