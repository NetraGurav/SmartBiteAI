import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import NotificationBell from './NotificationBell';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Food Inventory', href: '/inventory', icon: '🥫' },
    { name: 'Add Food', href: '/add-food', icon: '➕' },
    { name: 'Notifications', href: '/notifications', icon: '🔔' },
    { name: 'Reports', href: '/reports', icon: '📈' },
  ];

  return (
    <nav className="bg-white shadow-md border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3">
            <Link to="/dashboard" className="flex items-center space-x-2 group">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-green-500 rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <span className="text-white font-extrabold text-2xl tracking-tight">S</span>
              </div>
              <span className="ml-1 text-2xl font-bold text-gray-900 tracking-tight group-hover:text-blue-600 transition-colors">SmartBite <span className="text-green-500">AI</span></span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`text-base font-medium px-3 py-2 rounded-lg transition-colors duration-150 flex items-center space-x-2 ${location.pathname === item.href ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'}`}
              >
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-2">
            {/* Notification Bell */}
            <NotificationBell />
            
            <div className="relative">
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-shadow shadow-sm hover:shadow-md"
              >
                <div className="h-9 w-9 rounded-full bg-gradient-to-r from-blue-500 to-green-500 flex items-center justify-center">
                  <span className="text-white font-semibold text-lg">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <span className="ml-2 text-gray-800 font-medium hidden sm:block">{user?.name}</span>
                <svg
                  className="ml-2 h-4 w-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {/* Profile Dropdown */}
              {isProfileMenuOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-52 rounded-xl shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                  <div className="py-2">
                    <Link
                      to="/profile"
                      className="block px-5 py-2 text-base text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      Profile Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-5 py-2 text-base text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
            {/* Mobile menu button */}
            <div className="md:hidden ml-2">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              >
                <span className="sr-only">Open main menu</span>
                {isMenuOpen ? (
                  <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
          <div className="pt-2 pb-3 px-2 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`block px-4 py-2 rounded-lg text-base font-medium transition-colors duration-150 ${location.pathname === item.href ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'}`}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <Link
              to="/profile"
              className="block px-4 py-2 rounded-lg text-base font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700"
              onClick={() => setIsMenuOpen(false)}
            >
              Profile Settings
            </Link>
            <button
              onClick={() => { setIsMenuOpen(false); handleLogout(); }}
              className="block w-full text-left px-4 py-2 rounded-lg text-base font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar; 