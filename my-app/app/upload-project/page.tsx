'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '@/lib/api';

export default function UploadProjectPage() {
  const { user } = useAuth();
  const [project, setProject] = useState({
    title: '',
    summary: '',
    keywords: '',
    fieldOfStudy: '',
    startDate: '',
    endDate: '',
    budget: '',
    collaborators: '',
    publications: '',
    status: 'Active'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Prepare data according to API expectations
      // API expects: title, summary, status, startDate, endDate
      const projectData = {
        title: project.title,
        summary: project.summary || project.title,
        status: project.status,
        startDate: project.startDate || null,
        endDate: project.endDate || null
      };

      const response = await api.post('/projects', projectData);

      console.log('Project created:', response.data);
      alert('Project uploaded successfully!');
      
      // Reset form
      setProject({
        title: '',
        summary: '',
        keywords: '',
        fieldOfStudy: '',
        startDate: '',
        endDate: '',
        budget: '',
        collaborators: '',
        publications: '',
        status: 'Active'
      });
      
    } catch (error: any) {
      console.error('Project upload error:', error);
      
      // Handle validation errors
      if (error.response?.data?.errors) {
        const errorMessages = Object.entries(error.response.data.errors)
          .map(([field, messages]: [string, any]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('\n');
        alert(`Validation errors:\n${errorMessages}`);
      } else {
        alert(`Project upload failed: ${error.response?.data?.message || error.message || 'Unknown error'}`);
      }
    }
  };

  if (!user || user.role !== 'ACADEMIC') {
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
    <div className="min-h-screen bg-slate-50 from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900 dark:bg-gradient-to-br">
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
                value={project.summary}
                onChange={(e) => setProject(prev => ({ ...prev, summary: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Describe your research project, objectives, methodology, and expected outcomes..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Keywords (comma-separated) *
              </label>
              <input
                type="text"
                value={project.keywords}
                onChange={(e) => setProject(prev => ({ ...prev, keywords: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="e.g., machine learning, natural language processing, graph mining"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={project.startDate}
                  onChange={(e) => setProject(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  value={project.endDate}
                  onChange={(e) => setProject(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
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
                Project Status *
              </label>
              <select
                value={project.status}
                onChange={(e) => setProject(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              >
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="Planning">Planning</option>
                <option value="Paused">Paused</option>
              </select>
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