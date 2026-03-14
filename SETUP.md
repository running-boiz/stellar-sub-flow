# Setup Instructions

## Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js** (v16 or higher) - [Download Node.js](https://nodejs.org/)
2. **MongoDB** - [Download MongoDB](https://www.mongodb.com/try/download/community)
3. **Git** - [Download Git](https://git-scm.com/downloads)
4. **Stripe Account** - [Create Stripe Account](https://dashboard.stripe.com/register)

## Installation Steps

### 1. Clone or Extract the Project

If you have this project as a zip file, extract it to your desired location.

### 2. Install Node.js Dependencies

#### Backend Dependencies:
```bash
cd backend
npm install
```

#### Frontend Dependencies:
```bash
cd frontend
npm install
```

### 3. Set Up Environment Variables

#### Backend Environment:
1. Copy the example file:
   ```bash
   cd backend
   copy .env.example .env
   ```

2. Edit the `.env` file and add your credentials:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/stellar-subscriptions
   JWT_SECRET=your-super-secret-jwt-key-here
   STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
   FRONTEND_URL=http://localhost:3000
   NODE_ENV=development
   ```

#### Frontend Environment:
1. Copy the example file:
   ```bash
   cd frontend
   copy .env.example .env
   ```

2. Edit the `.env` file:
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
   ```

### 4. Get Stripe API Keys

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com/)
2. Go to Developers → API keys
3. Copy the **Publishable key** (starts with `pk_`)
4. Copy the **Secret key** (starts with `sk_`)
5. For webhooks, you'll need to set up a webhook endpoint later

### 5. Start MongoDB

Make sure MongoDB is running on your system:
- **Windows**: Start MongoDB service from Services
- **Mac**: `brew services start mongodb/brew/mongodb-community`
- **Linux**: `sudo systemctl start mongod`

### 6. Seed the Database with Plans

Run the seed script to create subscription plans:
```bash
cd backend
node scripts/seed-plans.js
```

### 7. Start the Applications

#### Start Backend Server:
```bash
cd backend
npm run dev
```
The backend will run on `http://localhost:5000`

#### Start Frontend Application:
```bash
cd frontend
npm start
```
The frontend will run on `http://localhost:3000`

### 8. Set Up Stripe Webhooks (Optional but Recommended)

1. Install the Stripe CLI: [Stripe CLI Installation](https://stripe.com/docs/stripe-cli)
2. Login to Stripe:
   ```bash
   stripe login
   ```
3. Forward webhook events to your local backend:
   ```bash
   stripe listen --forward-to localhost:5000/api/webhooks/stripe
   ```
4. Copy the webhook signing key and add it to your backend `.env` file as `STRIPE_WEBHOOK_SECRET`

## Verify Installation

1. Open your browser and go to `http://localhost:3000`
2. You should see the Stellar Subscription Service login page
3. Create a new account and test the subscription flow

## Troubleshooting

### Common Issues:

1. **"npm is not recognized"**: Node.js is not installed or not in your PATH
2. **"MongoDB connection failed"**: Make sure MongoDB is running
3. **"Stripe API errors"**: Verify your API keys are correct
4. **"Port already in use"**: Change the PORT in your .env file

### Getting Help:

- Check the console logs for detailed error messages
- Ensure all environment variables are set correctly
- Verify MongoDB is accessible and running
- Confirm Stripe API keys are valid and match the correct environment (test vs live)

## Development Commands

### Backend:
```bash
npm run dev      # Start development server
npm start        # Start production server
npm test         # Run tests
```

### Frontend:
```bash
npm start        # Start development server
npm run build    # Build for production
npm test         # Run tests
```

## Production Deployment

For production deployment, you'll need to:

1. Use production Stripe keys (not test keys)
2. Set up a proper MongoDB database (MongoDB Atlas recommended)
3. Configure environment variables for production
4. Set up proper HTTPS and domain configuration
5. Configure webhook endpoints for your production domain
