import React, { useState, useEffect } from 'react';
import { PlusCircle, BarChart3, Users, History, Download, Calendar, Building, Lock, UserPlus, LogOut } from 'lucide-react';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('login');
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userLevel, setUserLevel] = useState(2); // 1=superadmin, 2=admin
  const [username, setUsername] = useState('');
  const [success, setSuccess] = useState('');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    userLevel: 2
  });
  
  const API_BASE_URL = 'http://localhost:5000/api';
  
  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      verifyToken(token);
    }
  }, []);
  
  const verifyToken = async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsLoggedIn(true);
        setUserLevel(data.userLevel);
        setUsername(data.username);
        setActiveTab(data.userLevel === 1 ? 'departments' : 'questions');
      } else {
        localStorage.removeItem('token');
      }
    } catch (err) {
      localStorage.removeItem('token');
      console.error('Token verification failed:', err);
    }
  };
  
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        setIsLoggedIn(true);
        setUserLevel(data.userLevel);
        setUsername(data.username);
        setActiveTab(data.userLevel === 1 ? 'departments' : 'questions');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
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
    setSuccess(''); // Clear any previous success message
    
    if (registerForm.password !== registerForm.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/admin/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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
        setTimeout(() => setSuccess(''), 3000); // Clear success message after 3 seconds
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
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setUserLevel(2);
    setUsername('');
    setActiveTab('login');
  };
  
  // Load departments
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
  
  // Load questions
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
  
  // Load history data
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
  // Update department
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
  
  // Delete department
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
  // Export to Excel function
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
      
      // Get the blob from response
      const blob = await response.blob();
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Generate filename with current date
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const deptName = selectedDepartmentForHistory ?
      departments.find(d => d.DepartmentID == selectedDepartmentForHistory)?.Name || 'Selected' : 'All';
      
      link.download = `Survey_Report_${deptName}_${dateStr}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      window.URL.revokeObjectURL(downloadUrl);
      
    } catch (err) {
      console.error('Export failed:', err);
      setError('Export failed: ' + err.message);
    } finally {
      setExportLoading(false);
    }
  };
  
  // Handle filter changes
  const handleFilterChange = () => {
    loadHistoryData(selectedDepartmentForHistory, startDate, endDate);
  };
  
  // Load reports - Fixed to handle the actual API response
  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/reports`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Raw reports data:', data);
      
      // Process reports to use EmojiID mapping
      const processedReports = data.map(report => {
        // Initialize emoji counts using EmojiID mapping
        const emojiCounts = {
          1: 0, // Excellent
          2: 0, // Good
          3: 0, // Okay
          4: 0, // Poor
          5: 0  // Terrible
        };
        
        // Update counts based on EmojiID from database
        if (report.responses && Array.isArray(report.responses)) {
          report.responses.forEach(response => {
            const emojiId = response.EmojiID;
            if (emojiCounts.hasOwnProperty(emojiId)) {
              emojiCounts[emojiId] = response.Count || 0;
            }
          });
        }
        
        // Convert to display format with emoji characters
        const emojiData = [
          { emoji: '😍', label: 'Excellent', count: emojiCounts[1], id: 1 },
          { emoji: '😊', label: 'Good', count: emojiCounts[2], id: 2 },
          { emoji: '😐', label: 'Okay', count: emojiCounts[3], id: 3 },
          { emoji: '😞', label: 'Poor', count: emojiCounts[4], id: 4 },
          { emoji: '😡', label: 'Terrible', count: emojiCounts[5], id: 5 }
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
      setError('');
    } catch (err) {
      console.error('Failed to load reports:', err);
      setReports([]);
      setError('Failed to load reports: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Add department
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
  
  // Add question
  const addQuestion = async () => {
    if (!selectedDepartment || !newQuestion.trim()) {
      setError('Department and question text are required');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess(''); // Clear any previous success message
    
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
        setTimeout(() => setSuccess(''), 3000); // Clear success message after 3 seconds
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
  
  // Initial load
  useEffect(() => {
    loadDepartments();
  }, []);
  
  // Load data when switching tabs
  useEffect(() => {
    if (activeTab === 'questions') {
      loadQuestions();
    } else if (activeTab === 'reports') {
      loadReports();
    } else if (activeTab === 'history') {
      loadHistoryData();
    } else if (activeTab === 'admin' && userLevel === 1) {
      // This would be where you'd load admin management data
    }
  }, [activeTab, isLoggedIn]);
  
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
      {activeTab === 'login' ? (
        <>
        <div className="flex items-center justify-center mb-6">
        <Lock className="w-8 h-8 text-blue-600 mr-2" />
        <h1 className="text-2xl font-bold text-gray-800">Admin Login</h1>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
          </div>
        )}
        
        <form onSubmit={handleLogin}>
        <div className="mb-4">
        <label className="block text-gray-700 text-sm font-medium mb-2">
        Username
        </label>
        <input
        type="text"
        value={loginForm.username}
        onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        required
        />
        </div>
        
        <div className="mb-6">
        <label className="block text-gray-700 text-sm font-medium mb-2">
        Password
        </label>
        <input
        type="password"
        value={loginForm.password}
        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        required
        />
        </div>
        
        <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
        {loading ? 'Logging in...' : 'Login'}
        </button>
        </form>
        
        {userLevel === 1 && (
          <div className="mt-4 text-center">
          <button
          onClick={() => setActiveTab('register')}
          className="text-blue-600 hover:text-blue-800 text-sm"
          >
          Register new admin
          </button>
          </div>
        )}
        </>
      ) : (
        <>
        <div className="flex items-center justify-center mb-6">
        <UserPlus className="w-8 h-8 text-blue-600 mr-2" />
        <h1 className="text-2xl font-bold text-gray-800">Register Admin</h1>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
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
        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
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
        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
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
        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        required
        />
        </div>
        
        <div className="mb-6">
        <label className="block text-gray-700 text-sm font-medium mb-2">
        Admin Level
        </label>
        <select
        value={registerForm.userLevel}
        onChange={(e) => setRegisterForm({ ...registerForm, userLevel: parseInt(e.target.value) })}
        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        >
        <option value={1}>Super Admin</option>
        <option value={2}>Admin</option>
        </select>
        </div>
        
        <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
        {loading ? 'Registering...' : 'Register'}
        </button>
        </form>
        
        <div className="mt-4 text-center">
        <button
        onClick={() => setActiveTab('login')}
        className="text-blue-600 hover:text-blue-800 text-sm"
        >
        Back to login
        </button>
        </div>
        </>
      )}
      </div>
      </div>
    );
  }
  // Main Dashboard
  return (
    <div className="min-h-screen bg-gray-100">
    <div className="bg-white shadow-sm border-b">
    <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
    <h1 className="text-3xl font-bold text-gray-900">Survey Admin Dashboard</h1>
    <div className="flex items-center space-x-4">
    <span className="text-gray-700">Logged in as: {username}</span>
    <button
    onClick={handleLogout}
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
    {/* Only show departments tab for super admin */}
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
    Reports
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
    
    {/* Only show admin registration for super admin */}
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
          Delete
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
            <h2 className="text-xl font-bold mb-4">Create Question with Date Range</h2>
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md flex items-start gap-2">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
                {success}
              </div>
            )}
            
            <div className="mb-6 space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Select Department *
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select department</option>
                  {departments.map(dept => (
                    <option key={dept.DepartmentID} value={dept.DepartmentID}>
                      {dept.Name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Question Text *
                </label>
                <textarea
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="Enter your question here"
                  rows={3}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    From Date *
                  </label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    To Date *
                  </label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    min={fromDate}
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                onClick={addQuestion}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-5 h-5" />
                {loading ? 'Adding Question...' : 'Add Question with Date Range'}
              </button>
            </div>

            <h3 className="text-lg font-bold mb-4 mt-8">Current Questions</h3>
            <div className="space-y-3">
              {questions.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No questions found</p>
              ) : (
                questions.map(q => {
                  const dept = departments.find(d => d.DepartmentID === q.DepartmentID);
                  const statusInfo = getQuestionStatus(q);
                  
                  return (
                    <div key={q.QuestionID} className="p-4 border rounded-md bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <p className="flex-1 font-medium">{q.QuestionText}</p>
                        <span className={`px-2 py-1 text-xs rounded ml-2 whitespace-nowrap ${statusInfo.className}`}>
                          {statusInfo.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 mt-3">
                        <p>
                          <Building className="w-4 h-4 inline mr-1" />
                          {dept?.Name || 'Unknown Department'}
                        </p>
                        {q.FromDate && q.ToDate && (
                          <p className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(q.FromDate).toLocaleDateString()} - {new Date(q.ToDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      
                      {q.CreatedAt && (
                        <p className="text-xs text-gray-500 mt-2">
                          Created: {new Date(q.CreatedAt).toLocaleString()}
                        </p>
                      )}
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
      
      <div className="space-y-6">
      {reports.length === 0 ? (
        <div className="text-center py-8">
        <p className="text-gray-500 mb-4">No reports available</p>
        <p className="text-sm text-gray-400">Make sure you have departments with active questions and responses</p>
        </div>
      ) : (
        reports.map((report, i) => (
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
      <button
      onClick={exportToExcel}
      disabled={exportLoading || filteredData.length === 0}
      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
      >
      <Download className="w-4 h-4" />
      {exportLoading ? 'Exporting...' : 'Export to Excel'}
      </button>
      </div>
      
      {/* Filter Controls */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
      <h3 className="font-medium mb-4 flex items-center gap-2">
      <Building className="w-4 h-4" />
      Filter Options
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Department Filter */}
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
      
      {/* Start Date Filter */}
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
      
      {/* End Date Filter */}
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
      
      {/* Filter Actions */}
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
      
      {/* Results Summary */}
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
      
      {/* History Data Display */}
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
          
          {/* Emoji Response Breakdown */}
          {item.emojiData && item.totalResponses > 0 && (
            <div className="bg-white rounded-lg p-3 border">
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
            )}
            </div>
          ))
        )}
        </div>
        </div>
      )}
      
      
      {/* Add the admin registration tab */}
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
        <option value={1}>Super Admin</option>
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
  
  export default AdminDashboard;