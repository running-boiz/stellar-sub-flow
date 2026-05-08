const request = require('supertest');
const app = require('../src/index');
const User = require('../src/models/User');
const { createTestUser } = require('./helpers');

describe('Auth Endpoints', () => {
  describe('POST /api/auth/register', () => {
    describe('Happy Path', () => {
      it('should register a new user successfully', async () => {
        const userData = {
          email: 'newuser@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(201);

        expect(response.body).toHaveProperty('message', 'User created successfully');
        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('user');
        expect(response.body.user.email).toBe(userData.email);
        expect(response.body.user.firstName).toBe(userData.firstName);
        expect(response.body.user.lastName).toBe(userData.lastName);
        expect(response.body.user).not.toHaveProperty('password');

        // Verify user was saved to database
        const user = await User.findOne({ email: userData.email });
        expect(user).toBeTruthy();
        expect(user.email).toBe(userData.email);
      });

      it('should normalize email to lowercase', async () => {
        const userData = {
          email: 'Test@EXAMPLE.COM',
          password: 'password123',
          firstName: 'Jane',
          lastName: 'Smith'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(201);

        expect(response.body.user.email).toBe('test@example.com');
      });
    });

    describe('Validation Errors', () => {
      it('should return 400 for invalid email format', async () => {
        const userData = {
          email: 'invalid-email',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(400);

        expect(response.body).toHaveProperty('errors');
        expect(Array.isArray(response.body.errors)).toBe(true);
        expect(response.body.errors.some(error => error.path === 'email')).toBe(true);
      });

      it('should return 400 for password shorter than 6 characters', async () => {
        const userData = {
          email: 'test@example.com',
          password: '123',
          firstName: 'John',
          lastName: 'Doe'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(400);

        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.some(error => error.path === 'password')).toBe(true);
      });

      it('should return 400 for empty firstName', async () => {
        const userData = {
          email: 'test@example.com',
          password: 'password123',
          firstName: '',
          lastName: 'Doe'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(400);

        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.some(error => error.path === 'firstName')).toBe(true);
      });

      it('should return 400 for empty lastName', async () => {
        const userData = {
          email: 'test@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: ''
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(400);

        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.some(error => error.path === 'lastName')).toBe(true);
      });

      it('should return 400 for missing required fields', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBeGreaterThan(0);
      });

      it('should return 400 when user already exists', async () => {
        // Create a user first
        await createTestUser({ email: 'existing@example.com' });

        const userData = {
          email: 'existing@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(400);

        expect(response.body).toHaveProperty('message', 'User already exists');
      });
    });

    describe('Edge Cases', () => {
      it('should trim whitespace from firstName and lastName', async () => {
        const userData = {
          email: 'test@example.com',
          password: 'password123',
          firstName: '  John  ',
          lastName: '  Doe  '
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(201);

        expect(response.body.user.firstName).toBe('John');
        expect(response.body.user.lastName).toBe('Doe');
      });

      it('should handle database errors gracefully', async () => {
        // Mock a database error by trying to save with invalid data
        const userData = {
          email: 'test@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe'
        };

        // Temporarily break the User model to simulate a database error
        const originalSave = User.prototype.save;
        User.prototype.save = function() {
          throw new Error('Database connection failed');
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(500);

        expect(response.body).toHaveProperty('message', 'Server error');

        // Restore the original save method
        User.prototype.save = originalSave;
      });
    });
  });

  describe('POST /api/auth/login', () => {
    describe('Happy Path', () => {
      it('should login with valid credentials', async () => {
        // Create a test user first
        const testUser = await createTestUser({
          email: 'logintest@example.com',
          password: 'password123'
        });

        const loginData = {
          email: 'logintest@example.com',
          password: 'password123'
        };

        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(200);

        expect(response.body).toHaveProperty('message', 'Login successful');
        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('user');
        expect(response.body.user.email).toBe(loginData.email);
        expect(response.body.user.firstName).toBe(testUser.firstName);
        expect(response.body.user.lastName).toBe(testUser.lastName);
        expect(response.body.user).not.toHaveProperty('password');
      });

      it('should normalize email to lowercase during login', async () => {
        await createTestUser({
          email: 'logintest@example.com',
          password: 'password123'
        });

        const loginData = {
          email: 'LOGINTEST@EXAMPLE.COM',
          password: 'password123'
        };

        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(200);

        expect(response.body.user.email).toBe('logintest@example.com');
      });
    });

    describe('Validation Errors', () => {
      it('should return 400 for invalid email format', async () => {
        const loginData = {
          email: 'invalid-email',
          password: 'password123'
        };

        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(400);

        expect(response.body).toHaveProperty('errors');
        expect(Array.isArray(response.body.errors)).toBe(true);
        expect(response.body.errors.some(error => error.path === 'email')).toBe(true);
      });

      it('should return 400 for missing password', async () => {
        const loginData = {
          email: 'test@example.com'
        };

        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(400);

        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.some(error => error.path === 'password')).toBe(true);
      });

      it('should return 400 for missing email', async () => {
        const loginData = {
          password: 'password123'
        };

        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(400);

        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.some(error => error.path === 'email')).toBe(true);
      });
    });

    describe('Authentication Errors', () => {
      it('should return 400 for non-existent user', async () => {
        const loginData = {
          email: 'nonexistent@example.com',
          password: 'password123'
        };

        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(400);

        expect(response.body).toHaveProperty('message', 'Invalid credentials');
      });

      it('should return 400 for incorrect password', async () => {
        await createTestUser({
          email: 'test@example.com',
          password: 'password123'
        });

        const loginData = {
          email: 'test@example.com',
          password: 'wrongpassword'
        };

        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(400);

        expect(response.body).toHaveProperty('message', 'Invalid credentials');
      });

      it('should return 400 for deactivated user', async () => {
        await createTestUser({
          email: 'inactive@example.com',
          password: 'password123',
          isActive: false
        });

        const loginData = {
          email: 'inactive@example.com',
          password: 'password123'
        };

        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(400);

        expect(response.body).toHaveProperty('message', 'Account is deactivated');
      });
    });

    describe('Edge Cases', () => {
      it('should handle database errors gracefully', async () => {
        const loginData = {
          email: 'test@example.com',
          password: 'password123'
        };

        // Mock findOne to throw an error
        const originalFindOne = User.findOne;
        User.findOne = function() {
          throw new Error('Database connection failed');
        };

        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(500);

        expect(response.body).toHaveProperty('message', 'Server error');

        // Restore the original method
        User.findOne = originalFindOne;
      });
    });
  });
});
