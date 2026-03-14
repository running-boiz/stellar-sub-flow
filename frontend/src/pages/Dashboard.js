import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { subscriptionAPI } from '../services/api';
import { CreditCard, Calendar, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';

const Dashboard = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const response = await subscriptionAPI.getUserSubscriptions();
      setSubscriptions(response.data.subscriptions);
    } catch (err) {
      setError('Failed to load subscriptions');
    } finally {
      setLoading(false);
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
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4" />;
      case 'trialing':
        return <Calendar className="h-4 w-4" />;
      case 'past_due':
      case 'canceled':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your subscriptions and billing information
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-muted-foreground">Active Subscriptions</p>
              <p className="text-2xl font-bold text-foreground">
                {subscriptions.filter(s => s.status === 'active' || s.status === 'trialing').length}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-50 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-muted-foreground">Monthly Spending</p>
              <p className="text-2xl font-bold text-foreground">
                ${subscriptions
                  .filter(s => s.status === 'active' || s.status === 'trialing')
                  .reduce((total, s) => total + (s.plan?.price || 0), 0)
                  .toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-muted-foreground">Next Billing</p>
              <p className="text-lg font-bold text-foreground">
                {subscriptions.length > 0 
                  ? formatDate(subscriptions[0].currentPeriodEnd)
                  : 'No active subscriptions'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="p-6 border-b border-border">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-foreground">Your Subscriptions</h2>
            <Link
              to="/plans"
              className="btn-primary"
            >
              Browse Plans
            </Link>
          </div>
        </div>
        
        <div className="p-6">
          {subscriptions.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No subscriptions yet</h3>
              <p className="text-muted-foreground mb-4">
                Get started by choosing a subscription plan that fits your needs.
              </p>
              <Link
                to="/plans"
                className="btn-primary"
              >
                View Plans
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {subscriptions.map((subscription) => (
                <div key={subscription._id} className="border border-border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-foreground">
                        {subscription.plan?.name || 'Unknown Plan'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {subscription.plan?.description || 'No description available'}
                      </p>
                      <div className="mt-2 flex items-center space-x-4">
                        <span className="text-sm text-muted-foreground">
                          ${subscription.plan?.price || 0}/{subscription.plan?.interval || 'month'}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Next billing: {formatDate(subscription.currentPeriodEnd)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2">
                      <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(subscription.status)}`}>
                        {getStatusIcon(subscription.status)}
                        <span className="capitalize">{subscription.status}</span>
                      </div>
                      
                      <Link
                        to={`/subscription/${subscription._id}`}
                        className="btn-outline text-sm"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
