# Quick Start Guide

## 🚀 Get Running in 5 Minutes

### 1. Install Dependencies
```bash
# Backend
cd backend
npm install

# Frontend  
cd ../frontend
npm install
```

### 2. Set Environment Variables

**Backend (.env):**
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/stellar-subscriptions
JWT_SECRET=your-secret-key-here
STRIPE_SECRET_KEY=sk_test_your_stripe_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key_here
```

**Frontend (.env):**
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key_here
```

### 3. Start Services
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend  
npm start
```

### 4. Seed Database
```bash
cd backend
node scripts/seed-plans.js
```

### 5. Access the App
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 📋 What You Get

- ✅ User registration & login
- ✅ 3 subscription tiers (Basic, Pro, Enterprise)
- ✅ Stripe payment integration
- ✅ Subscription management dashboard
- ✅ Real-time webhook updates
- ✅ Responsive React UI

## 🔑 Required Accounts

1. **MongoDB** (local install or Atlas)
2. **Stripe** (for payments)

## 🆘 Need Help?

See [SETUP.md](./SETUP.md) for detailed instructions.
