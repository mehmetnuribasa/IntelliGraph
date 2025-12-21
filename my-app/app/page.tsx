'use client';
import { useState, useEffect, Suspense } from 'react';
import { useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import GraphView from './components/GraphView';
import ResearcherProfileModal from './components/ResearcherProfileModal';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';

function HomeContent() {
  const { user } = useAuth();

  const router = useRouter();
  const searchParams = useSearchParams();

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
  const [selectedResearcher, setSelectedResearcher] = useState<any>(null);

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




  
  // SEARCH FUNCTION
  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;
    
    router.push(`/?q=${encodeURIComponent(searchQuery)}`, { scroll: false });
    setSearching(true);
    try {
      const res = await api.get(`/search?q=${encodeURIComponent(searchQuery)}`);
      
      setSearchResults({
        combined: res.data.results,
        totalResults: res.data.results.length
      });
      setSelectedTab('search-results');
      
    } catch (error) {
      console.error('Search error:', error);
      alert('Search failed.');
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
      <Navbar />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {user ? `Welcome back, ${user.name}!` : 'AI-Supported Project Management Platform'}
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
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
        <div className="max-w-3xl mx-auto mb-12">
          <div className="relative">
            <input
              type="text"
              placeholder="Search projects, researchers, or topics using AI-powered semantic search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full px-6 py-4 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <button 
              onClick={handleSearch}
              disabled={searching || searchQuery.trim().length < 2}
              className="absolute right-3 top-3 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>
          {searchResults && (
            <div className="text-center">
              <button
                onClick={clearSearch}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
              >
                Clear search results
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm">
            {searchResults && (
              <button
                onClick={() => setSelectedTab('search-results')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  selectedTab === 'search-results'
                    ? 'bg-green-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:text-green-600'
                }`}
              >
                Search Results ({searchResults.totalResults})
              </button>
            )}
            
            {/* My Content tab - only for logged-in users */}
            {user && (
              <button
                onClick={() => setSelectedTab('my-content')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  selectedTab === 'my-content'
                    ? 'bg-orange-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:text-orange-600'
                }`}
              >
                My {user.role === 'ACADEMIC' ? 'Projects' : 'Funding Calls'}
              </button>
            )}
            
            <button
              onClick={() => setSelectedTab('projects')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                selectedTab === 'projects'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:text-blue-600'
              }`}
            >
              All Projects
            </button>
            <button
              onClick={() => setSelectedTab('funding-calls')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                selectedTab === 'funding-calls'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:text-blue-600'
              }`}
            >
              Funding Calls
            </button>
            <button
              onClick={() => setSelectedTab('researchers')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                selectedTab === 'researchers'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:text-blue-600'
              }`}
            >
              Researchers
            </button>
            <button
              onClick={() => setSelectedTab('visualization')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                selectedTab === 'visualization'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:text-blue-600'
              }`}
            >
              Graph Visualization
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="w-full">
          {/* Main Content */}
          <div className="w-full">
            {selectedTab === 'search-results' && searchResults && (
              <div className="space-y-6">
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                  Search Results for "{searchQuery}" ({searchResults.totalResults} results)
                </h3>
                {searchResults.combined && searchResults.combined.length > 0 ? (
                  searchResults.combined.map((item: any) => (
                    <div key={`${item.type}-${item.id}`} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className={`inline-block px-2 py-1 text-xs rounded-full mb-2 ${
                            item.type === 'Project' 
                              ? 'bg-blue-100 text-blue-800' 
                              : item.type === 'Call'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {item.type === 'Project' ? 'Research Project' : item.type === 'Call' ? 'Funding Call' : 'Researcher'}
                          </span>
                          <h4 className="text-xl font-semibold text-gray-900 dark:text-white">{item.title}</h4>
                        </div>
                        {item.type !== 'Academic' && (
                          <span className="bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full">
                            {item.status || 'Active'}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 mb-3">
                        {item.description || 'No description available'}
                      </p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {item.type === 'Project' ? (
                              <>
                                <strong>{item.subtitle || 'Unknown Researcher'}</strong>
                                {item.score && (
                                  <span className="text-xs ml-2 text-gray-400">(Similarity: {(item.score * 100).toFixed(1)}%)</span>
                                )}
                              </>
                            ) : item.type === 'Call' ? (
                              <>
                                <strong>{item.subtitle || 'Unknown Institution'}</strong>
                                {item.score && (
                                  <span className="text-xs ml-2 text-gray-400">(Similarity: {(item.score * 100).toFixed(1)}%)</span>
                                )}
                              </>
                            ) : (
                              <>
                                <strong>{item.subtitle || 'Researcher'}</strong>
                                {item.score && (
                                  <span className="text-xs ml-2 text-gray-400">(Match)</span>
                                )}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600 dark:text-gray-300">No results found for "{searchQuery}". Try different keywords.</p>
                  </div>
                )}
              </div>
            )}

            {selectedTab === 'my-content' && user && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    My {user.role === 'ACADEMIC' ? 'Projects' : 'Funding Calls'}
                  </h3>
                  {user.role === 'ACADEMIC' ? (
                    <a
                      href="/upload-project"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Add New Project
                    </a>
                  ) : (
                    <a
                      href="/upload-call"
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium"
                    >
                      Post New Funding Call
                    </a>
                  )}
                </div>
                
                {user.role === 'ACADEMIC' ? (
                  // Show user's projects - need to match by userId from projects
                  projects.filter(project => project.authorName === user.name).length > 0 ? (
                    projects.filter(project => project.authorName === user.name).map((project) => (
                      <div key={project.projectId || project.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="text-xl font-semibold text-gray-900 dark:text-white">{project.title}</h4>
                          <span className="bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full">
                            {project.status || 'Active'}
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-3">
                          {project.summary || project.description || 'No description available'}
                        </p>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              <span className="font-medium">Author:</span> {project.authorName || user.name}
                            </p>
                            {project.createdAt && (
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                Created: {formatDate(project.createdAt)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <button
                            onClick={() => {
                              // TODO: Implement edit functionality
                              alert('Edit functionality will be implemented');
                            }}
                            className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-sm font-medium"
                            title="Edit Project"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
                                // TODO: Implement delete API call
                                alert('Delete functionality will be implemented');
                              }
                            }}
                            className="flex items-center space-x-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-medium"
                            title="Delete Project"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Projects Yet</h4>
                      <p className="text-gray-600 dark:text-gray-300 mb-6">Start by adding your first research project to connect with funding opportunities.</p>
                      <a
                        href="/upload-project"
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        Add Your First Project
                      </a>
                    </div>
                  )
                ) : (
                  // Show user's funding calls - Note: API doesn't provide institutionEmail, showing all calls for now
                  fundingCalls.length > 0 ? (
                    fundingCalls.map((call) => (
                      <div key={call.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="text-xl font-semibold text-gray-900 dark:text-white">{call.title}</h4>
                          <span className="bg-purple-100 text-purple-800 text-sm px-3 py-1 rounded-full">
                            {call.status || 'Open'}
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-3">
                          {call.description || 'No description available'}
                        </p>
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300 mb-4">
                          <div>
                            <span className="font-medium">Institution:</span> {call.institutionName || 'Unknown'}
                          </div>
                          <div>
                            <span className="font-medium">Status:</span> {call.status || 'Open'}
                          </div>
                          {call.deadline && (
                            <div>
                              <span className="font-medium">Deadline:</span> {formatDate(call.deadline)}
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-2 border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                          <button
                            onClick={() => {
                              // TODO: Implement edit functionality
                              alert('Edit funding call functionality will be implemented');
                            }}
                            className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                          >
                            Edit Funding Call
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this funding call? This action cannot be undone.')) {
                                // TODO: Implement delete API call
                                alert('Delete funding call functionality will be implemented');
                              }
                            }}
                            className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                          >
                            Delete Funding Call
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Funding Calls Yet</h4>
                      <p className="text-gray-600 dark:text-gray-300 mb-6">Start by posting your first funding call to connect with researchers.</p>
                      <a
                        href="/upload-call"
                        className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium"
                      >
                        Post Your First Funding Call
                      </a>
                    </div>
                  )
                )}
              </div>
            )}

            {selectedTab === 'projects' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                  Semantically Related Projects
                </h3>
                {loading ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 dark:text-gray-300">Loading projects...</p>
                  </div>
                ) : projects.length > 0 ? (
                  projects.map((project: any) => (
                    <div key={project.projectId || project.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-xl font-semibold text-gray-900 dark:text-white">{project.title}</h4>
                        <span className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                          {project.status || 'Active'}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 mb-3">{project.summary || 'No summary available'}</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            <strong>{project.authorName || 'Unknown Researcher'}</strong>
                          </p>
                          {project.createdAt && (
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              Created: {formatDate(project.createdAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600 dark:text-gray-300">No projects found. Be the first to upload a project!</p>
                  </div>
                )}
              </div>
            )}

            {selectedTab === 'funding-calls' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                  Available Funding Calls
                </h3>
                {loading ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 dark:text-gray-300">Loading funding calls...</p>
                  </div>
                ) : fundingCalls.length > 0 ? (
                  fundingCalls.map((call: any) => (
                    <div key={call.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-xl font-semibold text-gray-900 dark:text-white">{call.title}</h4>
                        <div className="flex flex-col items-end space-y-1">
                          <span className="bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full">
                            {call.status || 'Active'}
                          </span>
                          {call.deadline && (
                            <span className="text-sm text-gray-500">
                              Deadline: {formatDate(call.deadline)}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 mb-3">{call.description || 'No description available'}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            <strong>Posted by:</strong> {call.institutionName || 'Unknown Institution'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600 dark:text-gray-300">No funding calls available at the moment.</p>
                  </div>
                )}
              </div>
            )}

            {selectedTab === 'researchers' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                  Platform Researchers
                </h3>
                {loading ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 dark:text-gray-300">Loading researchers...</p>
                  </div>
                ) : researchers.length > 0 ? (
                  researchers.map((researcher: any) => (
                    <div key={researcher.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                            {researcher.name}
                          </h4>
                          {researcher.title && (
                            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                              {researcher.title}
                            </p>
                          )}
                        </div>
                        <span className="bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full">
                          {typeof researcher.projectCount === 'number' ? researcher.projectCount : 0} Projects
                        </span>
                      </div>
                      
                      <p className="text-gray-600 dark:text-gray-300 mb-2">{researcher.institution || 'Independent Researcher'}</p>
                      
                      {researcher.bio && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                          {researcher.bio.substring(0, 150)}...
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex space-x-6">
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            <strong>{typeof researcher.projectCount === 'number' ? researcher.projectCount : 0}</strong> Research Projects
                          </span>
                          {researcher.createdAt && (
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              <strong>Member since:</strong> {formatDate(researcher.createdAt)}
                            </span>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => setSelectedResearcher(researcher)}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium px-3 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          >
                            View Profile
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600 dark:text-gray-300">No researchers found on the platform yet.</p>
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



      {/* Researcher Profile Modal */}
      <ResearcherProfileModal
        selectedResearcher={selectedResearcher}
        onClose={() => setSelectedResearcher(null)}
        projects={projects}
      />
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
