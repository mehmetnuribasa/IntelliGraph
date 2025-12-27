'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export default function ProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all academics and find the one matching ID
        const academicsRes = await api.get('/academics');
        const foundProfile = academicsRes.data.find((p: any) => p.id === id);
        
        if (foundProfile) {
          setProfile(foundProfile);
          
          // Fetch projects
          const projectsRes = await api.get('/projects');
          // Filter projects for this user
          // Assuming authorName is the link, or maybe authorId if available
          const userProjects = projectsRes.data.filter((p: any) => p.authorName === foundProfile.name);
          setProjects(userProjects);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="pt-24 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="pt-24 text-center text-gray-600 dark:text-gray-300">
          Profile not found
        </div>
      </div>
    );
  }

  const isOwnProfile = user?.userId === profile.id;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Full Width Banner */}
      <div className="h-64 bg-gradient-to-r from-blue-600 to-indigo-600 w-full"></div>
      
      <main className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto -mt-32 relative z-10 pb-12">
        {/* Profile Header Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div className="flex items-end space-x-6">
              <div className="w-32 h-32 bg-white dark:bg-gray-800 rounded-2xl p-2 shadow-lg -mt-20">
                <div className="w-full h-full bg-indigo-500 rounded-xl flex items-center justify-center text-white text-4xl font-bold">
                  {profile.name.split(' ').map((word: string) => word[0]).join('').substring(0, 2)}
                </div>
              </div>
              <div className="mb-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {profile.name}
                </h1>
                <div className="flex items-center space-x-4 text-gray-600 dark:text-gray-300">
                  {profile.title && (
                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                      {profile.title}
                    </span>
                  )}
                  <span>•</span>
                  <span>{profile.institution}</span>
                </div>
              </div>
            </div>

            {isOwnProfile && (
              <Link
                href="/settings"
                className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm mb-2"
              >
                Account Settings
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Info */}
          <div className="space-y-6">
            {/* Contact Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
                Contact Information
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-300">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>{profile.email}</span>
                </div>
                {profile.id && (
                  <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-300">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                    <span>ID: {profile.id}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                  {projects.length}
                </div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Projects
                </div>
              </div>
              <div className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                  {profile.createdAt && !isNaN(new Date(profile.createdAt).getTime()) 
                    ? new Date(profile.createdAt).getFullYear() 
                    : new Date().getFullYear()}
                </div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Member Since
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Bio & Projects */}
          <div className="lg:col-span-2 space-y-8">
            {/* Bio */}
            {profile.bio && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">About</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {profile.bio}
                </p>
              </div>
            )}

            {/* Projects */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Research Projects</h3>
                {isOwnProfile && (
                  <Link 
                    href="/upload-project"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    + Add New Project
                  </Link>
                )}
              </div>
              
              <div className="space-y-4">
                {projects.length > 0 ? (
                  projects.map((project) => (
                    <div key={project.projectId || project.id} className="p-5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {project.title}
                        </h4>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          project.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          project.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {project.status || 'Active'}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                        {project.summary || project.description || 'No description available'}
                      </p>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <span>{project.startDate ? formatDate(project.startDate) : 'No date'}</span>
                        {project.budget && (
                          <>
                            <span className="mx-2">•</span>
                            <span>${project.budget.toLocaleString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-600">
                    <p className="text-gray-500 dark:text-gray-400">No projects found.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
