'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '@/lib/api';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AccountSettingsModal({ isOpen, onClose }: AccountSettingsModalProps) {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'danger'>('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  // Update form when user changes
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
      });
    }
  }, [user]);

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  if (!isOpen || !user) return null;

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await api.put('/academics/profile', {
        name: profileForm.name,
        email: profileForm.email,
      });

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      
      // Note: User will need to refresh/login again to see updated info in token
      
    } catch (error: any) {
      console.error('Profile update error:', error);
      
      if (error.response?.data?.errors) {
        const errorMessages = Object.entries(error.response.data.errors)
          .map(([field, messages]: [string, any]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('\n');
        setMessage({ type: 'error', text: `Validation errors:\n${errorMessages}` });
      } else {
        setMessage({ 
          type: 'error', 
          text: error.response?.data?.message || 'Failed to update profile. Please try again.' 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      setLoading(false);
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long.' });
      setLoading(false);
      return;
    }

    // Password complexity check
    const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).+$/;
    if (!complexityRegex.test(passwordForm.newPassword)) {
      setMessage({ 
        type: 'error', 
        text: 'Password must contain at least one uppercase letter, one lowercase letter, and one special character.' 
      });
      setLoading(false);
      return;
    }

    try {
      await api.put('/academics/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('Password change error:', error);
      
      if (error.response?.data?.errors) {
        const errorMessages = Object.entries(error.response.data.errors)
          .map(([field, messages]: [string, any]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('\n');
        setMessage({ type: 'error', text: `Validation errors:\n${errorMessages}` });
      } else {
        setMessage({ 
          type: 'error', 
          text: error.response?.data?.message || 'Failed to change password. Please check your current password.' 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmMessage = 'Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently deleted.';
    
    if (window.confirm(confirmMessage)) {
      // Double confirmation
      if (!window.confirm('This is your last chance. Are you absolutely sure?')) {
        return;
      }

      setLoading(true);
      setMessage({ type: '', text: '' });
      
      try {
        await api.delete('/academics/account');
        setMessage({ type: 'success', text: 'Account deleted successfully.' });
        
        // Logout and close modal after a short delay
        setTimeout(() => {
          logout();
          onClose();
        }, 1000);
      } catch (error: any) {
        console.error('Account deletion error:', error);
        setMessage({ 
          type: 'error', 
          text: error.response?.data?.message || 'Failed to delete account. Please try again.' 
        });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Account Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`mx-6 mt-4 p-3 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-4 font-medium transition-colors ${
              activeTab === 'profile'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 dark:text-gray-300 hover:text-blue-600'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`py-3 px-4 font-medium transition-colors ${
              activeTab === 'password'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 dark:text-gray-300 hover:text-blue-600'
            }`}
          >
            Password & Security
          </button>
          <button
            onClick={() => setActiveTab('danger')}
            className={`py-3 px-4 font-medium transition-colors ${
              activeTab === 'danger'
                ? 'text-red-600 border-b-2 border-red-600'
                : 'text-gray-600 dark:text-gray-300 hover:text-red-600'
            }`}
          >
            Danger Zone
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                  placeholder="e.g., Dr. John Smith"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                  minLength={2}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Account Type
                </label>
                <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <span className="text-gray-600 dark:text-gray-300">{user.role}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Note: After updating your profile, you may need to log out and log back in to see changes reflected.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Profile'}
              </button>
            </form>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <div className="space-y-6">
              {/* Change Password Form */}
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Change Password</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                    minLength={8}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                    minLength={8}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Changing...' : 'Change Password'}
                </button>
              </form>
            </div>
          )}

          {/* Danger Zone Tab */}
          {activeTab === 'danger' && (
            <div className="space-y-6">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Delete Account</h3>
                <p className="text-red-700 dark:text-red-300 mb-4">
                  Once you delete your account, there is no going back. This will permanently delete:
                </p>
                <ul className="list-disc list-inside text-red-700 dark:text-red-300 mb-4 space-y-1">
                  <li>Your profile and account information</li>
                  <li>All your {user.role === 'ACADEMIC' ? 'research projects' : 'funding calls'}</li>
                  <li>Your sessions and authentication tokens</li>
                  <li>Any connections and relationships</li>
                </ul>
                <button
                  onClick={handleDeleteAccount}
                  disabled={loading}
                  className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Deleting...' : 'Delete Account Permanently'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}