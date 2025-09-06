import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import {
  CheckCircle, Loader2, RefreshCw, Lock,
  BarChart3, History, Download,
  Building, LogOut, Eye, EyeOff
} from 'lucide-react';

const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  return `http://${hostname}:5000/api`;
};


const EMOJI_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA726', '#AB47BC'];

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize="12"
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};
// Password Input Component with Toggle
const PasswordInput = ({ value, onChange, placeholder, required = false, minLength, className = "w-full p-2 pr-10 border rounded-md" }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <input
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={className}
        required={required}
        minLength={minLength}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
      >
        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
};

// Main App Component
const App = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [token, setToken] = useState('');
  const [userLevel, setUserLevel] = useState(2);
  const [username, setUsername] = useState('');

  const verifyToken = async (token) => {
    try {
      const API_BASE_URL = getApiBaseUrl();
      const response = await fetch(`${API_BASE_URL}/admin/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserLevel(data.userLevel);
        setUsername(data.username);
        setIsAdmin(true);
      } else {
        handleLogout();
      }
    } catch (err) {
      handleLogout();
      console.error('Token verification failed:', err);
    }
  };

  const handleLoginSuccess = (token, userData) => {
    setToken(token);
    setUserLevel(userData.userLevel);
    setUsername(userData.username);
    setIsAdmin(true);
  };

  const handleLogout = () => {
    setToken('');
    setUserLevel(2);
    setUsername('');
    setIsAdmin(false);
  };

  if (isAdmin) {
    return <AdminDashboard onLogout={handleLogout} userLevel={userLevel} username={username} token={token} />;
  } else {
    return <SurveyUserPanel onAdminLogin={handleLoginSuccess} />;
  }
};

// User Panel Component
const SurveyUserPanel = ({ onAdminLogin }) => {
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
  const [clickCount, setClickCount] = useState(0);
  const [showAdminButton, setShowAdminButton] = useState(false);

  const API_BASE_URL = getApiBaseUrl();

  // Function to read slug from text file
  const readSlugFromFile = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/get-slug`);
      if (response.ok) {
        const data = await response.json();
        return data.slug || '';
      }
      return '';
    } catch (err) {
      console.error('Failed to read slug file:', err);
      return '';
    }
  };

  useEffect(() => {
    const extractSlugFromUrl = async () => {
      const pathname = window.location.pathname;
      const urlParts = pathname.split('/').filter(part => part.length > 0);
      let slug = '';

      if (urlParts.length === 0) {
        slug = await readSlugFromFile();
      } else if (urlParts.length === 1) {
        slug = urlParts[0];
      } else {
        slug = urlParts[urlParts.length - 1];
      }

      slug = slug.split('?')[0].split('#')[0];
      return slug || await readSlugFromFile();
    };

    const initializeSlug = async () => {
      const slug = await extractSlugFromUrl();
      setDepartmentSlug(slug);
    };

    initializeSlug();
  }, []);

  const emojiOptions = [
    { id: 1, emoji: '😍', label: 'Excellent විශිෂ්ටයි', color: 'bg-green-100 border-green-300 hover:bg-green-200' },
    { id: 2, emoji: '😊', label: 'Good හොඳයි ', color: 'bg-blue-100 border-blue-300 hover:bg-blue-200' },
    { id: 3, emoji: '😐', label: 'Okay සාමාන්‍යයි', color: 'bg-yellow-100 border-yellow-300 hover:bg-yellow-200' },
    { id: 4, emoji: '😞', label: 'Bad අකැමතියි', color: 'bg-orange-100 border-orange-300 hover:bg-orange-200' },
    { id: 5, emoji: '😡', label: 'Poor දුර්වලයි', color: 'bg-red-100 border-red-300 hover:bg-red-200' }
  ];

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

  const handlePanelClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);

    if (newCount >= 5) {
      setShowAdminButton(true);
    }
  };

  const loadActiveQuestion = async (slug) => {
    if (!slug) return;

    try {
      setLoading(true);
      setError('');

      // First, get the department information by slug
      const deptResponse = await fetch(`${API_BASE_URL}/departments/slug/${slug}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      let departmentName = '';
      if (deptResponse.ok) {
        const departmentData = await deptResponse.json();
        departmentName = departmentData.name;
        setDepartment(departmentName);
      } else {
        // Fallback to formatted slug if department not found
        departmentName = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        setDepartment(departmentName);
      }

      // Now get the active question for this department
      const response = await fetch(`${API_BASE_URL}/departments/${slug}/active-question`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`No active survey found for ${departmentName} department`);
        } else if (response.status === 500) {
          throw new Error('Server error occurred. Please try again.');
        } else if (!navigator.onLine) {
          throw new Error('No internet connection. Please check your network.');
        } else {
          throw new Error(`Unable to load survey (Error: ${response.status})`);
        }
      }

      const data = await response.json();
      setQuestion(data);

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

  const submitAnswer = async (emojiOption) => {
    if (!question || submitting) return;

    try {
      setSubmitting(true);
      setSelectedEmoji(emojiOption.id);
      setError('');

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

  useEffect(() => {
    if (departmentSlug) {
      loadActiveQuestion(departmentSlug);
    }
  }, [departmentSlug]);

  const handleRetry = () => {
    setError('');
    setSelectedEmoji(null);
    loadActiveQuestion(departmentSlug);
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const response = await fetch(`${API_BASE_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });

      if (response.ok) {
        const data = await response.json();
        onAdminLogin(data.token, data);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <Loader2 className="w-16 h-16 text-white animate-spin mx-auto mb-4" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-white border-opacity-20 rounded-full mx-auto animate-pulse"></div>
          </div>
          <p className="text-white text-xl font-medium">Loading survey...</p>
          <p className="text-white text-sm opacity-75 mt-2">
            {department || `Department: ${departmentSlug}`}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center cursor-pointer"
        onClick={handlePanelClick}
      >
        <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Welcome!</h2>

            <div className="space-y-4 text-gray-600">
              <p className="text-lg">Thank you for visiting our feedback system</p>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <p className="font-medium text-blue-800 mb-2">
                  {department || 'Department Not Found'}
                </p>
                {!department && (
                  <p className="text-sm text-blue-600">
                    Slug: {departmentSlug}
                  </p>
                )}
              </div>

              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                <p className="text-sm text-yellow-800">{error}</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <button
                onClick={handleRetry}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center justify-center mx-auto gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Check for Updates
              </button>

              {showAdminButton && (
                <button
                  onClick={() => setShowAdminLogin(!showAdminLogin)}
                  className="fixed top-4 right-4 z-50 overflow-hidden bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition-all duration-200 flex items-center gap-2 shadow-lg animate-pulse"
                >
                  <span className="relative z-10 flex items-center gap-1"></span>
                  <Lock className="w-4 h-4" />
                  <span className="text-sm">Admin</span>
                </button>
              )}
            </div>

            {showAdminLogin && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-800 mb-3">Admin Login</h3>
                {loginError && (
                  <div className="mb-3 p-2 bg-red-100 text-red-700 rounded-md text-sm">
                    {loginError}
                  </div>
                )}
                <form onSubmit={handleAdminLogin}>
                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder="Username"
                      value={loginForm.username}
                      onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                      className="w-full p-2 border rounded-md text-sm"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <PasswordInput
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      placeholder="Password"
                      required={true}
                      className="w-full p-2 pr-10 border rounded-md text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 text-sm"
                  >
                    {loginLoading ? 'Logging in...' : 'Login'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 flex items-center justify-center">
        <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Thank You!</h2>
            <p className="text-gray-600 mb-2">Your feedback has been submitted successfully.</p>
            <p className="text-sm text-gray-500 mb-6">Department: {department}</p>

            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-4">
              <p className="text-green-700 font-medium mb-2">Waiting for next employee</p>
              <div className="flex items-center justify-center">
                <div className="relative">
                  <Loader2 className="w-6 h-6 text-green-600 animate-spin mr-2" />
                </div>
                <span className="text-green-600 font-semibold text-lg">
                  Refreshing in {countdown}...
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-400">
              The page will automatically refresh for the next person
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 relative overflow-hidden"
      onClick={handlePanelClick}
    >
      {showAdminButton && (
        <button
          onClick={() => setShowAdminLogin(!showAdminLogin)}
          className="fixed top-4 right-4 z-50 overflow-hidden bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition-all duration-200 flex items-center gap-2 shadow-lg animate-pulse"                >
          <span className="relative z-10 flex items-center gap-1"></span>
          <Lock className="w-4 h-4" />
          <span className="text-sm">Admin</span>
        </button>
      )}

      {showAdminLogin && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Admin Login</h3>
              <button
                onClick={() => setShowAdminLogin(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {loginError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                {loginError}
              </div>
            )}

            <form onSubmit={handleAdminLogin}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-1">Username</label>
                <input
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-medium mb-1">Password</label>
                <PasswordInput
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  required={true}
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loginLoading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 opacity-20 rounded-full animate-pulse"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-purple-500 to-indigo-600 opacity-20 rounded-full animate-pulse" style={{ animationDelay: '3s' }}></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-white mb-2 drop-shadow-lg">
              Happiness Survey
            </h1>
            <p className="text-white text-2xl drop-shadow-md opacity-90">{department} Department</p>
            <div className="w-20 h-1 bg-white bg-opacity-50 mx-auto mt-4 rounded-full"></div>
          </div>

          <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white border-opacity-50 relative overflow-hidden">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center leading-relaxed whitespace-pre-wrap">
                {question?.QuestionText}
              </h2>
              <p className="text-gray-600 text-center">
                Please select your response:
              </p>
            </div>

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

            <div className="text-center text-sm text-gray-500 mt-6">
              <p className="mb-1">Click on any emoji to submit your feedback</p>
              <p className="text-xs">Your response is anonymous and helps us improve our services</p>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-white text-sm drop-shadow-md opacity-75">
              Thank you for taking the time to share your feedback
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Admin Dashboard Component
const AdminDashboard = ({ onLogout, userLevel, username }) => {
  const [activeTab, setActiveTab] = useState(userLevel === 1 ? 'departments' : 'questions');
  const [departments, setDepartments] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [newDepartment, setNewDepartment] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [historyData, setHistoryData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [selectedDepartmentForHistory, setSelectedDepartmentForHistory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [selectedDepartmentForReports, setSelectedDepartmentForReports] = useState('');
  const [filteredReports, setFilteredReports] = useState([]);
  const [bulkQuestionMode, setBulkQuestionMode] = useState(false);
  const [bulkQuestionText, setBulkQuestionText] = useState('');
  const [registerForm, setRegisterForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    userLevel: 2
  });

  const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
    return `http://${hostname}:5000/api`;
  };

  const API_BASE_URL = getApiBaseUrl();
  const submitBulkQuestion = async () => {
    if (!bulkQuestionText.trim()) {
      setError('Question text is required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE_URL}/questions/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionText: bulkQuestionText.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(data.message);
        setBulkQuestionText('');
        setBulkQuestionMode(false);
        await loadQuestions(); // Refresh the questions list
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add bulk question');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  const loadDepartments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/departments`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setDepartments(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      console.error('Failed to load departments:', err);
      setDepartments([]);
      setError('Failed to load departments: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/questions`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setQuestions(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      console.error('Failed to load questions:', err);
      setQuestions([]);
      setError('Failed to load questions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadHistoryData = async (departmentId = '', startDate = '', endDate = '') => {
    try {
      setLoading(true);
      let url = `${API_BASE_URL}/reports/history`;
      const params = new URLSearchParams();

      if (departmentId) params.append('departmentId', departmentId);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setHistoryData(Array.isArray(data) ? data : []);
      setFilteredData(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      console.error('Failed to load history data:', err);
      setHistoryData([]);
      setFilteredData([]);
      setError('Failed to load history data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateDepartment = async (id, newName) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response = await fetch(`${API_BASE_URL}/departments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() })
      });

      if (response.ok) {
        setSuccess('Department updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
        await loadDepartments();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update department');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteDepartment = async (id) => {
    if (!window.confirm('Are you sure you want to delete this department? This cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response = await fetch(`${API_BASE_URL}/departments/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSuccess('Department deleted successfully!');
        setTimeout(() => setSuccess(''), 3000);
        await loadDepartments();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete department');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  const exportToPDF = async () => {
    try {
      setExportLoading(true);

      let url = `${API_BASE_URL}/reports/export-pdf`;
      const params = new URLSearchParams();

      if (selectedDepartmentForHistory) params.append('departmentId', selectedDepartmentForHistory);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      // Create a hidden anchor tag to trigger the download
      const link = document.createElement('a');
      link.href = url;

      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const deptName = selectedDepartmentForHistory ?
        departments.find(d => d.DepartmentID == selectedDepartmentForHistory)?.Name || 'Selected' : 'All';

      link.download = `Survey_Report_${deptName}_${dateStr}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      console.error('PDF export failed:', err);
      setError('PDF export failed: ' + err.message);
    } finally {
      setExportLoading(false);
    }
  };
  const exportToExcel = async () => {
    try {
      setExportLoading(true);

      let url = `${API_BASE_URL}/reports/export`;
      const params = new URLSearchParams();

      if (selectedDepartmentForHistory) params.append('departmentId', selectedDepartmentForHistory);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const deptName = selectedDepartmentForHistory ?
        departments.find(d => d.DepartmentID == selectedDepartmentForHistory)?.Name || 'Selected' : 'All';

      link.download = `Survey_Report_${deptName}_${dateStr}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(downloadUrl);

    } catch (err) {
      console.error('Export failed:', err);
      setError('Export failed: ' + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  const handleFilterChange = () => {
    loadHistoryData(selectedDepartmentForHistory, startDate, endDate);
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/reports`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const processedReports = data.map(report => {
        const emojiCounts = {
          1: 0, // Excellent
          2: 0, // Good
          3: 0, // Okay
          4: 0, // Bad
          5: 0  // Poor
        };

        if (report.responses && Array.isArray(report.responses)) {
          report.responses.forEach(response => {
            const emojiId = response.EmojiID;
            if (emojiCounts.hasOwnProperty(emojiId)) {
              emojiCounts[emojiId] = response.Count || 0;
            }
          });
        }

        const emojiData = [
          { emoji: '😍', label: 'Excellent', count: emojiCounts[1], id: 1 },
          { emoji: '😊', label: 'Good', count: emojiCounts[2], id: 2 },
          { emoji: '😐', label: 'Okay', count: emojiCounts[3], id: 3 },
          { emoji: '😞', label: 'Bad', count: emojiCounts[4], id: 4 },
          { emoji: '😡', label: 'Poor', count: emojiCounts[5], id: 5 }
        ];

        return {
          department: report.department,
          question: report.question,
          totalResponses: report.totalResponses || 0,
          responses: report.responses || [],
          emojiData: emojiData
        };
      });

      setReports(processedReports);
      setFilteredReports(processedReports);
      setError('');
    } catch (err) {
      console.error('Failed to load reports:', err);
      setReports([]);
      setFilteredReports([]);
      setError('Failed to load reports: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReportFilter = () => {
    if (!selectedDepartmentForReports) {
      setFilteredReports(reports);
    } else {
      const filtered = reports.filter(report =>
        report.department === selectedDepartmentForReports
      );
      setFilteredReports(filtered);
    }
  };

  useEffect(() => {
    handleReportFilter();
  }, [selectedDepartmentForReports, reports]);

  const addDepartment = async () => {
    if (!newDepartment.trim()) {
      setError('Department name is required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE_URL}/departments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDepartment.trim() })
      });

      if (response.ok) {
        setNewDepartment('');
        setSuccess('Department added successfully!');
        setTimeout(() => setSuccess(''), 3000);
        await loadDepartments();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add department');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = async () => {
    if (!selectedDepartment || !newQuestion.trim()) {
      setError('Department and question text are required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const dept = departments.find(d => d.DepartmentID == selectedDepartment);
      if (!dept) {
        throw new Error('Department not found');
      }

      const response = await fetch(`${API_BASE_URL}/departments/${dept.URLSlug}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionText: newQuestion.trim() })
      });

      if (response.ok) {
        setNewQuestion('');
        setSelectedDepartment('');
        setSuccess('Question added successfully!');
        setTimeout(() => setSuccess(''), 3000);
        await loadQuestions();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add question');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (registerForm.password !== registerForm.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: registerForm.username,
          password: registerForm.password,
          userLevel: registerForm.userLevel
        })
      });

      if (response.ok) {
        setRegisterForm({ username: '', password: '', confirmPassword: '', userLevel: 2 });
        setError('');
        setSuccess('Admin registered successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    if (activeTab === 'questions') {
      loadQuestions();
    } else if (activeTab === 'reports') {
      loadReports();
    } else if (activeTab === 'history') {
      loadHistoryData();
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Survey Admin Dashboard</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">Logged in as: {username}</span>
            <button
              onClick={onLogout}
              className="flex items-center gap-1 px-3 py-1 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex space-x-4 mb-8">
          {userLevel === 1 && (
            <button
              onClick={() => setActiveTab('departments')}
              className={`px-4 py-2 rounded-md font-medium ${activeTab === 'departments'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              Departments
            </button>
          )}

          <button
            onClick={() => setActiveTab('questions')}
            className={`px-4 py-2 rounded-md font-medium ${activeTab === 'questions'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100'
              }`}
          >
            Send Questions
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-md font-medium ${activeTab === 'reports'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100'
              }`}
          >
            Current Survey
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-md font-medium ${activeTab === 'history'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100'
              }`}
          >
            History
          </button>

          {userLevel === 1 && (
            <button
              onClick={() => setActiveTab('admin-register')}
              className={`px-4 py-2 rounded-md font-medium ${activeTab === 'admin-register'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              Admin Register
            </button>
          )}
        </div>

        {activeTab === 'departments' && userLevel === 1 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Departments</h2>
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
                {success}
              </div>
            )}
            <div className="mb-6">
              <input
                type="text"
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                placeholder="New department name"
                className="w-full p-2 border rounded-md"
                onKeyPress={(e) => e.key === 'Enter' && addDepartment()}
              />
              <button
                onClick={addDepartment}
                disabled={loading}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'Adding...' : 'Add Department'}
              </button>
            </div>
            <div className="space-y-2">
              {departments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No departments found</p>
              ) : (
                departments.map(dept => (
                  <div key={dept.DepartmentID} className="p-3 border rounded-md flex justify-between items-center">
                    <div>
                      <p className="font-medium">{dept.Name}</p>
                      <p className="text-sm text-gray-600">URL: /survey/{dept.URLSlug}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          const newName = prompt('Enter new department name:', dept.Name);
                          if (newName && newName.trim() && newName !== dept.Name) {
                            updateDepartment(dept.DepartmentID, newName);
                          }
                        }}
                        className="px-2 py-1 text-sm bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteDepartment(dept.DepartmentID)}
                        className="px-2 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
                      >
                        Inactive
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Create Question</h2>

            <div className="mb-4 flex justify-end">
              <button
                onClick={() => setBulkQuestionMode(!bulkQuestionMode)}
                className={`px-4 py-2 rounded-md ${bulkQuestionMode
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700'
                  }`}
              >
                {bulkQuestionMode ? 'Single Department Mode' : 'Send to All Departments'}
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
                {success}
              </div>
            )}

            {bulkQuestionMode ? (
              /* Bulk question form */
              <div className="mb-6">
                <textarea
                  value={bulkQuestionText}
                  onChange={(e) => setBulkQuestionText(e.target.value)}
                  onKeyDown={(e) => {
                    // Allow Enter key to create new lines
                    if (e.key === 'Enter' && !e.shiftKey) {
                      
                    }
                  }}
                  placeholder="Question text for all departments (Press Enter and add English translate)"
                  rows={4}
                  className="w-full p-2 border rounded-md resize-vertical"
                  style={{ whiteSpace: 'pre-wrap' }}
                />
                <button
                  onClick={submitBulkQuestion}
                  disabled={loading}
                  className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400"
                >
                  {loading ? 'Sending to all departments...' : 'Send to All Departments'}
                </button>
              </div>
            ) : (
              /* Original single department form */
              <div className="mb-6">
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full p-2 border rounded-md mb-2"
                >
                  <option value="">Select department</option>
                  {departments.map(dept => (
                    <option key={dept.DepartmentID} value={dept.DepartmentID}>
                      {dept.Name}
                    </option>
                  ))}
                </select>
                <textarea
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    // Allow Enter key to create new lines
                    if (e.key === 'Enter' && !e.shiftKey) {
                      
                    }
                  }}
                  placeholder="Question text (Press Enter and add English translate)"
                  rows={4}
                  className="w-full p-2 border rounded-md resize-vertical"
                  style={{ whiteSpace: 'pre-wrap' }}
                />
                <button
                  onClick={addQuestion}
                  disabled={loading}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? 'Adding...' : 'Add Question'}
                </button>
              </div>
            )}
            <h3 className="text-lg font-bold mb-2">Current Questions</h3>
            <div className="space-y-3">
              {questions.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No questions found</p>
              ) : (
                questions.map(q => {
                  const dept = departments.find(d => d.DepartmentID === q.DepartmentID);
                  return (
                    <div key={q.QuestionID} className="p-3 border rounded-md">
                      <div className="flex justify-between items-start">
                        <p className="flex-1 whitespace-pre-wrap">{q.QuestionText}</p>
                        <span className={`px-2 py-1 text-xs rounded ml-2 ${q.IsActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {q.IsActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {dept?.Name || 'Unknown Department'} • {q.CreatedAt ? new Date(q.CreatedAt).toLocaleString() : 'Date not available'}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Ongoing Surveys</h2>
              <button
                onClick={loadReports}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'Refreshing...' : 'Refresh Data'}
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <Building className="w-4 h-4" />
                Filter by Department
              </h3>

              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department
                  </label>
                  <select
                    value={selectedDepartmentForReports}
                    onChange={(e) => setSelectedDepartmentForReports(e.target.value)}
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Departments</option>
                    {departments.map(dept => (
                      <option key={dept.DepartmentID} value={dept.Name}>
                        {dept.Name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => {
                    setSelectedDepartmentForReports('');
                    setFilteredReports(reports);
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                >
                  Clear Filter
                </button>
              </div>

              {selectedDepartmentForReports && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Showing results for: <span className="font-semibold">{selectedDepartmentForReports}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {filteredReports.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">
                    {selectedDepartmentForReports
                      ? `No reports available for ${selectedDepartmentForReports}`
                      : 'No reports available'
                    }
                  </p>
                  <p className="text-sm text-gray-400">
                    {selectedDepartmentForReports
                      ? 'Try selecting a different department or clear the filter'
                      : 'Make sure you have departments with active questions and responses'
                    }
                  </p>
                </div>
              ) : (
                filteredReports.map((report, i) => (
                  <div key={i} className="border rounded-lg p-6 bg-gray-50">
                    <div className="mb-4">
                      <h3 className="font-bold text-lg text-gray-900">{report.department}</h3>
                      <p className="text-gray-700 mt-2 text-base">{report.question}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Total responses: <span className="font-semibold">{report.totalResponses}</span>
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border">
                      <h4 className="font-medium mb-4 text-gray-700">Response Breakdown:</h4>

                      {report.totalResponses > 0 ? (
                        <div className="grid grid-cols-5 gap-4">
                          {report.emojiData.map((item, j) => {
                            const percentage = report.totalResponses > 0 ? ((item.count / report.totalResponses) * 100).toFixed(1) : 0;
                            return (
                              <div key={j} className="text-center">
                                <div className="text-4xl mb-2">{item.emoji}</div>
                                <div className="font-bold text-2xl text-gray-800">{item.count}</div>
                                <div className="text-sm text-gray-600 font-medium">{percentage}%</div>
                                <div className="text-xs text-gray-500 mt-1">{item.label}</div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-gray-500">
                          No responses yet for this question
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Survey History & Export</h2>
              <div className="flex gap-2">
                <button
                  onClick={exportToExcel}
                  disabled={exportLoading || filteredData.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                >
                  <Download className="w-4 h-4" />
                  {exportLoading ? 'Exporting...' : 'Export to Excel'}
                </button>
                {/*<button
                  onClick={exportToPDF}
                  disabled={exportLoading || filteredData.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
                >
                  <FileText className="w-4 h-4" />
                  Export to PDF
                </button>*/}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <Building className="w-4 h-4" />
                Filter Options
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department
                  </label>
                  <select
                    value={selectedDepartmentForHistory}
                    onChange={(e) => setSelectedDepartmentForHistory(e.target.value)}
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Departments</option>
                    {departments.map(dept => (
                      <option key={dept.DepartmentID} value={dept.DepartmentID}>
                        {dept.Name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleFilterChange}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? 'Filtering...' : 'Apply Filters'}
                </button>
                <button
                  onClick={() => {
                    setSelectedDepartmentForHistory('');
                    setStartDate('');
                    setEndDate('');
                    loadHistoryData();
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                >
                  Clear Filters
                </button>
              </div>
            </div>

            {/* Summary Statistics */}
            {filteredData.length > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-800">Results Summary</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total Records: </span>
                    <span className="font-semibold">{filteredData.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Responses: </span>
                    <span className="font-semibold">
                      {filteredData.reduce((sum, item) => sum + (item.totalResponses || 0), 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Departments: </span>
                    <span className="font-semibold">
                      {new Set(filteredData.map(item => item.department)).size}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Overall Analytics - Pie Chart */}
            {filteredData.length > 0 && (() => {
              // Aggregate all emoji data across all surveys
              const aggregatedData = {};

              filteredData.forEach(item => {
                if (item.emojiData && Array.isArray(item.emojiData)) {
                  item.emojiData.forEach(emoji => {
                    if (aggregatedData[emoji.emoji]) {
                      aggregatedData[emoji.emoji] += emoji.count;
                    } else {
                      aggregatedData[emoji.emoji] = emoji.count;
                    }
                  });
                }
              });

              const pieChartData = Object.entries(aggregatedData).map(([emoji, count]) => ({
                name: emoji,
                value: count,
                emoji: emoji
              }));

              return (
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-lg mb-6 border">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-bold text-gray-800">Overall Survey Analytics</h3>
                  </div>

                  {pieChartData.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Pie Chart */}
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h4 className="text-md font-semibold text-gray-700 mb-3 text-center">
                          Response Distribution
                        </h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={pieChartData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={renderCustomizedLabel}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {pieChartData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={EMOJI_COLORS[index % EMOJI_COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value, name) => [`${value} responses`, `${name}`]}
                              labelStyle={{ color: '#374151' }}
                            />
                            <Legend
                              formatter={(value) => (
                                <span className="text-sm text-gray-700">{value}</span>
                              )}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Statistics Table */}
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h4 className="text-md font-semibold text-gray-700 mb-3">
                          Detailed Statistics
                        </h4>
                        <div className="space-y-3">
                          {pieChartData
                            .sort((a, b) => b.value - a.value)
                            .map((item, index) => {
                              const totalResponses = pieChartData.reduce((sum, d) => sum + d.value, 0);
                              const percentage = ((item.value / totalResponses) * 100).toFixed(1);

                              return (
                                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                                  <div className="flex items-center gap-3">
                                    <span className="text-2xl">{item.emoji}</span>
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: EMOJI_COLORS[index % EMOJI_COLORS.length] }}
                                      ></div>
                                      <span className="text-sm font-medium text-gray-700">
                                        {item.emoji}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-bold text-gray-800">{item.value}</div>
                                    <div className="text-xs text-gray-500">{percentage}%</div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>

                        <div className="mt-4 pt-3 border-t border-gray-200">
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-gray-600">Total Responses:</span>
                            <span className="font-bold text-gray-800">
                              {pieChartData.reduce((sum, item) => sum + item.value, 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No data available for analytics</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Individual Survey Results */}
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading history data...</p>
                </div>
              ) : filteredData.length === 0 ? (
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">No survey data found</p>
                  <p className="text-sm text-gray-400">
                    Try adjusting your filters or create some surveys to see data here
                  </p>
                </div>
              ) : (
                filteredData.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">{item.department}</h3>
                        <p className="text-gray-700 mt-1">{item.question}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          Total Responses: <span className="font-semibold">{item.totalResponses}</span>
                        </p>
                        {item.createdAt && (
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {item.emojiData && item.totalResponses > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Original Grid View */}
                        <div className="bg-white rounded-lg p-3 border">
                          <h4 className="text-sm font-semibold text-gray-600 mb-2">Response Breakdown</h4>
                          <div className="grid grid-cols-5 gap-2">
                            {item.emojiData.map((emoji, i) => (
                              <div key={i} className="text-center">
                                <div className="text-2xl mb-1">{emoji.emoji}</div>
                                <div className="font-bold text-lg">{emoji.count}</div>
                                <div className="text-xs text-gray-600">
                                  {item.totalResponses > 0 ?
                                    ((emoji.count / item.totalResponses) * 100).toFixed(1) : 0}%
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Individual Pie Chart for this survey */}
                        <div className="bg-white rounded-lg p-3 border">
                          <h4 className="text-sm font-semibold text-gray-600 mb-2 text-center">Visual Distribution</h4>
                          <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                              <Pie
                                data={item.emojiData.map(emoji => ({
                                  name: emoji.emoji,
                                  value: emoji.count,
                                  emoji: emoji.emoji
                                }))}
                                cx="50%"
                                cy="50%"
                                outerRadius={60}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {item.emojiData.map((entry, i) => (
                                  <Cell
                                    key={`cell-${i}`}
                                    fill={EMOJI_COLORS[i % EMOJI_COLORS.length]}
                                  />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value, name) => [`${value} responses`, name]}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        {activeTab === 'admin-register' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Register New Admin</h2>
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
                {success}
              </div>
            )}

            <form onSubmit={handleRegister}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={registerForm.username}
                  onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={registerForm.confirmPassword}
                  onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Admin Level
                </label>
                <select
                  value={registerForm.userLevel}
                  onChange={(e) => setRegisterForm({ ...registerForm, userLevel: parseInt(e.target.value) })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value={2}>Admin</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'Registering...' : 'Register Admin'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
