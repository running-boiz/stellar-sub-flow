# Stellar Subscription Service

A comprehensive subscription management system with recurring payment processing capabilities.

## Features

- **Subscription Plans Management**: Create and manage multiple subscription tiers
- **Recurring Payments**: Automated billing with Stripe integration
- **User Authentication**: Secure JWT-based authentication system
- **Payment Processing**: Secure payment handling with Stripe
- **Webhook Integration**: Real-time payment event processing
- **Dashboard**: User-friendly interface for managing subscriptions
- **Admin Panel**: Comprehensive admin dashboard for managing users and subscriptions

## Tech Stack

### Backend
- Node.js with Express.js
- MongoDB with Mongoose
- Stripe for payment processing
- JWT for authentication
- bcrypt for password hashing

### Frontend
- React.js with React Router
- Tailwind CSS for styling
- Stripe Elements for payment forms
- Axios for API communication

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB
- Stripe account and API keys

### Installation

1. Clone the repository
2. Install backend dependencies:
   ```bash
   cd backend && npm install
   ```
3. Install frontend dependencies:
   ```bash
   cd frontend && npm install
   ```

### Environment Setup

Create a `.env` file in the backend directory with the following variables:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/stellar-subscriptions
JWT_SECRET=your-jwt-secret-key
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
```

### Running the Application

1. Start the backend server:
   ```bash
   cd backend && npm run dev
   ```

2. Start the frontend application:
   ```bash
   cd frontend && npm start
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Subscriptions
- `GET /api/subscriptions/plans` - Get available subscription plans
- `POST /api/subscriptions/create` - Create new subscription
- `GET /api/subscriptions/user` - Get user's subscriptions
- `POST /api/subscriptions/cancel` - Cancel subscription
- `POST /api/subscriptions/update` - Update subscription

### Payments
- `POST /api/payments/create-intent` - Create payment intent
- `POST /api/payments/confirm` - Confirm payment
- `POST /api/webhooks/stripe` - Stripe webhook handler

## License

MIT License
