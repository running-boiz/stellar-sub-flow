import React, { useState, useEffect } from 'react';
import { subscriptionAPI } from '../services/api';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { CreditCard, Check, Star, Loader } from 'lucide-react';
import PaymentForm from '../components/PaymentForm';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const Plans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await subscriptionAPI.getPlans();
      setPlans(response.data.plans);
    } catch (err) {
      setError('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setShowPaymentForm(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentForm(false);
    setSelectedPlan(null);
    window.location.href = '/dashboard';
  };

  const handlePaymentCancel = () => {
    setShowPaymentForm(false);
    setSelectedPlan(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (showPaymentForm && selectedPlan) {
    return (
      <Elements stripe={stripePromise}>
        <PaymentForm
          plan={selectedPlan}
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
        />
      </Elements>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground">Choose Your Plan</h1>
        <p className="text-muted-foreground mt-2">
          Select the perfect subscription plan for your needs
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan._id}
            className={`card relative ${
              plan.name.toLowerCase().includes('pro') 
                ? 'border-2 border-primary' 
                : 'border border-border'
            }`}
          >
            {plan.name.toLowerCase().includes('pro') && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full flex items-center space-x-1">
                  <Star className="h-3 w-3" />
                  <span>Most Popular</span>
                </span>
              </div>
            )}
            
            <div className="p-6">
              <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
              <p className="text-muted-foreground mt-2">{plan.description}</p>
              
              <div className="mt-4">
                <span className="text-4xl font-bold text-foreground">
                  ${plan.price}
                </span>
                <span className="text-muted-foreground">
                  /{plan.interval}
                </span>
              </div>

              {plan.trialPeriodDays > 0 && (
                <div className="mt-2 text-sm text-green-600">
                  {plan.trialPeriodDays} days free trial
                </div>
              )}

              <div className="mt-6 space-y-3">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleSelectPlan(plan)}
                className={`w-full mt-6 py-3 px-4 rounded-md font-medium transition-colors ${
                  plan.name.toLowerCase().includes('pro')
                    ? 'btn-primary'
                    : 'btn-outline'
                }`}
              >
                Get Started
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-6 bg-muted/50">
        <h3 className="text-lg font-semibold text-foreground mb-4">Frequently Asked Questions</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-foreground">Can I change plans anytime?</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-foreground">What payment methods do you accept?</h4>
            <p className="text-sm text-muted-foreground mt-1">
              We accept all major credit cards and debit cards through our secure payment processor.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-foreground">Can I cancel my subscription?</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your current billing period.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Plans;
