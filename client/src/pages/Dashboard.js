import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState({
    totalFoods: 0,
    expiredFoods: 0,
    expiringSoon: 0,
    expiringThisWeek: 0,
    healthyFoods: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/api/foods/stats/dashboard');
        if (res.data?.success) {
          setStatsData(res.data.data || {});
        }
      } catch (e) {
        // silently fail; keep zeros
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const stats = [
    {
      name: 'Total Food Items',
      value: String(statsData.totalFoods || 0),
      icon: '🍎'
    },
    {
      name: 'Expired Items',
      value: String(statsData.expiredFoods || 0),
      icon: '🗓️'
    },
    {
      name: 'Expiring Soon (≤ 3 days)',
      value: String(statsData.expiringSoon || 0),
      icon: '⚠️'
    },
    {
      name: 'Expiring This Week',
      value: String(statsData.expiringThisWeek || 0),
      icon: '📅'
    }
  ];

  const quickActions = [
    {
      name: 'Add Food Item',
      description: 'Scan barcode, take photo, or manually add food',
      href: '/add-food',
      icon: '➕',
      color: 'bg-blue-500'
    },
    {
      name: 'View Inventory',
      description: 'See all your food items and their status',
      href: '/inventory',
      icon: '📦',
      color: 'bg-green-500'
    },
    {
      name: 'Update Profile',
      description: 'Manage your health profile and preferences',
      href: '/profile',
      icon: '👤',
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.name || 'User'}! 👋
        </h1>
        <p className="mt-2 text-gray-600">
          Let's manage your food inventory and stay healthy together.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">{stat.icon}</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading ? '—' : stat.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              to={action.href}
              className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg shadow hover:shadow-md transition-shadow duration-200"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 text-white text-2xl ring-4 ring-white">
                  {action.icon}
                </span>
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-medium">
                  <span className="absolute inset-0" aria-hidden="true" />
                  {action.name}
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  {action.description}
                </p>
              </div>
              <span
                className="pointer-events-none absolute top-6 right-6 text-gray-300 group-hover:text-gray-400"
                aria-hidden="true"
              >
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Recent Activity
          </h3>
          <div className="text-center py-8">
            <span className="text-4xl">📝</span>
            <p className="mt-2 text-sm text-gray-500">
              No recent activity. Start by adding your first food item!
            </p>
            <div className="mt-4">
              <Link
                to="/add-food"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Add Food Item
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Health Tips */}
      <div className="mt-8 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          💡 Health Tip of the Day
        </h3>
        <p className="text-gray-700">
          "Regularly checking food expiry dates and understanding nutrition labels 
          can help you make healthier choices and reduce food waste. Start by 
          adding your first food item to track its expiry and nutritional value!"
        </p>
      </div>
    </div>
  );
};

export default Dashboard; 