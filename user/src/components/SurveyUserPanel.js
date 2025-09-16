import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

const SurveyUserPanel = () => {
  const [question, setQuestion] = useState(null);
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [departmentSlug, setDepartmentSlug] = useState('');
  const [countdown, setCountdown] = useState(3);
  const [selectedEmoji, setSelectedEmoji] = useState(null);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Function to read slug from text file
  const readSlugFromFile = async () => {
    try {
      
      const response = await fetch(`${API_BASE_URL}/get-slug`);
      if (response.ok) {
        const data = await response.json();
        return data.slug || 'it-department'; // default fallback
      }
      return 'it-department'; // default fallback
    } catch (err) {
      console.error('Failed to read slug file:', err);
      return 'it-department'; // default fallback
    }
  };

  useEffect(() => {
    const extractSlugFromUrl = async () => {
      const pathname = window.location.pathname;
      const urlParts = pathname.split('/').filter(part => part.length > 0);
      let slug = '';
      
      if (urlParts.length === 0) {
        // If no slug in URL, read from file
        slug = await readSlugFromFile();
      } else if (urlParts.length === 1) {
        slug = urlParts[0];
      } else {
        slug = urlParts[urlParts.length - 1];
      }
      
      slug = slug.split('?')[0].split('#')[0];
      return slug || await readSlugFromFile(); // fallback to file if empty
    };
    
    const initializeSlug = async () => {
      const slug = await extractSlugFromUrl();
      setDepartmentSlug(slug);
    };
    
    initializeSlug();
  }, []);

  
  // Make API_BASE_URL dynamic to work across network
  const getApiBaseUrl = () => {
    // If in development and accessing from another machine, use the server's IP
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
    // For network access, construct URL using current hostname but backend port
    return `http://${hostname}:5000/api`;
  };
  
  const API_BASE_URL = getApiBaseUrl();
  
  // Updated emoji options with IDs for better tracking
  const emojiOptions = [
    { id: 1, emoji: '😍', label: 'Excellent', color: 'bg-green-100 border-green-300 hover:bg-green-200' },
    { id: 2, emoji: '😊', label: 'Good', color: 'bg-blue-100 border-blue-300 hover:bg-blue-200' },
    { id: 3, emoji: '😐', label: 'Okay', color: 'bg-yellow-100 border-yellow-300 hover:bg-yellow-200' },
    { id: 4, emoji: '😞', label: 'Poor', color: 'bg-orange-100 border-orange-300 hover:bg-orange-200' },
    { id: 5, emoji: '😡', label: 'Terrible', color: 'bg-red-100 border-red-300 hover:bg-red-200' }
  ];
  
  // Improved department slug extraction
  useEffect(() => {
    const extractSlugFromUrl = () => {
      const pathname = window.location.pathname;
      console.log('Current pathname:', pathname);
      
      // Handle different URL patterns:
      // /survey/it-department
      // /department/it-department  
      // /it-department
      // or just the slug at the end
      
      const urlParts = pathname.split('/').filter(part => part.length > 0);
      console.log('URL parts:', urlParts);
      
      let slug = '';
      
      if (urlParts.length === 0) {
        // Root path, use default
        slug = 'it-department';
      } else if (urlParts.length === 1) {
        // Direct slug: /it-department
        slug = urlParts[0];
      } else {
        // Multiple parts: /survey/it-department or /department/it-department
        slug = urlParts[urlParts.length - 1];
      }
      
      // Clean the slug (remove any query parameters or hash)
      slug = slug.split('?')[0].split('#')[0];
      
      console.log('Extracted slug:', slug);
      return slug || 'it-department';
    };
    
    const slug = extractSlugFromUrl();
    setDepartmentSlug(slug);
  }, []);
  
  // Auto-refresh countdown after submission
  useEffect(() => {
    let interval;
    if (submitted && countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (submitted && countdown === 0) {
      window.location.reload();
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [submitted, countdown]);
  
  // Load active question for department with better error handling
  const loadActiveQuestion = async (slug) => {
    if (!slug) return;
    
    try {
      setLoading(true);
      setError('');
      
      console.log('Loading question for slug:', slug);
      console.log('API URL:', `${API_BASE_URL}/departments/${slug}/active-question`);
      
      const response = await fetch(`${API_BASE_URL}/departments/${slug}/active-question`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`No active survey found for department: ${slug}`);
        } else if (response.status === 500) {
          throw new Error('Server error occurred. Please try again.');
        } else if (!navigator.onLine) {
          throw new Error('No internet connection. Please check your network.');
        } else {
          throw new Error(`Unable to load survey (Error: ${response.status})`);
        }
      }
      
      const data = await response.json();
      console.log('Question data:', data);
      setQuestion(data);
      
      // Extract department name from slug for display
      const deptName = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      setDepartment(deptName);
      
    } catch (err) {
      console.error('Failed to load question:', err);
      
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('Cannot connect to survey server. Please check if the server is running and accessible.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Submit answer with improved error handling and network detection
  const submitAnswer = async (emojiOption) => {
    if (!question || submitting) return;
    
    try {
      setSubmitting(true);
      setSelectedEmoji(emojiOption.id);
      setError('');
      
      console.log('Submitting answer:', { emoji: emojiOption.emoji, emojiId: emojiOption.id });
      
      const response = await fetch(`${API_BASE_URL}/questions/${question.QuestionID}/answers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          emoji: emojiOption.emoji,
          emojiId: emojiOption.id
        })
      });
      
      if (!response.ok) {
        let errorMessage = 'Failed to submit answer';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          if (response.status === 500) {
            errorMessage = 'Server error occurred while submitting';
          } else if (response.status === 404) {
            errorMessage = 'Survey question not found';
          } else {
            errorMessage = `Submit failed (Error: ${response.status})`;
          }
        }
        
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      console.log('Submit result:', result);
      
      setSubmitted(true);
      setCountdown(3);
      
    } catch (err) {
      console.error('Failed to submit answer:', err);
      
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('Cannot connect to survey server to submit your response.');
      } else {
        setError(err.message);
      }
      setSelectedEmoji(null);
    } finally {
      setSubmitting(false);
    }
  };
  
  // Load question when component mounts or slug changes
  useEffect(() => {
    if (departmentSlug) {
      loadActiveQuestion(departmentSlug);
    }
  }, [departmentSlug]);
  
  // Retry function for error state
  const handleRetry = () => {
    setError('');
    setSelectedEmoji(null);
    loadActiveQuestion(departmentSlug);
  };
  
  // Debug info (remove in production)
  
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
      <div className="text-center">
      <div className="relative">
      <Loader2 className="w-16 h-16 text-white animate-spin mx-auto mb-4" />
      <div className="absolute inset-0 w-16 h-16 border-4 border-white border-opacity-20 rounded-full mx-auto animate-pulse"></div>
      </div>
      <p className="text-white text-xl font-medium">Loading survey...</p>
      <p className="text-white text-sm opacity-75 mt-2">Department: {departmentSlug}</p>
      </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-900 flex items-center justify-center">
      <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
      <div className="text-center">
      <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Survey Unavailable</h2>
      <p className="text-gray-600 mb-4">{error}</p>
      <div className="text-sm text-gray-500 mb-6">
      <p>Department: {departmentSlug}</p>
      <p>Server: {API_BASE_URL}</p>
      </div>
      <button
      onClick={handleRetry}
      className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-all duration-200 flex items-center justify-center mx-auto gap-2"
      >
      <RefreshCw className="w-4 h-4" />
      Try Again
      </button>
      </div>
      </div>
      </div>
    );
  }
  
  // Success state with countdown
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 flex items-center justify-center">
      <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
      <div className="text-center">
      <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
      <h2 className="text-3xl font-bold text-gray-800 mb-2">Thank You!</h2>
      <p className="text-gray-600 mb-2">Your feedback has been submitted successfully.</p>
      <p className="text-sm text-gray-500 mb-6">Department: {department}</p>
      
      {/* Countdown display */}
      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-4">
      <p className="text-green-700 font-medium mb-2">Waiting for next employee</p>
      <div className="flex items-center justify-center">
      <div className="relative">
      <Loader2 className="w-6 h-6 text-green-600 animate-spin mr-2" />
      <div className="absolute inset-0 w-6 h-6 border-2 border-green-600 border-opacity-20 rounded-full animate-pulse"></div>
      </div>
      <span className="text-green-600 font-semibold text-lg">
      Refreshing in {countdown}...
      </span>
      </div>
      </div>
      // need to change this path
      <p className="text-xs text-gray-400">
      The page will automatically refresh for the next person
      </p>
      </div>
      </div>
      </div>
    );
  }
  
  // Main survey interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 relative overflow-hidden">
    {/* Animated background elements */}
    <div className="absolute inset-0 overflow-hidden">
    <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 opacity-20 rounded-full animate-pulse"></div>
    <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-purple-500 to-indigo-600 opacity-20 rounded-full animate-pulse" style={{ animationDelay: '3s' }}></div>
    </div>
    
    {/* Content */}
    <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
    <div className="max-w-2xl mx-auto">
    
    {/* Header */}
    <div className="text-center mb-8">
    <h1 className="text-5xl font-bold text-white mb-2 drop-shadow-lg">
    Happiness Survey
    </h1>
    <p className="text-white text-2xl drop-shadow-md opacity-90">{department} Department</p>
    <div className="w-20 h-1 bg-white bg-opacity-50 mx-auto mt-4 rounded-full"></div>
    </div>
    
    {/* Survey Card */}
    <div
    className="bg-white bg-opacity-0.3 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white border-opacity-50 relative overflow-hidden"
    style={{
      backgroundImage: "url('..1/logo.png')",
      backgroundSize: "cover",
      backgroundPosition: "bottom",
      backgroundRepeat: "no-repeat",
      opacity: 1 // Add this line - adjust value between 0-1
    }}
    >
    {/* Question */}
    <div className="mb-8">
    <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center leading-relaxed">
    {question?.QuestionText}
    </h2>
    <p className="text-gray-600 text-center">
    Please select your response:
    </p>
    </div>
    
    {/* Emoji Options */}
    <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-6">
    {emojiOptions.map((option) => (
      <button
      key={option.id}
      onClick={() => submitAnswer(option)}
      disabled={submitting}
      className={`
                    flex flex-col items-center p-6 rounded-xl border-2 transition-all duration-300 
                    transform hover:scale-105 hover:shadow-lg active:scale-95
                    ${submitting && selectedEmoji === option.id ? 'scale-95 opacity-75' : ''}
                    ${option.color}
                    disabled:cursor-not-allowed
                    focus:outline-none focus:ring-4 focus:ring-blue-300
                  `}
        >
        <span className="text-5xl mb-3 select-none">
        {option.emoji}
        </span>
        <span className="text-sm text-gray-700 font-medium">
        {option.label}
        </span>
        {submitting && selectedEmoji === option.id && (
          <Loader2 className="w-4 h-4 text-gray-600 animate-spin mt-2" />
        )}
        </button>
      ))}
      </div>
      
      {/* Submitting indicator */}
      {submitting && (
        <div className="text-center py-4">
        <div className="flex items-center justify-center mb-2">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin mr-2" />
        <span className="text-gray-700 font-medium">Submitting your response...</span>
        </div>
        <div className="w-32 h-2 bg-gray-200 rounded-full mx-auto overflow-hidden">
        <div className="h-full bg-blue-600 rounded-full animate-pulse"></div>
        </div>
        </div>
      )}
      
      {/* Instructions */}
      <div className="text-center text-sm text-gray-500 mt-6">
      <p className="mb-1">Click on any emoji to submit your feedback</p>
      <p className="text-xs">Your response is anonymous and helps us improve our services</p>
      </div>
      </div>
      
      {/* Footer */}
      <div className="text-center mt-8">
      <p className="text-white text-sm drop-shadow-md opacity-75">
      Thank you for taking the time to share your feedback
      </p>
      </div>
      </div>
      </div>
      
      {/* Debug info - Remove this in production */}
      </div>
    );
  };
  
  export default SurveyUserPanel;