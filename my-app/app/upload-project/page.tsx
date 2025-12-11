'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function UploadProjectPage() {
  const { user } = useAuth();
  const [project, setProject] = useState({
    title: '',
    description: '',
    keywords: '',
    fieldOfStudy: '',
    startDate: '',
    endDate: '',
    budget: '',
    collaborators: '',
    publications: '',
    sdgGoals: [] as string[],
    status: 'ongoing'
  });

  const sdgOptions = [
    'No Poverty', 'Zero Hunger', 'Good Health and Well-being', 'Quality Education',
    'Gender Equality', 'Clean Water and Sanitation', 'Affordable and Clean Energy',
    'Decent Work and Economic Growth', 'Industry Innovation and Infrastructure',
    'Reduced Inequalities', 'Sustainable Cities and Communities',
    'Responsible Consumption and Production', 'Climate Action', 'Life Below Water',
    'Life on Land', 'Peace Justice and Strong Institutions', 'Partnerships for the Goals'
  ];

  const handleSDGChange = (sdg: string) => {
    setProject(prev => ({
      ...prev,
      sdgGoals: prev.sdgGoals.includes(sdg)
        ? prev.sdgGoals.filter(goal => goal !== sdg)
        : [...prev.sdgGoals, sdg]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Debug: Log user data
      console.log('Current user:', user);
      console.log('Academic ID being sent:', user?.id);
      
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...project,
          academicId: user?.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        
        // Show detailed error if available
        if (errorData.errors) {
          const errorMessages = Object.entries(errorData.errors)
            .map(([field, messages]: [string, any]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('\n');
          throw new Error(`Validation errors:\n${errorMessages}`);
        }
        
        throw new Error(errorData.message || 'Project upload failed');
      }

      const newProject = await response.json();
      console.log('Project created:', newProject);
      alert('Project uploaded successfully!');
      
      // Reset form
      setProject({
        title: '',
        description: '',
        keywords: '',
        fieldOfStudy: '',
        startDate: '',
        endDate: '',
        budget: '',
        collaborators: '',
        publications: '',
        sdgGoals: [],
        status: 'ongoing'
      });
      
    } catch (error) {
      console.error('Project upload error:', error);
      alert(`Project upload failed: ${error}`);
    }
  };

  if (!user || user.role !== 'academic') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-300">Only academics can upload projects.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Upload Research Project</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project Title *
                </label>
                <input
                  type="text"
                  value={project.title}
                  onChange={(e) => setProject(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Field of Study *
                </label>
                <select
                  value={project.fieldOfStudy}
                  onChange={(e) => setProject(prev => ({ ...prev, fieldOfStudy: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                >
                  <option value="">Select Field</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Artificial Intelligence">Artificial Intelligence</option>
                  <option value="Data Science">Data Science</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Biology">Biology</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Environmental Science">Environmental Science</option>
                  <option value="Social Sciences">Social Sciences</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Project Description *
              </label>
              <textarea
                value={project.description}
                onChange={(e) => setProject(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Describe your research project, objectives, methodology, and expected outcomes..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Keywords (comma-separated)
              </label>
              <input
                type="text"
                value={project.keywords}
                onChange={(e) => setProject(prev => ({ ...prev, keywords: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="e.g., machine learning, natural language processing, graph mining"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={project.startDate}
                  onChange={(e) => setProject(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={project.endDate}
                  onChange={(e) => setProject(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Budget (TL)
                </label>
                <input
                  type="number"
                  value={project.budget}
                  onChange={(e) => setProject(prev => ({ ...prev, budget: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Collaborators/Team Members
              </label>
              <textarea
                value={project.collaborators}
                onChange={(e) => setProject(prev => ({ ...prev, collaborators: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="List team members and their roles..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Related Publications (if any)
              </label>
              <textarea
                value={project.publications}
                onChange={(e) => setProject(prev => ({ ...prev, publications: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="List related publications, DOIs, or conference papers..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sustainable Development Goals (SDGs)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3 dark:border-gray-600">
                {sdgOptions.map((sdg) => (
                  <label key={sdg} className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={project.sdgGoals.includes(sdg)}
                      onChange={() => handleSDGChange(sdg)}
                      className="mr-2"
                    />
                    <span className="text-gray-700 dark:text-gray-300">{sdg}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Project Status
              </label>
              <select
                value={project.status}
                onChange={(e) => setProject(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="planned">Planned</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Upload Project
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