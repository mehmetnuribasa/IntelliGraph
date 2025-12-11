'use client';

import { useState, useEffect } from 'react';
import Image from "next/image";
import { useAuth } from './contexts/AuthContext';
import LoginModal from './components/LoginModal';
import AccountSettingsModal from './components/AccountSettingsModal';

export default function Home() {
  const { user, login, logout, register } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('projects');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [fundingCalls, setFundingCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);

  // Fetch projects and funding calls on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsRes, callsRes, researchersRes] = await Promise.all([
          fetch('/api/projects'),
          fetch('/api/funding-calls'),
          fetch('/api/researchers')
        ]);

        if (projectsRes.ok) {
          const projectsData = await projectsRes.json();
          setProjects(projectsData);
        }

        if (callsRes.ok) {
          const callsData = await callsRes.json();
          setFundingCalls(callsData);
        }

        if (researchersRes.ok) {
          const researchersData = await researchersRes.json();
          setResearchers(researchersData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        // Keep mock data as fallback
        setProjects([
          {
            id: 1,
            title: "AI-Driven Climate Change Analysis",
            academicName: "Dr. Ahmet Yılmaz",
            institution: "GTU Computer Engineering",
            description: "Using machine learning to analyze climate patterns and predict future changes.",
            similarity: 92,
            sdgGoals: ["Climate Action", "Life on Land"]
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const [researchers, setResearchers] = useState<any[]>([]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showUserMenu && !target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  const handleLogin = async (email: string, password: string, role: 'academic' | 'institution') => {
    await login(email, password, role);
  };

  const handleRegister = async (name: string, email: string, password: string, role: 'academic' | 'institution', institution: string) => {
    await register(name, email, password, role, institution);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&type=all`);
      if (response.ok) {
        const results = await response.json();
        setSearchResults(results);
        setSelectedTab('search-results');
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchResults(null);
    setSearchQuery('');
    setSelectedTab('projects');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">IG</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">IntelliGraph</h1>
            </div>

            {/* Navigation */}
            <nav className="flex items-center space-x-6">
              {user && (
                <>
                  {/* Role-based navigation for logged-in users */}
                  {user.role === 'academic' && (
                    <>
                      <a href="/upload-project" className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 font-medium">
                        Add Project
                      </a>
                      <button 
                        onClick={() => setSelectedTab('funding-calls')}
                        className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
                      >
                        Browse Funding
                      </button>
                    </>
                  )}
                  
                  {user.role === 'institution' && (
                    <>
                      <a href="/upload-call" className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 font-medium">
                        Post Funding Call
                      </a>
                      <button 
                        onClick={() => setSelectedTab('projects')}
                        className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
                      >
                        Browse Projects
                      </button>
                    </>
                  )}
                  
                  <button 
                    onClick={() => setSelectedTab('my-content')}
                    className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
                  >
                    My {user.role === 'academic' ? 'Projects' : 'Funding Calls'}
                  </button>
                </>
              )}
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="relative user-menu-container">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-left text-sm">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-gray-500 dark:text-gray-400 capitalize">{user.role}</p>
                    </div>
                    <svg className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {/* User Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                      <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                        Signed in as <strong>{user.email}</strong>
                      </div>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          setShowAccountSettings(true);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Account Settings
                      </button>
                      <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          logout();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Login / Register
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Rest of content - simplified for brevity */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {user ? `Welcome back, ${user.name}!` : 'AI-Supported Project Management Platform'}
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Connect researchers, discover projects, and find funding opportunities.
          </p>
        </div>

        <div className="text-center py-20">
          <p className="text-gray-600 dark:text-gray-300">
            Content sections will be added here for projects, funding calls, researchers, etc.
          </p>
        </div>
      </section>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
      
      <AccountSettingsModal
        isOpen={showAccountSettings}
        onClose={() => setShowAccountSettings(false)}
      />
    </div>
  );
}