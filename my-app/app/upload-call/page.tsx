'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '@/lib/api';

export default function UploadCallPage() {
  const { user } = useAuth();
  const [call, setCall] = useState({
    title: '',
    description: '',
    fundingAmount: '',
    deadline: '',
    categories: [] as string[],
    contactInfo: '',
    website: ''
  });

  const categoryOptions = [
    'Basic Research', 'Applied Research', 'Technology Development', 'Innovation Projects',
    'Social Impact', 'Environmental Research', 'Health & Medical', 'Engineering & Technology',
    'Computer Science & IT', 'Mathematics & Statistics', 'Physics & Astronomy',
    'Biology & Life Sciences', 'Chemistry & Materials', 'Earth & Environmental Sciences',
    'Social Sciences & Humanities', 'Education & Training', 'Art & Culture'
  ];

  const handleCategoryChange = (category: string) => {
    setCall(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(cat => cat !== category)
        : [...prev.categories, category]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate funding amount
    if (isNaN(Number(call.fundingAmount)) || Number(call.fundingAmount) < 0) {
      alert('Please enter a valid positive number for the funding amount.');
      return;
    }

    // Validate website URL if provided
    if (call.website && call.website.trim() !== '') {
      try {
        new URL(call.website);
      } catch (_) {
        alert('Please enter a valid URL for the website (including http:// or https://).');
        return;
      }
    }

    // Validate deadline
    const selectedDate = new Date(call.deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time part for accurate date comparison

    if (selectedDate < today) {
      alert('Deadline cannot be in the past. Please select a valid date.');
      return;
    }
    
    try {
      // Prepare data according to API expectations
      // API expects: title, description, deadline, status
      const callData = {
        title: call.title,
        description: call.description,
        deadline: call.deadline,
        status: 'Open' // Default status, API accepts: 'Open', 'Closed', 'Paused'
      };

      const response = await api.post('/calls', callData);

      console.log('Funding call created:', response.data);
      alert('Funding call published successfully!');
      
      // Reset form
      setCall({
        title: '',
        description: '',
        fundingAmount: '',
        deadline: '',
        categories: [],
        contactInfo: '',
        website: ''
      });
      
    } catch (error: any) {
      console.error('Funding call upload error:', error);
      
      // Handle validation errors
      if (error.response?.data?.errors) {
        const errorMessages = Object.entries(error.response.data.errors)
          .map(([field, messages]: [string, any]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('\n');
        alert(`Validation errors:\n${errorMessages}`);
      } else {
        alert(`Funding call upload failed: ${error.response?.data?.message || error.message || 'Unknown error'}`);
      }
    }
  };

  if (!user || user.role !== 'FUNDING_MANAGER') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-300">Only institutions can upload funding calls.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900 dark:bg-gradient-to-br">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Post Funding Call</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Call Title *
              </label>
              <input
                type="text"
                value={call.title}
                onChange={(e) => setCall(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="e.g., TÜBİTAK 1001 - Scientific and Technological Research Projects Funding Program"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Call Description *
              </label>
              <textarea
                value={call.description}
                onChange={(e) => setCall(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Describe the funding opportunity, objectives, scope, and what types of projects will be supported..."
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Total Funding Amount (TL) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={call.fundingAmount}
                  onChange={(e) => setCall(prev => ({ ...prev, fundingAmount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="e.g., 50000"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Deadline *
                </label>
                <input
                  type="date"
                  value={call.deadline}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setCall(prev => ({ ...prev, deadline: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Research Categories
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3 dark:border-gray-600">
                {categoryOptions.map((category) => (
                  <label key={category} className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={call.categories.includes(category)}
                      onChange={() => handleCategoryChange(category)}
                      className="mr-2"
                    />
                    <span className="text-gray-700 dark:text-gray-300">{category}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Website/More Information
                </label>
                <input
                  type="url"
                  value={call.website}
                  onChange={(e) => setCall(prev => ({ ...prev, website: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="https://www.tubitak.gov.tr/..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contact Information
                </label>
                <input
                  type="text"
                  value={call.contactInfo}
                  onChange={(e) => setCall(prev => ({ ...prev, contactInfo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Email, phone, or contact person"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Publish Funding Call
              </button>
              <button
                type="button"
                onClick={() => window.history.back()}
                className="flex-1 bg-gray-300 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-400 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}