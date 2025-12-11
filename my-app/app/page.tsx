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

  // Initialize with mock data (no backend connections)
  useEffect(() => {
    const initializeData = () => {
      try {
        // Use mock data directly - no API calls
        setProjects([
          {
            id: 1,
            title: "AI-Driven Climate Change Analysis",
            academicName: "Dr. Ahmet Yılmaz",
            academicEmail: "ahmet.yilmaz@gtu.edu.tr",
            institution: "GTU Computer Engineering",
            description: "Using advanced machine learning algorithms including deep neural networks and ensemble methods to analyze global climate patterns, predict future temperature changes, and assess the impact of human activities on climate systems. This research integrates satellite data, weather station records, and oceanographic measurements.",
            fieldOfStudy: "Environmental Data Science",
            startDate: "2024-01-15",
            endDate: "2026-12-31",
            budget: "450,000 TL",
            collaborators: "Dr. Maria Santos (MIT), Prof. Chen Wei (Beijing University)",
            keywords: ["machine learning", "climate modeling", "environmental monitoring", "data analytics"],
            publications: ["Climate Prediction Using Deep Learning - Nature Climate Change 2024", "AI Methods in Environmental Science - Environmental Research 2024"],
            status: "ongoing",
            similarity: 92,
            sdgGoals: ["Climate Action", "Life on Land", "Clean Water and Sanitation"],
            createdAt: "2024-01-15T10:00:00Z"
          },
          {
            id: 2,
            title: "Smart City Infrastructure Optimization",
            academicName: "Prof. Dr. Elena Kowalski",
            academicEmail: "elena.kowalski@itu.edu.tr",
            institution: "ITU Smart Systems Engineering",
            description: "Developing IoT-based smart infrastructure systems for urban environments, focusing on traffic optimization, energy management, and citizen services. The project aims to create a comprehensive platform that integrates various city systems for improved efficiency and quality of life.",
            fieldOfStudy: "Smart Systems and IoT",
            startDate: "2023-09-01",
            endDate: "2025-08-31",
            budget: "680,000 TL",
            collaborators: "Dr. James Wilson (Stanford), Dr. Lisa Chen (NUS Singapore)",
            keywords: ["smart cities", "IoT", "urban planning", "optimization", "sustainability"],
            publications: ["IoT Infrastructure for Smart Cities - IEEE Smart Cities 2023"],
            status: "ongoing",
            similarity: 88,
            sdgGoals: ["Sustainable Cities and Communities", "Industry Innovation", "Clean Energy"],
            createdAt: "2023-09-01T09:00:00Z"
          },
          {
            id: 3,
            title: "Blockchain-Based Healthcare Data Management",
            academicName: "Dr. Mehmet Özkan",
            academicEmail: "mehmet.ozkan@hacettepe.edu.tr",
            institution: "Hacettepe University Medical Informatics",
            description: "Creating a secure, decentralized healthcare data management system using blockchain technology to ensure patient privacy while enabling seamless data sharing between healthcare providers. The system will support electronic health records, medical imaging, and telemedicine applications.",
            fieldOfStudy: "Medical Informatics and Cybersecurity",
            startDate: "2024-03-01",
            endDate: "2026-02-28",
            budget: "520,000 TL",
            collaborators: "Dr. Sarah Johnson (Johns Hopkins), Prof. Raj Patel (IIT Delhi)",
            keywords: ["blockchain", "healthcare", "cybersecurity", "data management", "privacy"],
            publications: ["Blockchain in Healthcare: A Systematic Review - Journal of Medical Internet Research 2024"],
            status: "ongoing",
            similarity: 85,
            sdgGoals: ["Good Health and Well-being", "Industry Innovation", "Partnerships for the Goals"],
            createdAt: "2024-03-01T11:30:00Z"
          }
        ]);
        
        setFundingCalls([
          {
            id: 1,
            title: "TÜBİTAK 1001 - Scientific and Technological Research Projects Support Program",
            institutionName: "TÜBİTAK",
            institutionEmail: "support@tubitak.gov.tr",
            description: "Supporting fundamental and applied research projects that contribute to the advancement of science and technology in Turkey. This program aims to foster innovation, encourage international collaboration, and develop human resources in science and technology fields.",
            fundingAmount: "100,000 - 800,000 TL per project",
            applicationDeadline: "2025-04-15",
            eligibility: "Turkish universities, public research institutions, and qualified private R&D centers. Principal investigators must hold a PhD and be affiliated with eligible institutions.",
            eligibilityCriteria: "PhD required, Turkish institution affiliation, previous research experience",
            categories: ["Basic Research", "Applied Research", "Experimental Development"],
            requirements: "Detailed project proposal, budget justification, CV of research team, ethics approval if applicable",
            contactInfo: "1001@tubitak.gov.tr | +90 312 468 53 00",
            website: "https://www.tubitak.gov.tr/tr/destekler/akademik/ulusal-destek-programlari/1001",
            applicationProcess: "Submit through TÜBİTAK online application system (ARDEB-OFIS). Applications undergo peer review and evaluation by expert panels.",
            evaluationCriteria: "Scientific excellence (40%), feasibility and methodology (30%), impact and relevance (20%), team qualifications (10%)",
            status: "open",
            sdgFocus: ["Quality Education", "Industry Innovation", "Climate Action", "Good Health and Well-being"],
            createdAt: "2024-01-10T08:00:00Z"
          },
          {
            id: 2,
            title: "EU Horizon Europe - Digital Europe Programme",
            institutionName: "EU Commission",
            institutionEmail: "digital-europe@ec.europa.eu",
            description: "Supporting digital transformation across Europe through strategic investments in supercomputing, artificial intelligence, cybersecurity, and digital skills. This program aims to strengthen Europe's digital sovereignty and competitiveness in the global digital economy.",
            fundingAmount: "€2M - €50M per project",
            applicationDeadline: "2025-06-20",
            eligibility: "Legal entities established in EU Member States, Horizon Europe associated countries, or specific third countries. Consortium of at least 3 partners from different eligible countries required.",
            eligibilityCriteria: "EU/Associated country entities, consortium requirement, legal entity validation",
            categories: ["AI and Robotics", "Cybersecurity", "High Performance Computing", "Digital Skills"],
            requirements: "Consortium agreement, detailed work plan, impact assessment, dissemination strategy, ethics self-assessment",
            contactInfo: "DIGITAL-CALLS@ec.europa.eu | +32 2 299 11 11",
            website: "https://digital-strategy.ec.europa.eu/en/activities/digital-programme",
            applicationProcess: "Submit via EU Funding & Tenders Portal. Two-stage evaluation process with external expert assessment and consensus review.",
            evaluationCriteria: "Excellence (30%), impact (30%), implementation quality and efficiency (40%)",
            status: "open",
            sdgFocus: ["Industry Innovation", "Quality Education", "Decent Work and Economic Growth", "Partnerships for the Goals"],
            createdAt: "2024-02-01T10:00:00Z"
          },
          {
            id: 3,
            title: "BAP Research Grant - Innovative Technology Solutions",
            institutionName: "ITU BAP Office",
            institutionEmail: "bap@itu.edu.tr",
            description: "Supporting innovative research projects by ITU faculty members and graduate students that address real-world technological challenges. Priority is given to interdisciplinary projects with commercial potential and social impact.",
            fundingAmount: "50,000 - 200,000 TL per project",
            applicationDeadline: "2025-03-30",
            eligibility: "ITU faculty members, postdoctoral researchers, and PhD students. Projects must be conducted within ITU facilities with appropriate supervision.",
            eligibilityCriteria: "ITU affiliation, academic supervision, institutional resources",
            categories: ["Engineering Innovation", "Information Technology", "Sustainable Technology", "Biomedical Engineering"],
            requirements: "Project proposal (max 20 pages), budget breakdown, supervisor approval, laboratory access confirmation",
            contactInfo: "bap@itu.edu.tr | +90 212 285 38 01",
            website: "https://bap.itu.edu.tr/",
            applicationProcess: "Internal ITU application system. Faculty committee review followed by external evaluation for projects >100K TL.",
            evaluationCriteria: "Innovation potential (25%), scientific merit (25%), feasibility (25%), expected impact (25%)",
            status: "open",
            sdgFocus: ["Industry Innovation", "Quality Education", "Sustainable Cities and Communities"],
            createdAt: "2024-01-20T14:00:00Z"
          }
        ]);

        setResearchers([
          {
            id: 1,
            name: "Dr. Ahmet Yılmaz",
            email: "ahmet.yilmaz@gtu.edu.tr",
            institution: "Gebze Technical University",
            title: "Associate Professor of Environmental Data Science",
            bio: "Dr. Yılmaz specializes in applying machine learning and artificial intelligence to environmental monitoring and climate change research. He has over 10 years of experience in developing predictive models for climate systems and has published extensively in top-tier journals. His research combines computer science with environmental science to address global sustainability challenges.",
            fieldOfStudy: "Environmental Data Science",
            researchInterests: ["Machine Learning", "Climate Modeling", "Environmental Monitoring", "Data Analytics"],
            achievements: ["Best Paper Award - ICML Environmental Applications 2023", "Young Researcher Award - Turkish Academy of Sciences 2022"],
            projectCount: 3,
            publicationCount: 25,
            hIndex: 15,
            createdAt: "2022-09-15T09:00:00Z"
          },
          {
            id: 2,
            name: "Prof. Dr. Elena Kowalski",
            email: "elena.kowalski@itu.edu.tr",
            institution: "Istanbul Technical University",
            title: "Professor of Smart Systems Engineering",
            bio: "Prof. Kowalski is a leading expert in smart city technologies and IoT systems. She has led multiple international projects on urban sustainability and has been instrumental in developing smart infrastructure solutions for major cities worldwide. Her interdisciplinary approach combines engineering, urban planning, and data science.",
            fieldOfStudy: "Smart Systems and IoT",
            researchInterests: ["Smart Cities", "IoT Systems", "Urban Analytics", "Sustainable Infrastructure"],
            achievements: ["IEEE Fellow 2021", "Smart Cities Innovation Award 2023", "EU Marie Curie Fellowship 2019-2021"],
            projectCount: 7,
            publicationCount: 82,
            hIndex: 28,
            createdAt: "2020-02-10T11:00:00Z"
          },
          {
            id: 3,
            name: "Dr. Mehmet Özkan",
            email: "mehmet.ozkan@hacettepe.edu.tr",
            institution: "Hacettepe University",
            title: "Assistant Professor of Medical Informatics",
            bio: "Dr. Özkan focuses on the intersection of healthcare and technology, particularly in cybersecurity and blockchain applications for medical data management. His work aims to improve patient care through secure and efficient health information systems while maintaining privacy and regulatory compliance.",
            fieldOfStudy: "Medical Informatics and Cybersecurity",
            researchInterests: ["Blockchain Technology", "Healthcare Cybersecurity", "Medical Data Management", "Health Information Systems"],
            achievements: ["Healthcare Innovation Award 2024", "HIMSS Research Grant Recipient 2023"],
            projectCount: 2,
            publicationCount: 18,
            hIndex: 12,
            createdAt: "2023-01-08T13:30:00Z"
          },
          {
            id: 4,
            name: "Dr. Sarah Chen",
            email: "sarah.chen@metu.edu.tr",
            institution: "Middle East Technical University",
            title: "Associate Professor of Renewable Energy Systems",
            bio: "Dr. Chen is an expert in renewable energy technologies with a focus on solar panel efficiency optimization and energy storage systems. Her research contributes to sustainable energy solutions and she actively collaborates with industry partners to translate research into practical applications.",
            fieldOfStudy: "Renewable Energy Engineering",
            researchInterests: ["Solar Energy", "Energy Storage", "Grid Integration", "Sustainable Technology"],
            achievements: ["Renewable Energy Research Excellence Award 2023", "TUBITAK Career Development Grant 2021"],
            projectCount: 4,
            publicationCount: 35,
            hIndex: 19,
            createdAt: "2021-08-22T10:15:00Z"
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  const [researchers, setResearchers] = useState<any[]>([]);
  const [selectedResearcher, setSelectedResearcher] = useState<any>(null);

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
      // Simple local search through mock data
      const query = searchQuery.toLowerCase();
      const matchedProjects = projects.filter(p => 
        p.title.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.fieldOfStudy.toLowerCase().includes(query)
      );
      const matchedCalls = fundingCalls.filter(c =>
        c.title.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        c.institutionName.toLowerCase().includes(query)
      );
      
      const combined = [
        ...matchedProjects.map((p: any) => ({ ...p, type: 'project' })),
        ...matchedCalls.map((c: any) => ({ ...c, type: 'funding-call' }))
      ];
      
      setSearchResults({
        combined,
        totalResults: combined.length
      });
      setSelectedTab('search-results');
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
                    <a href="/upload-project" className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 font-medium">
                      Add Project
                    </a>
                  )}
                  
                  {user.role === 'institution' && (
                    <a href="/upload-call" className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 font-medium">
                      Post Funding Call
                    </a>
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

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {user ? `Welcome back, ${user.name}!` : 'AI-Supported Project Management Platform'}
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            {user ? (
              user.role === 'academic' 
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
              disabled={searching || !searchQuery.trim()}
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
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
            Powered by FAISS vector search & OpenAI embeddings
          </p>
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
                My {user.role === 'academic' ? 'Projects' : 'Funding Calls'}
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
                            item.type === 'project' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {item.type === 'project' ? 'Research Project' : 'Funding Call'}
                          </span>
                          <h4 className="text-xl font-semibold text-gray-900 dark:text-white">{item.title}</h4>
                        </div>
                        <span className="bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full">
                          {item.status || 'Active'}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 mb-3">
                        {item.description?.substring(0, 200)}...
                      </p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {item.type === 'project' ? (
                              <>
                                <strong>{item.academicName || 'Unknown Researcher'}</strong> • {item.institution || 'Unknown Institution'}
                                <br />
                                <span className="text-xs">Field: {item.fieldOfStudy}</span>
                              </>
                            ) : (
                              <>
                                <strong>{item.institutionName || 'Unknown Institution'}</strong>
                                <br />
                                <span className="text-xs">Funding: {item.fundingAmount} • Deadline: {new Date(item.applicationDeadline).toLocaleDateString()}</span>
                              </>
                            )}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          {item.sdgGoals && item.sdgGoals.map((goal: string) => (
                            <span key={goal} className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded">
                              {goal}
                            </span>
                          ))}
                          {item.sdgFocus && item.sdgFocus.map((goal: string) => (
                            <span key={goal} className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded">
                              {goal}
                            </span>
                          ))}
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
                    My {user.role === 'academic' ? 'Projects' : 'Funding Calls'}
                  </h3>
                  {user.role === 'academic' ? (
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
                
                {user.role === 'academic' ? (
                  // Show user's projects
                  projects.filter(project => project.academicEmail === user.email).length > 0 ? (
                    projects.filter(project => project.academicEmail === user.email).map((project) => (
                      <div key={project.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="text-xl font-semibold text-gray-900 dark:text-white">{project.title}</h4>
                          <span className="bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full">
                            Active
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-3">
                          {project.description}
                        </p>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              <span className="font-medium">Field:</span> {project.fieldOfStudy}
                            </p>
                            {project.collaborators && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                <span className="font-medium">Collaborators:</span> {project.collaborators}
                              </p>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            {project.sdgGoals && project.sdgGoals.map((goal: string) => (
                              <span key={goal} className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded">
                                {goal}
                              </span>
                            ))}
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
                  // Show user's funding calls
                  fundingCalls.filter(call => call.institutionEmail === user.email).length > 0 ? (
                    fundingCalls.filter(call => call.institutionEmail === user.email).map((call) => (
                      <div key={call.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="text-xl font-semibold text-gray-900 dark:text-white">{call.title}</h4>
                          <span className="bg-purple-100 text-purple-800 text-sm px-3 py-1 rounded-full">
                            Open
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-3">
                          {call.description}
                        </p>
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
                          <div>
                            <span className="font-medium">Funding Amount:</span> {call.fundingAmount}
                          </div>
                          <div>
                            <span className="font-medium">Deadline:</span> {new Date(call.applicationDeadline).toLocaleDateString()}
                          </div>
                          <div>
                            <span className="font-medium">Eligibility:</span> {call.eligibilityCriteria}
                          </div>
                          <div className="flex space-x-2">
                            {call.sdgFocus && call.sdgFocus.map((goal: string) => (
                              <span key={goal} className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded">
                                {goal}
                              </span>
                            ))}
                          </div>
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
                    <div key={project.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-xl font-semibold text-gray-900 dark:text-white">{project.title}</h4>
                        <span className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                          {project.status || 'Active'}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 mb-3">{project.description}</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            <strong>{project.academicName || 'Unknown Researcher'}</strong> • {project.institution || 'Unknown Institution'}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            Field: {project.fieldOfStudy} • Created: {new Date(project.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          {project.sdgGoals && project.sdgGoals.map((goal: string) => (
                            <span key={goal} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                              {goal}
                            </span>
                          ))}
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
                          <span className="text-sm text-gray-500">
                            Deadline: {new Date(call.applicationDeadline).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 mb-3">{call.description}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            <strong>Funding:</strong> {call.fundingAmount}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            <strong>Posted by:</strong> {call.institutionName || 'Unknown Institution'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            <strong>Eligibility:</strong> {call.eligibility?.substring(0, 100)}...
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {call.sdgFocus && call.sdgFocus.map((goal: string) => (
                          <span key={goal} className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                            {goal}
                          </span>
                        ))}
                        {call.categories && call.categories.slice(0, 3).map((category: string) => (
                          <span key={category} className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded">
                            {category}
                          </span>
                        ))}
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
                    <div key={researcher.id || researcher.userId || researcher.email} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
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
                      
                      <p className="text-gray-600 dark:text-gray-300 mb-2">{researcher.institution}</p>
                      
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
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            <strong>Member since:</strong> {new Date(researcher.createdAt).getFullYear()}
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => setSelectedResearcher(researcher)}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
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

            {selectedTab === 'visualization' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm">
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
                  Project Relationship Graph
                </h3>
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-lg p-8 min-h-96 relative overflow-hidden">
                  {/* Dynamic Network Visualization */}
                  <div className="relative w-full h-full">
                    {/* Central Node - IntelliGraph */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg z-10">
                      IG
                    </div>
                    
                    {/* Dynamic Project Nodes */}
                    {projects.slice(0, 6).map((project, index) => {
                      // Generate positions in a circle around the center
                      const angle = (index * 360) / Math.min(projects.length, 6);
                      const radius = 35; // Distance from center
                      const x = 50 + radius * Math.cos((angle * Math.PI) / 180);
                      const y = 50 + radius * Math.sin((angle * Math.PI) / 180);
                      
                      // Assign colors based on field of study
                      const getColorByField = (field: string) => {
                        const fieldColors: { [key: string]: string } = {
                          'Environmental Data Science': 'bg-green-500',
                          'Smart Systems and IoT': 'bg-purple-500',
                          'Medical Informatics and Cybersecurity': 'bg-red-500',
                          'Renewable Energy Engineering': 'bg-orange-500',
                          'Computer Science': 'bg-blue-500',
                          'Engineering': 'bg-indigo-500'
                        };
                        return fieldColors[field] || 'bg-gray-500';
                      };

                      return (
                        <div key={project.id}>
                          {/* Connection Line */}
                          <div 
                            className="absolute w-0.5 bg-gray-300 dark:bg-gray-500 opacity-50"
                            style={{
                              left: '50%',
                              top: '50%',
                              transformOrigin: 'top',
                              height: `${radius * 4}px`,
                              transform: `rotate(${angle + 90}deg)`
                            }}
                          />
                          {/* Project Node */}
                          <div 
                            className={`absolute w-12 h-12 ${getColorByField(project.fieldOfStudy || 'Computer Science')} rounded-full flex items-center justify-center text-white text-xs font-semibold shadow-md hover:scale-110 transition-transform cursor-pointer`}
                            style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
                            title={`${project.title} - ${project.academicName}`}
                          >
                            {project.title.split(' ').slice(0, 2).map((word: string) => word[0]).join('')}
                          </div>
                          {/* Project Label */}
                          <div 
                            className="absolute text-xs text-gray-600 dark:text-gray-300 font-medium max-w-20 text-center"
                            style={{ 
                              left: `${x}%`, 
                              top: `${y + 8}%`, 
                              transform: 'translateX(-50%)'
                            }}
                          >
                            {project.title.length > 15 ? project.title.substring(0, 15) + '...' : project.title}
                          </div>
                        </div>
                      );
                    })}

                    {/* Dynamic Funding Call Nodes */}
                    {fundingCalls.slice(0, 4).map((call, index) => {
                      // Position funding calls in corners and sides
                      const positions = [
                        { x: 85, y: 25 }, // Top right
                        { x: 15, y: 25 }, // Top left  
                        { x: 85, y: 75 }, // Bottom right
                        { x: 15, y: 75 }  // Bottom left
                      ];
                      const pos = positions[index] || { x: 50, y: 20 };

                      return (
                        <div key={`funding-${call.id}`}>
                          {/* Connection Line to center */}
                          <div 
                            className="absolute w-0.5 bg-yellow-400 opacity-70"
                            style={{
                              left: '50%',
                              top: '50%',
                              transformOrigin: 'top',
                              height: `${Math.sqrt(Math.pow(pos.x - 50, 2) + Math.pow(pos.y - 50, 2)) * 4}px`,
                              transform: `rotate(${Math.atan2(pos.y - 50, pos.x - 50) * 180 / Math.PI + 90}deg)`
                            }}
                          />
                          {/* Funding Call Node */}
                          <div 
                            className="absolute w-10 h-10 bg-yellow-500 flex items-center justify-center text-white text-xs font-semibold shadow-md hover:scale-110 transition-transform cursor-pointer"
                            style={{ 
                              left: `${pos.x}%`, 
                              top: `${pos.y}%`, 
                              transform: 'translate(-50%, -50%) rotate(45deg)',
                            }}
                            title={`${call.title} - ${call.institutionName}`}
                          >
                            <span style={{ transform: 'rotate(-45deg)' }}>₺</span>
                          </div>
                          {/* Funding Call Label */}
                          <div 
                            className="absolute text-xs text-gray-600 dark:text-gray-300 font-medium max-w-20 text-center"
                            style={{ 
                              left: `${pos.x}%`, 
                              top: `${pos.y + 8}%`, 
                              transform: 'translateX(-50%)'
                            }}
                          >
                            {call.institutionName}
                          </div>
                        </div>
                      );
                    })}

                    {/* Dynamic Researcher Connections */}
                    {researchers.slice(0, 3).map((researcher, index) => {
                      const positions = [
                        { x: 25, y: 50 }, // Left
                        { x: 75, y: 50 }, // Right
                        { x: 50, y: 85 }  // Bottom
                      ];
                      const pos = positions[index] || { x: 30, y: 50 };

                      return (
                        <div key={`researcher-${researcher.id || researcher.userId || researcher.email}`}>
                          {/* Researcher Node */}
                          <div 
                            className="absolute w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-semibold shadow-md hover:scale-110 transition-transform cursor-pointer"
                            style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
                            title={`${researcher.name} - ${researcher.institution}`}
                          >
                            {researcher.name.split(' ').map((word: string) => word[0]).join('').substring(0, 2)}
                          </div>
                          {/* Researcher Label */}
                          <div 
                            className="absolute text-xs text-gray-600 dark:text-gray-300 font-medium max-w-16 text-center"
                            style={{ 
                              left: `${pos.x}%`, 
                              top: `${pos.y + 6}%`, 
                              transform: 'translateX(-50%)'
                            }}
                          >
                            {researcher.name.split(' ')[1] || researcher.name}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Dynamic Legend */}
                  <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg p-3 shadow-md">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      Live Data ({projects.length + fundingCalls.length + researchers.length} nodes)
                    </h4>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                        <span className="text-xs text-gray-600 dark:text-gray-300">Platform Hub</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-gray-600 dark:text-gray-300">{projects.length} Projects</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-yellow-500 transform rotate-45"></div>
                        <span className="text-xs text-gray-600 dark:text-gray-300">{fundingCalls.length} Funding Calls</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                        <span className="text-xs text-gray-600 dark:text-gray-300">{researchers.length} Researchers</span>
                      </div>
                    </div>
                  </div>

                  {/* Interaction Hints */}
                  <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-lg p-2 shadow-md">
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      💡 Hover nodes for details
                    </p>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Real-time visualization • {projects.length} Projects • {fundingCalls.length} Funding Calls • {researchers.length} Researchers
                  </p>
                </div>
              </div>
            )}
          </div>
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

      {/* Researcher Profile Modal */}
      {selectedResearcher && (
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
                  onClick={() => setSelectedResearcher(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>

              {/* Contact Info */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href={`mailto:${selectedResearcher.email}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                    {selectedResearcher.email}
                  </a>
                </div>
              </div>

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
                    {selectedResearcher.createdAt ? new Date(selectedResearcher.createdAt).getFullYear() : 'N/A'}
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
                  {projects.filter(p => p.academicEmail === selectedResearcher.email).length > 0 ? (
                    projects.filter(p => p.academicEmail === selectedResearcher.email).map((project) => (
                      <div key={project.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                          {project.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                          {project.description.substring(0, 100)}...
                        </p>
                        <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
                          <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded">
                            {project.fieldOfStudy}
                          </span>
                          <span>{project.status}</span>
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
                    window.location.href = `mailto:${selectedResearcher.email}?subject=Research Inquiry`;
                  }}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Contact via Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
