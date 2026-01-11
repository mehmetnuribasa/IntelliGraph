'use client';
import { useState, useEffect, Suspense } from 'react';
import { useAuth } from './contexts/AuthContext';
import GraphView from './components/GraphView';
import Link from 'next/link';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function HomeContent() {
  const { user } = useAuth();

  const router = useRouter();
  const searchParams = useSearchParams();

  // Helper for status colors
  const getStatusColor = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'active':
      case 'open':
        return 'bg-green-200 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'completed':
      case 'closed':
        return 'bg-red-200 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'planning':
        return 'bg-blue-200 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'paused':
      case 'suspended':
        return 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      default:
        return 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // Helper to remove HTML tags
  const stripHtml = (html: string) => {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, '');
  };

  
  // State Management
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedTab, setSelectedTab] = useState('projects');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setSelectedTab(tab);
    }
  }, [searchParams]);
  

  // Data States
  const [projects, setProjects] = useState<any[]>([]);
  const [fundingCalls, setFundingCalls] = useState<any[]>([]);
  const [researchers, setResearchers] = useState<any[]>([]);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);

  // UI States for Modals & Notifications
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [deleteCallModalOpen, setDeleteCallModalOpen] = useState(false);
  const [callToDelete, setCallToDelete] = useState<string | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // Auto-hide notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // DATA FETCHING (Backend Integration)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Parallel API calls
        const [projectsRes, callsRes, academicsRes, graphRes] = await Promise.all([
          api.get('/projects'),    // Projects
          api.get('/calls'),       // Calls
          api.get('/academics'),   // Academics
          api.get('/graph/data')   // Graph Data
        ]);

        setProjects(projectsRes.data);
        setFundingCalls(callsRes.data);
        setResearchers(academicsRes.data);
        setGraphData(graphRes.data);

      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);


  
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false)

  // SEARCH FUNCTION
  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;
    
    // Start loading states
    setSearching(true);
    setLoadingAi(true);
    setAiAnswer(null); // Reset AI answer
    setSearchResults(null); // Clear previous results
    setSelectedTab('search-results'); // Switch tab immediately
    
    try {
      // UNIFIED REQUEST: Call /api/research-assistant which now handles both search and AI summary
      const response = await api.post('/research-assistant', { query: searchQuery });
      const { answer, results } = response.data;
      
      // Update Search Results UI
      setSearchResults({
        combined: results,
        totalResults: results.length
      });
      // Removed automatic tab switch here to allow background searching
      
      // Update AI Answer UI
      // If the answer is empty (fallback), we might choose not to show it or show a specific message.
      if (answer) {
         setAiAnswer(answer);
      } else {
         setAiAnswer(null);
      }

    } catch (error) {
      console.error('Search error:', error);
      alert('Search failed. Please try again.');
    } finally {
      setSearching(false);
      setLoadingAi(false);
    }
  };

  const clearSearch = () => {
    setSearchResults(null);
    setSearchQuery('');
    setSelectedTab('projects');
  };

  const handleDeleteProject = (projectId: string) => {
    setProjectToDelete(projectId);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;

    try {
      await api.delete(`/projects/${projectToDelete}`);
      
      // Update state to remove the deleted project
      setProjects(prev => prev.filter(p => (p.projectId || p.id) !== projectToDelete));
      
      // Also update search results if they are being shown
      if (searchResults && searchResults.combined) {
         setSearchResults((prev: any) => ({
            ...prev,
            combined: prev.combined.filter((item: any) => (item.id !== projectToDelete))
         }));
      }

      setNotification({ message: 'Project deleted successfully.', type: 'success' });
    } catch (error) {
      console.error('Delete error:', error);
      setNotification({ message: 'Failed to delete project.', type: 'error' });
    } finally {
      setDeleteModalOpen(false);
      setProjectToDelete(null);
    }
  };

  const handleDeleteCall = (callId: string) => {
    setCallToDelete(callId);
    setDeleteCallModalOpen(true);
  };

  const confirmDeleteCall = async () => {
    if (!callToDelete) return;

    try {
      await api.delete(`/calls/${callToDelete}`);
      
      // Update state to remove the deleted call
      setFundingCalls(prev => prev.filter(c => c.id !== callToDelete));
      
      // Also update search results if they are being shown
      if (searchResults && searchResults.combined) {
         setSearchResults((prev: any) => ({
            ...prev,
            combined: prev.combined.filter((item: any) => (item.id !== callToDelete))
         }));
      }

      setNotification({ message: 'Funding call deleted successfully.', type: 'success' });
    } catch (error) {
      console.error('Delete error:', error);
      setNotification({ message: 'Failed to delete funding call.', type: 'error' });
    } finally {
      setDeleteCallModalOpen(false);
      setCallToDelete(null);
    }
  };


  return (
    <div className="min-h-screen bg-slate-50 dark:from-gray-900 dark:to-blue-900 dark:bg-gradient-to-br">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 mb-6 tracking-tight max-w-4xl mx-auto">
            {user ? `Welcome back, ${user.name}!` : 'AI-Supported Project Management Platform'}
            </h2>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            {user ? (
              user.role === 'ACADEMIC' 
                ? 'Manage your research projects, discover funding opportunities, and connect with other researchers.'
                : 'Post funding calls, discover relevant research projects, and connect with academic researchers.'
            ) : (
              'Discover semantically related research projects, connect with relevant researchers, and visualize relationships between projects, publications, and sustainable development goals.'
            )}
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-4xl mx-auto mb-16 relative z-10">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative flex items-end bg-white dark:bg-gray-800 rounded-2xl shadow-xl transition-all duration-200">
              <div className="pl-6 pb-5 text-gray-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <textarea
                placeholder="Describe your research idea in detail to ask your AI Assistant..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                rows={1}
                className="w-full px-4 py-5 text-lg bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none resize-none overflow-hidden min-h-[68px]"
              />
              <div className="pr-3 pb-2.5">
                <button 
                  onClick={handleSearch}
                  disabled={searching || searchQuery.trim().length < 2}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl hover:cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-medium"
                >
                  {searching ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>
          </div>
          
          {!searchResults && (
            <div className="mt-3 px-2 animate-fadeIn flex justify-center">
               <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                <span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">AI Tip:</span> You can search by keywords OR describe your idea in detail. Don't limit yourself!
                </span>
              </p>
            </div>
          )}

          {searchResults && (
            <div className="text-center mt-4">
              <button
                onClick={clearSearch}
                className="text-gray-500 hover:cursor-pointer hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 text-sm font-medium transition-colors flex items-center justify-center mx-auto space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                <span>Clear results</span>
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-12">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-1.5 shadow-xl border border-gray-200/50 dark:border-gray-700/50 inline-flex flex-wrap justify-center gap-2">
            {(searchResults || searching) && (
              <button
                onClick={() => setSelectedTab('search-results')}
                className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                  selectedTab === 'search-results'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                }`}
              >
                {searching ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Searching...
                  </span>
                ) : (
                  `Search Results (${searchResults?.totalResults || 0})`
                )}
              </button>
            )}
            
            {/* My Projects tab - for all logged-in users */}
            {user && (
              <button
                onClick={() => setSelectedTab('my-projects')}
                className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                  selectedTab === 'my-projects'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                }`}
              >
                My Projects
              </button>
            )}

            {/* My Funding Calls tab - only for non-academic users */}
            {user && user.role !== 'ACADEMIC' && (
              <button
                onClick={() => setSelectedTab('my-funding-calls')}
                className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                  selectedTab === 'my-funding-calls'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                }`}
              >
                My Funding Calls
              </button>
            )}
            
            <button
              onClick={() => setSelectedTab('projects')}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                selectedTab === 'projects'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
            >
              All Projects
            </button>
            <button
              onClick={() => setSelectedTab('funding-calls')}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                selectedTab === 'funding-calls'
                  ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-lg shadow-purple-500/30'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
            >
              Funding Calls
            </button>
            <button
              onClick={() => setSelectedTab('researchers')}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                selectedTab === 'researchers'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
            >
              Researchers
            </button>
            <button
              onClick={() => setSelectedTab('visualization')}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                selectedTab === 'visualization'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-500/30'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
            >
              Graph Visualization
            </button>
          </div>
        </div>


        {/* Content Area */}
        <div className="w-full min-h-[400px]">
          {/* Main Content */}
          <div className="w-full">
            {selectedTab === 'search-results' && (searchResults || loadingAi) && (
              <div className="space-y-6 animate-fadeIn">
                
                {/* --- AI INTELLIGENT INSIGHTS BOX --- */}
                {(loadingAi || aiAnswer) && (
                  <div className="relative overflow-hidden rounded-2xl border border-indigo-100 dark:border-indigo-800 bg-white dark:bg-gray-800 p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
                    {/* Background  (Gradient Mesh) */}
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-full opacity-10 blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-gradient-to-tr from-blue-400 to-cyan-400 rounded-full opacity-10 blur-2xl"></div>
                    
                    <div className="relative z-10">
                      {/* Header Area */}
                      <div className="flex items-center space-x-3 mb-4">
                        <div className={`p-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md ${loadingAi ? 'animate-pulse' : ''}`}>
                           {/* Sparkles Icon */}
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                        <h4 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                          AI Research Assistant
                        </h4>
                      </div>

                      {/* Content Area */}
                      {loadingAi ? (
                        <div className="flex flex-col space-y-3">
                          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 animate-pulse">
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <span className="text-sm font-medium">Analyzing platform data for "{searchQuery}"...</span>
                          </div>
                          {/* Skeleton Loaders */}
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse"></div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
                        </div>
                      ) : (
                        <div className="prose prose-indigo prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {aiAnswer}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* --- SEARCH RESULTS LIST --- */}
                {searchResults && (
                  <>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                  <span className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-2 rounded-lg mr-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </span>
                  Search Results for "{searchQuery.length > 40 ? searchQuery.substring(0, 40) + '...' : searchQuery}" <span className="ml-3 text-lg font-normal text-gray-500">({searchResults.totalResults} results)</span>
                </h3>
                {searchResults.combined && searchResults.combined.length > 0 ? (
                  <div className="grid gap-6">
                    {searchResults.combined.map((item: any) => (
                      <div key={`${item.type}-${item.id}`} className="group bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:-translate-y-1">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full mb-3 ${
                              (item.type === 'Project' || item.type === 'PROJECT') 
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                                : (item.type === 'Call' || item.type === 'FUNDING CALL')
                                ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                            }`}>
                              {(item.type === 'Project' || item.type === 'PROJECT') ? 'Research Project' : (item.type === 'Call' || item.type === 'FUNDING CALL') ? 'Funding Call' : 'Researcher'}
                            </span>
                            <h4 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{item.title}</h4>
                          </div>
                          {item.type !== 'Academic' && item.type !== 'RESEARCHER' && (
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide ${getStatusColor(item.status)}`}>
                              {item.status || 'Active'}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-none leading-relaxed" style={{ display: '-webkit-box', WebkitLineClamp: 10,  WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {(item.content || item.description) ? (item.content || item.description).replace(/<[^>]*>?/gm, '') : 'No description available'}
                        </p>
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700 flex-wrap gap-2">
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                             {/* Source / Author Display */}
                            {(item.type === 'Project' || item.type === 'PROJECT') ? (
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-900 dark:text-white flex items-center">
                                  <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                  {item.source || 'Unknown Researcher'}
                                </span>
                                {item.score && (
                                  <span className="mt-1 px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded text-xs font-medium w-fit">
                                    {(item.score * 100).toFixed(0)}% Match
                                  </span>
                                )}
                              </div>
                            ) : (item.type === 'Call' || item.type === 'FUNDING CALL') ? (
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-900 dark:text-white flex items-center">
                                   <svg className="w-4 h-4 mr-1 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                   {item.source || 'Unknown Institution'}
                                </span>
                                {item.score && (
                                  <span className="mt-1 px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded text-xs font-medium w-fit">
                                    {(item.score * 100).toFixed(0)}% Match
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-900 dark:text-white flex items-center">
                                    <svg className="w-4 h-4 mr-1 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                    {item.source || 'Researcher'}
                                </span>
                                <span className="mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded text-xs font-medium w-fit">
                                    Expert Profile
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-3 flex-wrap justify-end mt-2 sm:mt-0">
                                {/* METADATA BADGES */}
                                {item.deadline && (
                                    <div className="flex items-center text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2.5 py-1 rounded-full border border-red-100 dark:border-red-800" title={`Deadline: ${formatDate(item.deadline)}`}>
                                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        <span className="font-semibold">{new Date(item.deadline).toLocaleDateString()}</span>
                                    </div>
                                )}

                                {item.budget && (
                                    <div className="flex items-center text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-full border border-green-100 dark:border-green-800">
                                        <span className="mr-1">💰</span>
                                        <span className="font-semibold">{Number(item.budget).toLocaleString()} TL</span>
                                    </div>
                                )}
                                
                                {item.website && (
                                    <a href={item.website} target="_blank" rel="noopener noreferrer" className="flex items-center text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-full border border-blue-100 dark:border-blue-800 hover:underline" onClick={(e) => e.stopPropagation()}>
                                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                        Src
                                    </a>
                                )}
                          </div>
                        </div>

                        {/* Keywords Row */}
                        {item.keywords && Array.isArray(item.keywords) && item.keywords.length > 0 && (
                            <div className="mt-4 pt-3 flex flex-wrap gap-2 border-t border-gray-50 dark:border-gray-700/50">
                                {item.keywords.slice(0, 4).map((k: string, i: number) => (
                                    <span key={i} className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-400 px-2 py-0.5 rounded">
                                        #{k}
                                    </span>
                                ))}
                            </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
                    <div className="text-6xl mb-4">🔍</div>
                    <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No results found</h4>
                    <p className="text-gray-500 dark:text-gray-400">We couldn't find anything matching "{searchQuery}". Try different keywords.</p>
                  </div>
                )}
                  </>
                )}
              </div>
            )}

            {selectedTab === 'my-projects' && user && (
              <div className="space-y-8 animate-fadeIn">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-2 rounded-lg mr-3">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    </span>
                    My Projects
                  </h3>
                  <a
                    href="/upload-project"
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 font-medium flex items-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Add Project
                  </a>
                </div>
                
                {projects.filter(project => project.authorId === user.userId).length > 0 ? (
                  <div className="grid gap-6">
                    {projects.filter(project => project.authorId === user.userId).map((project) => (
                      <div key={project.projectId || project.id} className="group bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:-translate-y-1 relative">
                        <div className="flex justify-between items-start mb-4">
                          <div className="pr-10">
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide ${getStatusColor(project.status)}`}>
                                {project.status || 'Active'}
                              </span>
                            </div>
                            <h4 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{project.title}</h4>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/edit-project/${project.projectId || project.id}`);
                              }}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-all"
                              title="Edit Project"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProject(project.projectId || project.id);
                              }}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-all"
                              title="Delete Project"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </div>
                        
                        <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-10 leading-relaxed">
                          {project.summary || project.description || 'No description available'}
                        </p>

                        {/* Keywords Display */}
                        {project.keywords && project.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {project.keywords.map((keyword: string, idx: number) => (
                              <span key={idx} className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-md">
                                #{keyword}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {project.createdAt && (
                              <span className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                Created: {formatDate(project.createdAt)}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-4">
                            {/* Budget Display */}
                            {project.budget && (
                              <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full border border-green-100 dark:border-green-800">
                                <span className="mr-1">💰</span>
                                <span className="font-semibold text-green-700 dark:text-green-400">{Number(project.budget).toLocaleString()}</span>
                              </div>
                            )}

                            {/* Website Link */}
                            {project.website && (
                              <a
                                href={project.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-800"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                {(() => {
                                  try {
                                    return new URL(project.website).hostname.replace('www.', '');
                                  } catch {
                                    return 'Website';
                                  }
                                })()}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
                    <div className="text-6xl mb-4">🚀</div>
                    <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Projects Yet</h4>
                    <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">Start by adding your first research project to connect with funding opportunities.</p>
                    <a
                      href="/upload-project"
                      className="bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium inline-flex items-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Add Your First Project
                    </a>
                  </div>
                )}
              </div>
            )}

            {selectedTab === 'my-funding-calls' && user && user.role !== 'ACADEMIC' && (
              <div className="space-y-8 animate-fadeIn">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                    <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 p-2 rounded-lg mr-3">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                    </span>
                    My Funding Calls
                  </h3>
                  <a
                    href="/upload-call"
                    className="bg-gradient-to-r from-purple-600 to-violet-600 text-white px-6 py-3 rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 font-medium flex items-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Post New Funding Call
                  </a>
                </div>

                {fundingCalls.filter(call => call.authorId === user.userId).length > 0 ? (
                  <div className="grid gap-6">
                    {fundingCalls.filter(call => call.authorId === user.userId).map((call) => (
                      <div key={call.id} className="group bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:-translate-y-1 relative">
                        <div className="flex justify-between items-start mb-4">
                          <div className="pr-10">
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide ${getStatusColor(call.status)}`}>
                                {call.status || 'Open'}
                              </span>
                            </div>
                            <h4 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{call.title}</h4>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/edit-call/${call.id}`);
                              }}
                              className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-full transition-all"
                              title="Edit Call"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCall(call.id);
                              }}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-all"
                              title="Delete Call"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </div>
                        
                        <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-10 leading-relaxed">
                          {call.description || 'No description available'}
                        </p>

                        {/* Keywords Display */}
                        {call.keywords && call.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {call.keywords.map((keyword: string, idx: number) => (
                              <span key={idx} className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-md">
                                #{keyword}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700 flex-wrap gap-2">
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                            <span className="font-medium">{call.institutionName || 'Unknown'}</span>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            {call.deadline && (
                              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span>Deadline: {formatDate(call.deadline)}</span>
                              </div>
                            )}
                            
                            {/* Budget Display */}
                            {call.budget && (
                               <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full border border-green-100 dark:border-green-800">
                                  <span className="mr-1">💰</span>
                                  <span className="font-semibold text-green-700 dark:text-green-400">{Number(call.budget).toLocaleString()} TL</span>
                               </div>
                            )}

                            {/* Website Link */}
                            {call.website && (
                              <a
                                href={call.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-800"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                {(() => {
                                  try {
                                    return new URL(call.website).hostname.replace('www.', '');
                                  } catch {
                                    return 'Website';
                                  }
                                })()}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
                    <div className="text-6xl mb-4">📢</div>
                    <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Funding Calls Yet</h4>
                    <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">Start by posting your first funding call to connect with researchers.</p>
                    <a
                      href="/upload-call"
                      className="bg-purple-600 text-white px-8 py-3 rounded-xl hover:bg-purple-700 transition-colors font-medium inline-flex items-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Post Your First Funding Call
                    </a>
                  </div>
                )}
              </div>
            )}

            {selectedTab === 'projects' && (
              <div className="space-y-8 animate-fadeIn">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                  <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-2 rounded-lg mr-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                  </span>
                  All Research Projects
                </h3>
                {loading ? (
                  <div className="text-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300">Loading projects...</p>
                  </div>
                ) : projects.length > 0 ? (
                  <div className="grid gap-6">
                    {Array.from(new Map(projects.map((p: any) => [p.projectId || p.id, p])).values()).map((project: any) => (
                      <div key={project.projectId || project.id} className="group bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:-translate-y-1">
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{project.title}</h4>
                          <span className={`text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide ${getStatusColor(project.status)}`}>
                            {project.status || 'Active'}
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-10 leading-relaxed">{stripHtml(project.summary) || 'No summary available'}</p>
                        
                        {/* Keywords Display */}
                        {project.keywords && project.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {project.keywords.map((keyword: string, idx: number) => (
                              <span key={idx} className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-md">
                                #{keyword}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs mr-3">
                              {(project.authorName || 'U').charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {project.authorName || 'Unknown Researcher'}
                              </p>
                              {project.createdAt && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatDate(project.createdAt)}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            {/* Budget Display */}
                            {project.budget && (
                              <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full border border-green-100 dark:border-green-800">
                                <span className="mr-1">💰</span>
                                <span className="font-semibold text-green-700 dark:text-green-400">{Number(project.budget).toLocaleString()}</span>
                              </div>
                            )}

                            {/* Website Link */}
                            {project.website && (
                              <a
                                href={project.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-800"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                {(() => {
                                  try {
                                    return new URL(project.website).hostname.replace('www.', '');
                                  } catch {
                                    return 'Website';
                                  }
                                })()}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
                    <div className="text-6xl mb-4">🧪</div>
                    <p className="text-gray-600 dark:text-gray-300 text-lg">No projects found. Be the first to upload a project!</p>
                  </div>
                )}
              </div>
            )}

            {selectedTab === 'funding-calls' && (
              <div className="space-y-8 animate-fadeIn">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                  <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 p-2 rounded-lg mr-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </span>
                  Available Funding Calls
                </h3>
                {loading ? (
                  <div className="text-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300">Loading funding calls...</p>
                  </div>
                ) : fundingCalls.length > 0 ? (
                  <div className="grid gap-6">
                    {fundingCalls.map((call: any) => (
                      <div key={call.id} className="group bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:-translate-y-1">
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{call.title}</h4>
                          <div className="flex flex-col items-end space-y-1">
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide ${getStatusColor(call.status)}`}>
                              {call.status || 'Active'}
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-10 leading-relaxed">{call.description || 'No description available'}</p>
                        
                        {/* Keywords Display */}
                        {call.keywords && call.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {call.keywords.map((keyword: string, idx: number) => (
                              <span key={idx} className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-md">
                                #{keyword}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700 flex-wrap gap-2">
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                            <span className="font-medium">{call.institutionName || 'Unknown Institution'}</span>
                            {call.authorName && <span className="ml-2 text-xs text-gray-400">({call.authorName})</span>}
                          </div>
                          
                          <div className="flex items-center gap-4">
                            {call.deadline && (
                              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span>Deadline: {formatDate(call.deadline)}</span>
                              </div>
                            )}
                            
                            {/* Budget Display */}
                            {call.budget && (
                               <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full border border-green-100 dark:border-green-800">
                                  <span className="mr-1">💰</span>
                                  <span className="font-semibold text-green-700 dark:text-green-400">{Number(call.budget).toLocaleString()} TL</span>
                               </div>
                            )}

                            {/* Website Link */}
                            {call.website && (
                              <a
                                href={call.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-800"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                {(() => {
                                  try {
                                    return new URL(call.website).hostname.replace('www.', '');
                                  } catch {
                                    return 'Website';
                                  }
                                })()}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
                    <div className="text-6xl mb-4">💰</div>
                    <p className="text-gray-600 dark:text-gray-300 text-lg">No funding calls available at the moment.</p>
                  </div>
                )}
              </div>
            )}

            {selectedTab === 'researchers' && (
              <div className="space-y-8 animate-fadeIn">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                  <span className="bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 p-2 rounded-lg mr-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  </span>
                  Platform Researchers
                </h3>
                {loading ? (
                  <div className="text-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300">Loading researchers...</p>
                  </div>
                ) : researchers.length > 0 ? (
                  <div className="grid gap-6">
                    {researchers.map((researcher: any) => (
                      <div key={researcher.id} className="group bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:-translate-y-1">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center">
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-xl mr-4 shadow-lg shadow-cyan-500/30">
                              {researcher.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                                {researcher.name}
                              </h4>
                              {researcher.title && (
                                <p className="text-sm text-cyan-600 dark:text-cyan-400 font-medium">
                                  {researcher.title}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-semibold px-3 py-1 rounded-full">
                            {typeof researcher.projectCount === 'number' ? researcher.projectCount : 0} Projects
                          </span>
                        </div>
                        
                        <p className="text-gray-600 dark:text-gray-300 mb-2 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                          {researcher.institution || 'Independent Researcher'}
                        </p>
                        
                        {researcher.bio && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                            {researcher.bio}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {researcher.createdAt && (
                              <span>Member since {formatDate(researcher.createdAt)}</span>
                            )}
                          </div>
                          <Link 
                            href={`/profile/${researcher.id}`}
                            className="text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 text-sm font-bold px-4 py-2 rounded-lg hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors"
                          >
                            View Profile
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
                    <div className="text-6xl mb-4">👥</div>
                    <p className="text-gray-600 dark:text-gray-300 text-lg">No researchers found on the platform yet.</p>
                  </div>
                )}
              </div>
            )}

          
          {/* --- GRAPH VISUALIZATION TAB --- */}
          {selectedTab === 'visualization' && (
            <GraphView graphData={graphData} loading={loading} />
          )}
          </div>
        </div>
      </section>

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all scale-100">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Project?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Are you sure you want to delete this project? This action cannot be undone and will remove all associated data.
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-red-500/30"
                >
                  Yes, Delete It
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- DELETE CALL CONFIRMATION MODAL --- */}
      {deleteCallModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all scale-100">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Funding Call?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Are you sure you want to delete this funding call? This action cannot be undone.
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setDeleteCallModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteCall}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-red-500/30"
                >
                  Yes, Delete It
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- NOTIFICATION TOAST --- */}
      {notification && (
        <div className="fixed bottom-4 right-4 z-50 animate-slideIn">
          <div className={`flex items-center px-4 py-3 rounded-xl shadow-lg border ${
            notification.type === 'success' 
              ? 'bg-white dark:bg-gray-800 border-green-100 dark:border-green-900 text-green-700 dark:text-green-400' 
              : 'bg-white dark:bg-gray-800 border-red-100 dark:border-red-900 text-red-700 dark:text-red-400'
          }`}>
            {notification.type === 'success' ? (
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            ) : (
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
