'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function UploadCallPage() {
  const { user } = useAuth();
  const [call, setCall] = useState({
    title: '',
    description: '',
    eligibility: '',
    fundingAmount: '',
    deadline: '',
    applicationDeadline: '',
    categories: [] as string[],
    requirements: '',
    contactInfo: '',
    website: '',
    sdgFocus: [] as string[],
    applicationProcess: '',
    evaluationCriteria: ''
  });

  const categoryOptions = [
    'Basic Research', 'Applied Research', 'Technology Development', 'Innovation Projects',
    'Social Impact', 'Environmental Research', 'Health & Medical', 'Engineering & Technology',
    'Computer Science & IT', 'Mathematics & Statistics', 'Physics & Astronomy',
    'Biology & Life Sciences', 'Chemistry & Materials', 'Earth & Environmental Sciences',
    'Social Sciences & Humanities', 'Education & Training', 'Art & Culture'
  ];

  const sdgOptions = [
    'No Poverty', 'Zero Hunger', 'Good Health and Well-being', 'Quality Education',
    'Gender Equality', 'Clean Water and Sanitation', 'Affordable and Clean Energy',
    'Decent Work and Economic Growth', 'Industry Innovation and Infrastructure',
    'Reduced Inequalities', 'Sustainable Cities and Communities',
    'Responsible Consumption and Production', 'Climate Action', 'Life Below Water',
    'Life on Land', 'Peace Justice and Strong Institutions', 'Partnerships for the Goals'
  ];

  const handleCategoryChange = (category: string) => {
    setCall(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(cat => cat !== category)
        : [...prev.categories, category]
    }));
  };

  const handleSDGChange = (sdg: string) => {
    setCall(prev => ({
      ...prev,
      sdgFocus: prev.sdgFocus.includes(sdg)
        ? prev.sdgFocus.filter(goal => goal !== sdg)
        : [...prev.sdgFocus, sdg]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/funding-calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...call,
          institutionId: user?.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Funding call upload failed');
      }

      const newCall = await response.json();
      console.log('Funding call created:', newCall);
      alert('Funding call published successfully!');
      
      // Reset form
      setCall({
        title: '',
        description: '',
        eligibility: '',
        fundingAmount: '',
        deadline: '',
        applicationDeadline: '',
        categories: [],
        requirements: '',
        contactInfo: '',
        website: '',
        sdgFocus: [],
        applicationProcess: '',
        evaluationCriteria: ''
      });
      
    } catch (error) {
      console.error('Funding call upload error:', error);
      alert(`Funding call upload failed: ${error}`);
    }
  };

  if (!user || user.role !== 'institution') {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900">
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
                  type="text"
                  value={call.fundingAmount}
                  onChange={(e) => setCall(prev => ({ ...prev, fundingAmount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="e.g., 50,000 - 500,000 TL per project"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Application Deadline *
                </label>
                <input
                  type="date"
                  value={call.applicationDeadline}
                  onChange={(e) => setCall(prev => ({ ...prev, applicationDeadline: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Eligibility Criteria *
              </label>
              <textarea
                value={call.eligibility}
                onChange={(e) => setCall(prev => ({ ...prev, eligibility: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Who can apply? Academic requirements, institutional requirements, etc..."
                required
              />
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

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Application Requirements
              </label>
              <textarea
                value={call.requirements}
                onChange={(e) => setCall(prev => ({ ...prev, requirements: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Required documents, forms, project proposal format, etc..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Application Process
              </label>
              <textarea
                value={call.applicationProcess}
                onChange={(e) => setCall(prev => ({ ...prev, applicationProcess: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Step-by-step application process, where to submit, how to submit..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Evaluation Criteria
              </label>
              <textarea
                value={call.evaluationCriteria}
                onChange={(e) => setCall(prev => ({ ...prev, evaluationCriteria: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="How will projects be evaluated? Scoring criteria, review process..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                SDG Focus Areas
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3 dark:border-gray-600">
                {sdgOptions.map((sdg) => (
                  <label key={sdg} className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={call.sdgFocus.includes(sdg)}
                      onChange={() => handleSDGChange(sdg)}
                      className="mr-2"
                    />
                    <span className="text-gray-700 dark:text-gray-300">{sdg}</span>
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