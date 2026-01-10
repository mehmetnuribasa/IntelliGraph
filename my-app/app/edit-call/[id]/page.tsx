'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import api from '@/lib/api';

export default function EditCallPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [call, setCall] = useState({
    title: '',
    description: '',
    keywords: '',
    budget: '',
    deadline: '',
    categories: [] as string[],
    contactInfo: '',
    website: '',
    status: 'Open'
  });

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const categoryOptions = [
    'Basic Research', 'Applied Research', 'Technology Development', 'Innovation Projects',
    'Social Impact', 'Environmental Research', 'Health & Medical', 'Engineering & Technology',
    'Computer Science & IT', 'Mathematics & Statistics', 'Physics & Astronomy',
    'Biology & Life Sciences', 'Chemistry & Materials', 'Earth & Environmental Sciences',
    'Social Sciences & Humanities', 'Education & Training', 'Art & Culture'
  ];

  useEffect(() => {
    const fetchCall = async () => {
      try {
        const response = await api.get(`/calls/${id}`);
        const data = response.data;
        
        setCall({
          title: data.title || '',
          description: data.description || '',
          keywords: Array.isArray(data.keywords) ? data.keywords.join(', ') : (data.keywords || ''),
          budget: data.budget?.toString() || '',
          deadline: data.deadline ? data.deadline.split('T')[0] : '',
          categories: data.categories || [],
          contactInfo: data.contactInfo || '',
          website: data.website || '',
          status: data.status || 'Open'
        });
      } catch (error: any) {
        console.error('Error fetching call:', error);
        setErrorMessage('Failed to load funding call data.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCall();
    }
  }, [id]);

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
    setSuccessMessage(null);
    setErrorMessage(null);

    // Validate funding amount
    if (!call.budget || isNaN(Number(call.budget)) || Number(call.budget) < 0) {
      setErrorMessage('Please enter a valid positive number for the funding amount.');
      return;
    }

    // Validate website URL if provided
    if (call.website && call.website.trim() !== '') {
      try {
        new URL(call.website);
      } catch (_) {
        setErrorMessage('Please enter a valid URL for the website (including http:// or https://).');
        return;
      }
    }

    // Validate keywords
    if (!call.keywords || call.keywords.trim().length === 0) {
      setErrorMessage('Please enter at least one keyword.');
      return;
    }
    
    try {
      const callData = {
        title: call.title,
        description: call.description,
        deadline: call.deadline,
        status: call.status,
        budget: Number(call.budget),
        website: call.website || null,
        keywords: call.keywords ? call.keywords.split(',').map(k => k.trim()).filter(k => k.length > 0) : []
      };

      await api.put(`/calls/${id}`, callData);
      
      setSuccessMessage('Funding call updated successfully!');
      setTimeout(() => {
        router.push(`/profile/${user?.userId}`);
      }, 1500);
      
    } catch (error: any) {
      console.error('Funding call update error:', error);
      
      if (error.response?.data?.errors) {
        const errorMessages = Object.entries(error.response.data.errors)
          .map(([field, messages]: [string, any]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('\n');
        setErrorMessage(`Validation errors:\n${errorMessages}`);
      } else {
        setErrorMessage(`Funding call update failed: ${error.response?.data?.message || error.message || 'Unknown error'}`);
      }
    }
  };

  if (!user || user.role !== 'FUNDING_MANAGER') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-300">Only funding managers can edit funding calls.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900 dark:bg-gradient-to-br">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Edit Funding Call</h1>
          
          {successMessage && (
            <div className="mb-6 p-4 bg-green-100 border border-green-200 text-green-700 rounded-lg flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 p-4 bg-red-100 border border-red-200 text-red-700 rounded-lg flex items-center whitespace-pre-line">
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {errorMessage}
            </div>
          )}

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

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Keywords *
              </label>
              <input
                type="text"
                value={call.keywords}
                onChange={(e) => setCall(prev => ({ ...prev, keywords: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="e.g., AI, Machine Learning, Healthcare (comma separated)"
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
                  value={call.budget}
                  onChange={(e) => setCall(prev => ({ ...prev, budget: e.target.value }))}
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
                  onChange={(e) => setCall(prev => ({ ...prev, deadline: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status *
              </label>
              <select
                value={call.status}
                onChange={(e) => setCall(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              >
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
                <option value="Paused">Paused</option>
              </select>
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
                  Website
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
                Save Changes
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
