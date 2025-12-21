'use client';

import { formatDate } from '@/lib/utils';

interface ResearcherProfileModalProps {
  selectedResearcher: any;
  onClose: () => void;
  projects: any[];
}

export default function ResearcherProfileModal({ selectedResearcher, onClose, projects }: ResearcherProfileModalProps) {
  if (!selectedResearcher) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {selectedResearcher.name.split(' ').map((word: string) => word[0]).join('').substring(0, 2)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {selectedResearcher.name}
                </h2>
                {selectedResearcher.title && (
                  <p className="text-blue-600 dark:text-blue-400 font-medium mb-1">
                    {selectedResearcher.title}
                  </p>
                )}
                <p className="text-gray-600 dark:text-gray-300">
                  {selectedResearcher.institution}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>

          {/* Contact Info */}
          {selectedResearcher.id && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Researcher ID: {selectedResearcher.id}</span>
              </div>
            </div>
          )}

          {/* Bio */}
          {selectedResearcher.bio && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                About
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {selectedResearcher.bio}
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {typeof selectedResearcher.projectCount === 'number' ? selectedResearcher.projectCount : 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Research Projects</div>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {selectedResearcher.createdAt ? formatDate(selectedResearcher.createdAt) : 'N/A'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Member Since</div>
            </div>
          </div>

          {/* Projects Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Research Projects
            </h3>
            <div className="space-y-2">
              {projects.filter(p => p.authorName === selectedResearcher.name).length > 0 ? (
                projects.filter(p => p.authorName === selectedResearcher.name).map((project) => (
                  <div key={project.projectId || project.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                      {project.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                      {(project.summary || project.description || 'No description available').substring(0, 100)}...
                    </p>
                    <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
                      <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded">
                        {project.status || 'Active'}
                      </span>
                      {project.createdAt && (
                        <span>Created: {formatDate(project.createdAt)}</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No projects listed yet</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center">
            <button 
              onClick={() => {
                // Since email is not in API response, we can show a message or use researcher ID
                alert(`To contact ${selectedResearcher.name}, please use their researcher profile (ID: ${selectedResearcher.id})`);
              }}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              View Full Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
