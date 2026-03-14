import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { subscriptionAPI } from '../services/api';
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  CreditCard, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

const SubscriptionDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, [id]);

  const fetchSubscription = async () => {
    try {
      const response = await subscriptionAPI.getSubscription(id);
      setSubscription(response.data.subscription);
    } catch (err) {
      setError('Failed to load subscription details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel this subscription? You will continue to have access until the end of your current billing period.')) {
      return;
    }

    setCancelling(true);
    try {
      await subscriptionAPI.cancelSubscription(id);
      await fetchSubscription();
    } catch (err) {
      setError('Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-50';
      case 'trialing':
        return 'text-blue-600 bg-blue-50';
      case 'past_due':
        return 'text-yellow-600 bg-yellow-50';
      case 'canceled':
        return 'text-red-600 bg-red-50';
      case 'unpaid':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4" />;
      case 'trialing':
        return <Clock className="h-4 w-4" />;
      case 'past_due':
        return <AlertTriangle className="h-4 w-4" />;
      case 'canceled':
      case 'unpaid':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </button>
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-md">
          {error || 'Subscription not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="p-6 border-b border-border">
              <h2 className="text-2xl font-bold text-foreground">Subscription Details</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-2">Plan Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Plan Name</p>
                      <p className="font-medium text-foreground">{subscription.plan?.name || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="text-foreground">{subscription.plan?.description || 'No description'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Price</p>
                      <p className="font-medium text-foreground">
                        ${subscription.plan?.price || 0}/{subscription.plan?.interval || 'month'}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-foreground mb-2">Billing Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium w-fit ${getStatusColor(subscription.status)}`}>
                        {getStatusIcon(subscription.status)}
                        <span className="capitalize">{subscription.status}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Current Period</p>
                      <p className="text-sm text-foreground">
                        {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
                      </p>
                    </div>
                    {subscription.trialEnd && (
                      <div>
                        <p className="text-sm text-muted-foreground">Trial Ends</p>
                        <p className="text-sm text-foreground">{formatDate(subscription.trialEnd)}</p>
                      </div>
                    )}
                    {subscription.cancelAtPeriodEnd && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm text-yellow-800">
                          This subscription will be canceled at the end of the current billing period.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {subscription.plan?.features && subscription.plan.features.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-3">Plan Features</h3>
                  <ul className="space-y-2">
                    {subscription.plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="p-6">
              <h3 className="text-lg font-medium text-foreground mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {(subscription.status === 'active' || subscription.status === 'trialing') && !subscription.cancelAtPeriodEnd && (
                  <button
                    onClick={handleCancelSubscription}
                    disabled={cancelling}
                    className="btn-destructive w-full py-2"
                  >
                    {cancelling ? 'Canceling...' : 'Cancel Subscription'}
                  </button>
                )}
                
                <button
                  onClick={() => window.location.href = '/plans'}
                  className="btn-outline w-full py-2"
                >
                  Change Plan
                </button>
                
                <button
                  onClick={() => window.location.href = 'mailto:support@stellar.com'}
                  className="btn-outline w-full py-2"
                >
                  Contact Support
                </button>
              </div>
            </div>
          </div>

          <div className="card bg-muted/50">
            <div className="p-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-foreground">Need Help?</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    If you have any questions about your subscription, billing, or need to make changes, our support team is here to help.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionDetails;
