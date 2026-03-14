require('dotenv').config();
const mongoose = require('mongoose');
const Plan = require('../src/models/Plan');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const seedPlans = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const plansData = [
      {
        name: 'Basic',
        description: 'Perfect for individuals getting started',
        price: 9.99,
        currency: 'usd',
        interval: 'month',
        intervalCount: 1,
        features: [
          'Access to basic features',
          '5GB storage',
          'Email support',
          'Basic analytics'
        ],
        trialPeriodDays: 14,
      },
      {
        name: 'Pro',
        description: 'Ideal for professionals and small teams',
        price: 29.99,
        currency: 'usd',
        interval: 'month',
        intervalCount: 1,
        features: [
          'All Basic features',
          '100GB storage',
          'Priority email support',
          'Advanced analytics',
          'Team collaboration tools',
          'API access'
        ],
        trialPeriodDays: 14,
      },
      {
        name: 'Enterprise',
        description: 'Complete solution for large organizations',
        price: 99.99,
        currency: 'usd',
        interval: 'month',
        intervalCount: 1,
        features: [
          'All Pro features',
          'Unlimited storage',
          '24/7 phone support',
          'Custom analytics',
          'Advanced team features',
          'Priority API access',
          'Custom integrations',
          'Dedicated account manager'
        ],
        trialPeriodDays: 30,
      }
    ];

    console.log('Creating Stripe products and prices...');
    
    for (const planData of plansData) {
      const product = await stripe.products.create({
        name: planData.name,
        description: planData.description,
        metadata: {
          type: 'subscription_plan'
        }
      });

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(planData.price * 100),
        currency: planData.currency,
        recurring: {
          interval: planData.interval,
          interval_count: planData.intervalCount,
        },
        metadata: {
          plan_name: planData.name
        }
      });

      const plan = new Plan({
        ...planData,
        stripeProductId: product.id,
        stripePriceId: price.id,
      });

      await plan.save();
      console.log(`Created plan: ${planData.name}`);
    }

    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedPlans();
