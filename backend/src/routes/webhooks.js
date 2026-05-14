const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Subscription = require('../models/Subscription');
const router = express.Router();

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  if (!sig) {
    return res.status(400).send('Webhook Error: No stripe-signature header found');
  }

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

async function handleInvoicePaymentSucceeded(invoice) {
  try {
    if (invoice.subscription) {
      const subscription = await Subscription.findOne({
        stripeSubscriptionId: invoice.subscription,
      });

      if (subscription) {
        subscription.status = 'active';
        await subscription.save();
        console.log(`Subscription ${subscription._id} marked as active after successful payment`);
      }
    }
  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error);
    throw error;
  }
}

async function handleInvoicePaymentFailed(invoice) {
  try {
    if (invoice.subscription) {
      const subscription = await Subscription.findOne({
        stripeSubscriptionId: invoice.subscription,
      });

      if (subscription) {
        subscription.status = 'past_due';
        await subscription.save();
        console.log(`Subscription ${subscription._id} marked as past_due after failed payment`);
      }
    }
  } catch (error) {
    console.error('Error handling invoice payment failed:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(stripeSubscription) {
  try {
    const subscription = await Subscription.findOne({
      stripeSubscriptionId: stripeSubscription.id,
    });

    if (subscription) {
      subscription.status = stripeSubscription.status;
      subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
      subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
      subscription.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;
      subscription.canceledAt = stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null;
      subscription.endedAt = stripeSubscription.ended_at ? new Date(stripeSubscription.ended_at * 1000) : null;
      subscription.trialStart = stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : null;
      subscription.trialEnd = stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null;
      
      await subscription.save();
      console.log(`Subscription ${subscription._id} updated with status ${subscription.status}`);
    }
  } catch (error) {
    console.error('Error handling subscription updated:', error);
    throw error;
  }
}

async function handleSubscriptionDeleted(stripeSubscription) {
  try {
    const subscription = await Subscription.findOne({
      stripeSubscriptionId: stripeSubscription.id,
    });

    if (subscription) {
      subscription.status = 'canceled';
      subscription.endedAt = new Date(stripeSubscription.ended_at * 1000);
      await subscription.save();
      console.log(`Subscription ${subscription._id} marked as canceled`);
    }
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
    throw error;
  }
}

async function handleSubscriptionCreated(stripeSubscription) {
  try {
    const subscription = await Subscription.findOne({
      stripeSubscriptionId: stripeSubscription.id,
    });

    if (subscription) {
      subscription.status = stripeSubscription.status;
      subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
      subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
      subscription.trialStart = stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : null;
      subscription.trialEnd = stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null;
      
      await subscription.save();
      console.log(`Subscription ${subscription._id} created with status ${subscription.status}`);
    }
  } catch (error) {
    console.error('Error handling subscription created:', error);
    throw error;
  }
}

module.exports = router;
