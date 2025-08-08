download-->user/src-npm install rechart-->backword to project root-->npm start
# Smile-Survey
# Survey Management System Documentation
 slug file path of all PCs - "C:\Slug\SlugUrl.txt"
## Table of Contents
1. [System Overview](#system-overview)
2. [Technical Architecture](#technical-architecture)
3. [API Documentation](#api-documentation)
4. [Database Schema](#database-schema)
5. [Frontend Components](#frontend-components)
6. [Authentication & Authorization](#authentication--authorization)
7. [Deployment Guide](#deployment-guide)
8. [Troubleshooting](#troubleshooting)
9. [Future Enhancements](#future-enhancements)

## System Overview

The Survey Management System is a full-stack application that allows organizations to:
- Create departments and survey questions
- Collect employee feedback through emoji-based responses
- Generate reports and export data
- Manage user access with different permission levels

### Key Features
- **Admin Dashboard**: Manage departments, questions, and view reports
- **User Panel**: Simple emoji-based survey interface
- **Reporting**: View response statistics and export to Excel
- **Authentication**: Role-based access control (Super Admin and Admin)
- **History Tracking**: Filter and view historical survey data

## Technical Architecture

### Backend
- **Framework**: Express.js (Node.js)
- **Database**: Microsoft SQL Server
- **Authentication**: JWT (JSON Web Tokens)
- **API Documentation**: RESTful endpoints
- **Dependencies**:
  - `mssql`: SQL Server client
  - `bcryptjs`: Password hashing
  - `jsonwebtoken`: JWT implementation
  - `exceljs`: Excel export functionality
  - `cors`: Cross-origin resource sharing
  - `dotenv`: Environment variables

### Frontend
- **Framework**: React.js
- **UI Components**: Custom-built with Tailwind CSS
- **Icons**: Lucide React icons
- **State Management**: React hooks (useState, useEffect)
- **Routing**: Client-side routing

## API Documentation

### Base URL
`http://[server]:5000/api`

### Authentication
#### Login
- **Endpoint**: `POST /admin/login`
- **Request Body**:
  ```json
  {
    "username": "admin",
    "password": "password123"
  }
  ```
- **Response**:
  ```json
  {
    "token": "jwt.token.here",
    "userLevel": 1,
    "username": "admin"
  }
  ```

#### Register (Super Admin only)
- **Endpoint**: `POST /admin/register`
- **Headers**: `Authorization: Bearer [superadmin-token]`
- **Request Body**:
  ```json
  {
    "username": "newadmin",
    "password": "password123",
    "userLevel": 2
  }
  ```

### Departments
#### Get All Departments
- **Endpoint**: `GET /departments`
- **Response**:
  ```json
  [
    {
      "DepartmentID": 1,
      "Name": "IT Department",
      "URLSlug": "it-department"
    }
  ]
  ```

#### Create Department
- **Endpoint**: `POST /departments`
- **Request Body**:
  ```json
  {
    "name": "HR Department"
  }
  ```

### Questions
#### Get Questions by Department
- **Endpoint**: `GET /departments/[slug]/questions`
- **Response**:
  ```json
  [
    {
      "QuestionID": 1,
      "QuestionText": "How satisfied are you with IT support?",
      "IsActive": true,
      "CreatedAt": "2023-01-01T00:00:00.000Z"
    }
  ]
  ```

#### Create Question
- **Endpoint**: `POST /departments/[slug]/questions`
- **Request Body**:
  ```json
  {
    "questionText": "New survey question"
  }
  ```

### Survey Responses
#### Submit Answer
- **Endpoint**: `POST /questions/[questionId]/answers`
- **Request Body**:
  ```json
  {
    "emoji": "😊",
    "emojiId": 2
  }
  ```

### Reports
#### Get Reports
- **Endpoint**: `GET /reports`
- **Response**:
  ```json
  [
    {
      "department": "IT Department",
      "question": "How satisfied are you with IT support?",
      "totalResponses": 42,
      "responses": [
        {
          "emoji": "😍",
          "label": "Excellent",
          "count": 10,
          "id": 1
        }
      ]
    }
  ]
  ```

#### Export to Excel
- **Endpoint**: `GET /reports/export`
- **Query Parameters**:
  - `departmentId`: Filter by department
  - `startDate`: Start date filter (YYYY-MM-DD)
  - `endDate`: End date filter (YYYY-MM-DD)
- **Response**: Excel file download

## Database Schema

### Tables
1. **Departments**
   - DepartmentID (PK, int)
   - Name (nvarchar)
   - Slug (nvarchar) - Optional
   - IsActive (bit) - Optional
   - CreatedAt (datetime) - Optional
   - UpdatedAt (datetime) - Optional

2. **SurveyQuestions**
   - QuestionID (PK, int)
   - DepartmentID (FK, int)
   - QuestionText (nvarchar)
   - IsActive (bit) - Optional
   - CreatedAt (datetime) - Optional
   - UpdatedAt (datetime) - Optional

3. **SurveyAnswers**
   - AnswerID (PK, int)
   - QuestionID (FK, int)
   - DepartmentID (FK, int) - Optional
   - AnswerEmoji (nvarchar)
   - EmojiID (int) - Optional
   - AnsweredAt (datetime) - Optional
   - CreatedAt (datetime) - Optional

4. **Users**
   - UserID (PK, int)
   - Username (nvarchar)
   - PasswordHash (nvarchar)
   - UserLevel (int) - 1=Super Admin, 2=Admin
   - IsActive (bit)
   - LastLogin (datetime) - Optional

## Frontend Components

### Admin Dashboard
- **Login/Register**: Authentication forms
- **Department Management**: CRUD operations for departments
- **Question Management**: Create and view questions
- **Reports**: View response statistics and charts
- **History**: Filter and view historical data
- **Excel Export**: Generate and download Excel reports

### User Panel
- **Survey Interface**: Emoji-based response system
- **Responsive Design**: Works on desktop and mobile
- **Submission Feedback**: Success/error messages
- **Auto-refresh**: After submission for next user

## Authentication & Authorization

### User Levels
1. **Super Admin (Level 1)**
   - Full system access
   - Can create other admins
   - Can manage all departments and questions

2. **Admin (Level 2)**
   - Can manage questions
   - Can view reports
   - Cannot create other admins

### JWT Implementation
- Tokens expire after 8 hours
- Stored in client localStorage
- Verified on each protected API request

## Deployment Guide

### Prerequisites
- Node.js (v14+)
- SQL Server (2016+)
- Windows/Linux server

### Backend Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file:
   ```
   DB_SERVER=your-db-server
   DB_NAME=SurveyManagement
   DB_USER=db-username
   DB_PASSWORD=db-password
   JWT_SECRET=your-secret-key
   PORT=5000
   ```

3. Start server:
   ```bash
   node server.js
   ```

### Frontend Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure API base URL in `SurveyUserPanel.js` and `AdminDashboard.js`

3. Build for production:
   ```bash
   npm run build
   ```

## Troubleshooting

### Common Issues
1. **Database Connection Errors**
   - Verify SQL Server is running
   - Check connection string in `.env`
   - Ensure TCP/IP is enabled in SQL Server Configuration Manager

2. **Authentication Failures**
   - Verify JWT_SECRET matches between server restarts
   - Check token expiration
   - Ensure user is active in database

3. **Excel Export Issues**
   - Verify write permissions on server
   - Check available memory for large datasets

## Future Enhancements

### Planned Features
1. **Advanced Analytics**
   - Trend analysis over time
   - Comparative department reports

2. **Enhanced Security**
   - Password reset functionality
   - Two-factor authentication

3. **Mobile App**
   - Native applications for iOS/Android
   - Offline data collection

4. **Additional Question Types**
   - Multiple choice questions
   - Text feedback options

5. **Notification System**
   - Email alerts for new responses
   - Threshold-based notifications

This documentation provides a comprehensive overview of the Survey Management System. For specific implementation details, refer to the source code comments and the API documentation sections.
=======
# Smile-Survey-clean
cleaned this repo
>>>>>>> dbdf37fd9775f7a8f7a6b71877b471a4f2549fa8
