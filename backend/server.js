const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const ExcelJS = require('exceljs');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const app = express();
const PDFDocument = require('pdfkit');
const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());
// JWT Secret - in.env file
const JWT_SECRET = process.env.JWT_SECRET || '123';

function getDatabaseConfig() {
  const baseConfig = {
    server: process.env.DB_SERVER || 'DCL-ICT-007',
    database: process.env.DB_NAME || 'SurveyManagement',
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
      connectTimeout: 30000,
      requestTimeout: 30000,
      useUTC: false
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  };

  if (process.env.DB_USER && process.env.DB_PASSWORD) {
    console.log('Using SQL Server Authentication');
    return {
      ...baseConfig,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    };
  }

  console.log('Trying connection string approach for Windows Authentication');
  return {
    connectionString: `Server=${process.env.DB_SERVER || 'DCL-ICT-007'};Database=${process.env.DB_NAME || 'SurveyManagement'};Trusted_Connection=true;TrustServerCertificate=true;ConnectTimeout=30;`,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
      useUTC: false
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  };
}
app.get('/api/reports/export-pdf', async (req, res) => {
  try {
    const { departmentId, startDate, endDate } = req.query;
    const pool = await getPool();

    // Get report data
    let query = `
      SELECT 
        d.Name as department,
        q.QuestionText as question,
        q.QuestionID,
        q.CreatedAt,
        a.AnswerEmoji,
        a.AnsweredAt,
        a.AnswerID`;

    const hasEmojiID = await checkColumnExists('SurveyAnswers', 'EmojiID');
    if (hasEmojiID) {
      query += ', a.EmojiID';
    }

    query += `
      FROM Departments d
      JOIN SurveyQuestions q ON d.DepartmentID = q.DepartmentID
      LEFT JOIN SurveyAnswers a ON q.QuestionID = a.QuestionID
      WHERE q.QuestionText IS NOT NULL`;

    const request = pool.request();

    // Add filters
    if (departmentId) {
      query += ' AND d.DepartmentID = @departmentId';
      request.input('departmentId', sql.Int, departmentId);
    }

    if (startDate) {
      query += ' AND q.CreatedAt >= @startDate';
      request.input('startDate', sql.DateTime, startDate);
    }

    if (endDate) {
      query += ' AND q.CreatedAt <= @endDate';
      request.input('endDate', sql.DateTime, endDate + ' 23:59:59');
    }

    query += ' ORDER BY d.Name, q.CreatedAt DESC, a.AnsweredAt DESC';

    const result = await request.query(query);

    // Create PDF document with Unicode support
    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 50,
      bufferPages: true,
      autoFirstPage: false
    });

    const fontPaths = {
      regular: path.join(__dirname, 'fonts', 'NotoSans-Regular.ttf'),
      bold: path.join(__dirname, 'fonts', 'NotoSans-Bold.ttf'),
      emoji: path.join(__dirname, 'fonts', 'NotoEmoji-Regular.ttf'),
      sinhala: path.join(__dirname, 'fonts', 'NotoSansSinhala-Regular.ttf')
    };

    let useUnicodeFont = false;
    try {
      if (fs.existsSync(fontPaths.regular)) {
        doc.registerFont('NotoRegular', fontPaths.regular);
        doc.registerFont('NotoBold', fontPaths.bold);
        if (fs.existsSync(fontPaths.emoji)) {
          doc.registerFont('NotoEmoji', fontPaths.emoji);
        }
        if (fs.existsSync(fontPaths.sinhala)) {
          doc.registerFont('NotoSinhala', fontPaths.sinhala);
        }
        useUnicodeFont = true;
      }
    } catch (err) {
      console.warn('Unicode fonts not found, using fallback approach');
    }

    // Add first page
    doc.addPage();
    
    // Set response headers
    const filename = `Survey_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Pipe PDF to response
    doc.pipe(res);

    // Set font for Unicode support
    if (useUnicodeFont) {
      doc.font('NotoBold');
    }

    // Add title with proper encoding
    doc.fontSize(20).text('Survey Report', { 
      align: 'center',
      features: ['liga', 'kern']
    });
    doc.moveDown();

    // Get department name for filter display
    let departmentName = 'All';
    if (departmentId) {
      const deptResult = await pool.request()
        .input('deptId', sql.Int, departmentId)
        .query('SELECT Name FROM Departments WHERE DepartmentID = @deptId');
      
      if (deptResult.recordset.length > 0) {
        departmentName = deptResult.recordset[0].Name;
      }
    }
    
    // Add filters info with Unicode support
    if (useUnicodeFont) {
      doc.font('NotoRegular');
    }
    
    doc.fontSize(12).text('Filters:', { underline: true });
    doc.text(`Department: ${departmentName}`);
    doc.text(`Date Range: ${startDate || 'Start'} to ${endDate || 'End'}`);
    doc.moveDown();

    // Group data by department and question
    const groupedData = {};
    result.recordset.forEach(row => {
      const key = `${row.department}_${row.QuestionID}`;
      if (!groupedData[key]) {
        groupedData[key] = {
          department: row.department,
          question: row.question,
          questionId: row.QuestionID,
          createdAt: row.CreatedAt,
          responses: []
        };
      }
      if (row.AnswerID) {
        groupedData[key].responses.push(row);
      }
    });

    // Enhanced emoji handling function
    function renderTextWithEmojis(doc, text, x, y, options = {}) {
      const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
      
      let currentX = x || doc.x;
      let currentY = y || doc.y;
      
      // Split text into emoji and non-emoji parts
      const parts = text.split(emojiRegex);
      const emojis = text.match(emojiRegex) || [];
      
      for (let i = 0; i < parts.length; i++) {
        // Render regular text
        if (parts[i]) {
          if (useUnicodeFont) {
            // Check if text contains Sinhala characters
            const sinhalaRegex = /[\u0D80-\u0DFF]/;
            if (sinhalaRegex.test(parts[i])) {
              doc.font('NotoSinhala');
            } else {
              doc.font('NotoRegular');
            }
          }
          
          doc.text(parts[i], currentX, currentY, { 
            continued: true, 
            ...options 
          });
          currentX += doc.widthOfString(parts[i]);
        }
        
        // Render emoji
        if (emojis[i]) {
          if (useUnicodeFont) {
            try {
              doc.font('NotoEmoji');
              doc.text(emojis[i], currentX, currentY, { 
                continued: i < parts.length - 1 || emojis[i + 1], 
                ...options 
              });
              currentX += doc.widthOfString(emojis[i]);
            } catch (err) {
              // Fallback: render emoji as text description
              const emojiMap = {
                '😍': '[Excellent]',
                '😊': '[Good]', 
                '😐': '[Okay]',
                '😞': '[Bad]',
                '😡': '[Poor]'
              };
              const fallbackText = emojiMap[emojis[i]] || emojis[i];
              doc.font('NotoRegular');
              doc.text(fallbackText, currentX, currentY, { 
                continued: i < parts.length - 1 || emojis[i + 1], 
                ...options 
              });
              currentX += doc.widthOfString(fallbackText);
            }
          } else {
            // Fallback approach without Unicode fonts
            const emojiMap = {
              '😍': 'Excellent',
              '😊': 'Good', 
              '😐': 'Okay',
              '😞': 'Bad',
              '😡': 'Poor'
            };
            const fallbackText = emojiMap[emojis[i]] || '[Emoji]';
            doc.text(`(${fallbackText})`, currentX, currentY, { 
              continued: i < parts.length - 1 || emojis[i + 1], 
              ...options 
            });
            currentX += doc.widthOfString(`(${fallbackText})`);
          }
        }
      }
      
      if (!options.continued) {
        doc.text(''); // End the text stream
      }
      
      return currentX;
    }

    // Process each group with enhanced Unicode support
    Object.values(groupedData).forEach((group, index) => {
      if (index > 0) {
        doc.addPage();
      }

      // Department header with Unicode support
      if (useUnicodeFont) {
        doc.font('NotoBold');
      }
      doc.fontSize(16);
      renderTextWithEmojis(doc, group.department, null, null, { align: 'center' });
      doc.moveDown();

      // Question text with Unicode support
      doc.fontSize(14);
      renderTextWithEmojis(doc, group.question, null, null, { align: 'center' });
      doc.moveDown();

      // Date info
      if (useUnicodeFont) {
        doc.font('NotoRegular');
      }
      doc.fontSize(10).text(`Question created: ${new Date(group.createdAt).toLocaleString()}`);
      doc.moveDown();

      // Calculate emoji counts with better Unicode handling
      const emojiCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      const emojiLabels = {
        1: useUnicodeFont ? 'Excellent 😍' : 'Excellent',
        2: useUnicodeFont ? 'Good 😊' : 'Good',
        3: useUnicodeFont ? 'Okay 😐' : 'Okay',
        4: useUnicodeFont ? 'Bad 😞' : 'Bad',
        5: useUnicodeFont ? 'Poor 😡' : 'Poor'
      };

      group.responses.forEach(response => {
        if (hasEmojiID && response.EmojiID) {
          emojiCounts[response.EmojiID]++;
        } else {
          // Enhanced emoji mapping
          const emojiMap = { 
            '😍': 1, '😊': 2, '😐': 3, '😞': 4, '😡': 5,
            // Add alternative emoji representations
            '🥰': 1, '🙂': 2, '😑': 3, '☹️': 4, '😠': 5
          };
          const emojiId = emojiMap[response.AnswerEmoji];
          if (emojiId) {
            emojiCounts[emojiId]++;
          }
        }
      });

      const totalResponses = group.responses.length;

      // Summary table with Unicode support
      doc.fontSize(12);
      if (useUnicodeFont) {
        doc.font('NotoBold');
      }
      doc.text('Response Summary:', { underline: true });
      doc.moveDown(0.5);

      // Table headers
      const tableY = doc.y;
      doc.text('Rating', 100, tableY);
      doc.text('Count', 250, tableY);
      doc.text('Percentage', 350, tableY);
      doc.moveDown();

      // Table rows with emoji support
      if (useUnicodeFont) {
        doc.font('NotoRegular');
      }
      
      [1, 2, 3, 4, 5].forEach(id => {
        const percentage = totalResponses > 0 ? ((emojiCounts[id] / totalResponses) * 100).toFixed(1) : 0;
        const currentY = doc.y;
        
        // Render rating with emoji
        renderTextWithEmojis(doc, emojiLabels[id], 100, currentY);
        doc.text(emojiCounts[id].toString(), 250, currentY);
        doc.text(`${percentage}%`, 350, currentY);
        doc.moveDown();
      });

      // Enhanced pie chart with better colors and Unicode legend
      doc.moveDown();
      doc.fontSize(12);
      if (useUnicodeFont) {
        doc.font('NotoBold');
      }
      doc.text('Response Distribution:', { underline: true });
      doc.moveDown(0.5);

      // Only draw chart if there are responses
      if (totalResponses > 0) {
        const pieColors = ['#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0'];
        const pieRadius = 80;
        const pieX = 150;
        const pieY = doc.y + 100;
        let lastAngle = 0;

        // Calculate and draw pie segments
        const segments = [1, 2, 3, 4, 5].map(id => ({
          id,
          count: emojiCounts[id],
          angle: (emojiCounts[id] / totalResponses) * 360,
          percentage: ((emojiCounts[id] / totalResponses) * 100).toFixed(1)
        })).filter(segment => segment.count > 0);

        // Draw pie segments
        segments.forEach((segment, i) => {
          const startAngle = lastAngle * Math.PI / 180;
          const endAngle = (lastAngle + segment.angle) * Math.PI / 180;
          
          doc.save()
             .moveTo(pieX, pieY)
             .arc(pieX, pieY, pieRadius, startAngle, endAngle)
             .lineTo(pieX, pieY)
             .fillColor(pieColors[segment.id - 1])
             .fill()
             .restore();
             
          lastAngle += segment.angle;
        });

        // Enhanced legend with Unicode support
        const legendX = 300;
        let legendY = pieY - 40;
        
        if (useUnicodeFont) {
          doc.font('NotoRegular');
        }
        
        segments.forEach((segment, i) => {
          // Color box
          doc.rect(legendX, legendY, 12, 12)
             .fillColor(pieColors[segment.id - 1])
             .fill();
          
          // Legend text with emoji
          doc.fillColor('#000000')
             .fontSize(10);
          
          const legendText = `${emojiLabels[segment.id]}: ${segment.count} (${segment.percentage}%)`;
          renderTextWithEmojis(doc, legendText, legendX + 18, legendY + 2);
          
          legendY += 20;
        });
      } else {
        doc.text('No responses available for this question.');
      }

      doc.moveDown(3);
    });

    // Add page numbers
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8)
         .text(`Page ${i + 1} of ${pages.count}`, 
               doc.page.width - 100, 
               doc.page.height - 30, 
               { align: 'right' });
    }

    // Finalize PDF
    doc.end();

  } catch (err) {
    console.error('Error generating PDF:', err);
    res.status(500).json({ error: err.message });
  }
});

const dbConfig = getDatabaseConfig();
let poolPromise;

async function initializeDatabase() {
  try {
    console.log('Attempting to connect to database...');
    console.log('Server:', dbConfig.server || 'Connection string used');
    console.log('Database:', dbConfig.database || 'From connection string');

    poolPromise = new sql.ConnectionPool(dbConfig);

    poolPromise.on('connect', () => {
      console.log('Database connection established');
    });

    poolPromise.on('error', (err) => {
      console.error('Database connection error:', err);
    });

    await poolPromise.connect();
    console.log('Connected to SQL Server successfully');

    const request = poolPromise.request();
    const result = await request.query('SELECT 1 as test');
    console.log('Database test query successful:', result.recordset);

    return poolPromise;
  } catch (err) {
    console.error('Database connection failed:', err);
    throw err;
  }
}
//database installization
async function getPool() {
  if (!poolPromise) {
    poolPromise = await initializeDatabase();
  }
  return poolPromise;
}
// Helper function to generate random slug
const generateRandomSlug = () => {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// Helper function to check if slug is unique
const isSlugUnique = async (pool, slug) => {
  try {
    const result = await pool.request()
      .input('slug', sql.NVarChar, slug)
      .query('SELECT COUNT(*) as count FROM Departments WHERE Slug = @slug');

    return result.recordset[0].count === 0;
  } catch (err) {
    console.error('Error checking slug uniqueness:', err);
    return false;
  }
};

// Helper function to generate unique slug
const generateUniqueSlug = async (pool) => {
  let slug;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    slug = generateRandomSlug();
    isUnique = await isSlugUnique(pool, slug);
    attempts++;
  }

  if (!isUnique) {
    // Fallback to timestamp-based slug if random generation fails
    slug = `dept-${Date.now().toString(36)}`;
  }

  return slug;
};

// Middleware to verify JWT token
const authenticateJWT = (requiredLevel = 2) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);

      // Verify user exists and has required level
      const pool = await getPool();
      const userResult = await pool.request()
        .input('userId', sql.Int, decoded.userId)
        .query('SELECT * FROM Users WHERE UserID = @userId AND IsActive = 1');

      if (userResult.recordset.length === 0) {
        return res.status(401).json({ error: 'Invalid user' });
      }

      const user = userResult.recordset[0];

      if (user.UserLevel > requiredLevel) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      req.user = user;
      next();
    } catch (err) {
      console.error('JWT verification error:', err);
      res.status(401).json({ error: 'Invalid token' });
    }
  };
};

// User registration (superadmin only) - SIMPLIFIED VERSION WITHOUT PASSWORD RESET
// Modified registration endpoint without JWT validation
app.post('/api/admin/register', async (req, res) => {
  try {
    const { username, password, userLevel } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (userLevel !== 1 && userLevel !== 2) {
      return res.status(400).json({ error: 'Invalid user level' });
    }

    const pool = await getPool();

    // Check if username exists
    const existsResult = await pool.request()
      .input('username', sql.NVarChar, username)
      .query('SELECT 1 FROM Users WHERE Username = @username');

    if (existsResult.recordset.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert new user
    await pool.request()
      .input('username', sql.NVarChar, username)
      .input('passwordHash', sql.NVarChar, hashedPassword)
      .input('userLevel', sql.Int, userLevel)
      .query('INSERT INTO Users (Username, PasswordHash, UserLevel) VALUES (@username, @passwordHash, @userLevel)');

    res.json({ success: true, message: 'User registered successfully' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message });
  }
});

// User login - SIMPLIFIED VERSION WITHOUT PASSWORD EXPIRY CHECK
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const pool = await getPool();

    // Get user
    const userResult = await pool.request()
      .input('username', sql.NVarChar, username)
      .query('SELECT * FROM Users WHERE Username = @username AND IsActive = 1');

    if (userResult.recordset.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.recordset[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.PasswordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await pool.request()
      .input('userId', sql.Int, user.UserID)
      .query('UPDATE Users SET LastLogin = GETDATE() WHERE UserID = @userId');

    // Create JWT token
    const token = jwt.sign(
      { userId: user.UserID, userLevel: user.UserLevel },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      userLevel: user.UserLevel,
      username: user.Username
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/questions/bulk', async (req, res) => {
  try {
    const { questionText } = req.body;

    if (!questionText || !questionText.trim()) {
      return res.status(400).json({ error: 'Question text is required' });
    }

    const pool = await getPool();

    // Get all active departments
    const departmentsResult = await pool.request()
      .query('SELECT DepartmentID, Slug FROM Departments WHERE IsActive = 1');

    if (departmentsResult.recordset.length === 0) {
      return res.status(400).json({ error: 'No active departments found' });
    }

    const departments = departmentsResult.recordset;
    // Preserve line breaks in the question text
    const cleanQuestion = questionText.trim();
    const hasIsActive = await checkColumnExists('SurveyQuestions', 'IsActive');

    // Process each department
    for (const dept of departments) {
      try {
        // If IsActive column exists, deactivate other questions first
        if (hasIsActive) {
          await pool.request()
            .input('departmentId', sql.Int, dept.DepartmentID)
            .query('UPDATE SurveyQuestions SET IsActive = 0 WHERE DepartmentID = @departmentId');
        }

        let insertQuery = 'INSERT INTO SurveyQuestions (DepartmentID, QuestionText';
        let values = 'VALUES (@departmentId, @questionText';

        if (hasIsActive) {
          insertQuery += ', IsActive';
          values += ', 1';
        }

        if (await checkColumnExists('SurveyQuestions', 'CreatedAt')) {
          insertQuery += ', CreatedAt';
          values += ', GETDATE()';
        }

        if (await checkColumnExists('SurveyQuestions', 'UpdatedAt')) {
          insertQuery += ', UpdatedAt';
          values += ', GETDATE()';
        }

        insertQuery += `) ${values})`;

        await pool.request()
          .input('departmentId', sql.Int, dept.DepartmentID)
          .input('questionText', sql.NVarChar, cleanQuestion) // This will preserve line breaks
          .query(insertQuery);
      } catch (err) {
        console.error(`Error adding question to department ${dept.DepartmentID}:`, err);
        // Continue with next department even if one fails
      }
    }

    res.json({
      success: true,
      message: `Question added to ${departments.length} departments`
    });
  } catch (err) {
    console.error('Bulk question error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Also update the single question endpoint if needed
app.post('/api/questions', async (req, res) => {
  try {
    const { departmentId, questionText } = req.body;

    if (!departmentId || !questionText || !questionText.trim()) {
      return res.status(400).json({ error: 'Department ID and question text are required' });
    }

    const pool = await getPool();
    
    // Preserve line breaks in the question text
    const cleanQuestion = questionText.trim();
    const hasIsActive = await checkColumnExists('SurveyQuestions', 'IsActive');

    // If IsActive column exists, deactivate other questions first
    if (hasIsActive) {
      await pool.request()
        .input('departmentId', sql.Int, departmentId)
        .query('UPDATE SurveyQuestions SET IsActive = 0 WHERE DepartmentID = @departmentId');
    }

    // Insert new question with preserved line breaks
    let insertQuery = 'INSERT INTO SurveyQuestions (DepartmentID, QuestionText';
    let values = 'VALUES (@departmentId, @questionText';

    if (hasIsActive) {
      insertQuery += ', IsActive';
      values += ', 1';
    }

    if (await checkColumnExists('SurveyQuestions', 'CreatedAt')) {
      insertQuery += ', CreatedAt';
      values += ', GETDATE()';
    }

    if (await checkColumnExists('SurveyQuestions', 'UpdatedAt')) {
      insertQuery += ', UpdatedAt';
      values += ', GETDATE()';
    }

    insertQuery += `) ${values})`;

    await pool.request()
      .input('departmentId', sql.Int, departmentId)
      .input('questionText', sql.NVarChar, cleanQuestion) // This will preserve line breaks
      .query(insertQuery);

    res.json({ success: true, message: 'Question added successfully' });
  } catch (err) {
    console.error('Add question error:', err);
    res.status(500).json({ error: err.message });
  }
});
// Get current user info
app.get('/api/admin/me', authenticateJWT(), async (req, res) => {
  try {
    res.json({
      userId: req.user.UserID,
      username: req.user.Username,
      userLevel: req.user.UserLevel
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/departments/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const pool = await getPool();

    const result = await pool.request()
      .input('slug', sql.NVarChar, slug)
      .query('SELECT DepartmentID, Name, Slug, IsActive FROM Departments WHERE Slug = @slug AND IsActive = 1');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Department not found or inactive' });
    }

    const department = result.recordset[0];
    res.json({
      id: department.DepartmentID,
      name: department.Name,
      slug: department.Slug,
      isActive: department.IsActive
    });
  } catch (err) {
    console.error('Error fetching department by slug:', err);
    res.status(500).json({ error: 'Failed to fetch department information' });
  }
});

// Get history data with optional filters
app.get('/api/reports/history', async (req, res) => {
  try {
    const { departmentId, startDate, endDate } = req.query;
    const pool = await getPool();

    let query = `
      SELECT 
        d.Name as department,
        q.QuestionText as question,
        q.QuestionID,
        d.DepartmentID,
        q.CreatedAt,
        COUNT(a.AnswerID) as totalResponses
      FROM Departments d
      LEFT JOIN SurveyQuestions q ON d.DepartmentID = q.DepartmentID
      LEFT JOIN SurveyAnswers a ON q.QuestionID = a.QuestionID
      WHERE 1=1`;

    const request = pool.request();

    // department filter
    if (departmentId) {
      query += ' AND d.DepartmentID = @departmentId';
      request.input('departmentId', sql.Int, departmentId);
    }

    // date filters
    if (startDate) {
      query += ' AND q.CreatedAt >= @startDate';
      request.input('startDate', sql.DateTime, startDate);
    }

    if (endDate) {
      query += ' AND q.CreatedAt <= @endDate';
      request.input('endDate', sql.DateTime, endDate + ' 23:59:59');
    }

    query += `
      GROUP BY d.Name, q.QuestionText, q.QuestionID, d.DepartmentID, q.CreatedAt
      HAVING q.QuestionText IS NOT NULL
      ORDER BY q.CreatedAt DESC`;

    const result = await request.query(query);
    const reports = [];

    // Process each question to get detailed emoji data
    for (const row of result.recordset) {
      const hasEmojiID = await checkColumnExists('SurveyAnswers', 'EmojiID');

      let emojiQuery;
      if (hasEmojiID) {
        emojiQuery = `
          SELECT EmojiID, COUNT(*) as Count
          FROM SurveyAnswers
          WHERE QuestionID = @questionId AND EmojiID IS NOT NULL
          GROUP BY EmojiID
          ORDER BY EmojiID`;
      } else {
        emojiQuery = `
          SELECT AnswerEmoji, COUNT(*) as Count
          FROM SurveyAnswers
          WHERE QuestionID = @questionId
          GROUP BY AnswerEmoji
          ORDER BY Count DESC`;
      }

      const emojiResult = await pool.request()
        .input('questionId', sql.Int, row.QuestionID)
        .query(emojiQuery);

      // Initialize emoji counts
      const emojiCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      // Update counts based on results
      if (hasEmojiID) {
        emojiResult.recordset.forEach(emoji => {
          if (emojiCounts.hasOwnProperty(emoji.EmojiID)) {
            emojiCounts[emoji.EmojiID] = emoji.Count;
          }
        });
      } else {
        // Map emoji characters to IDs
        const emojiMap = { '😍': 1, '😊': 2, '😐': 3, '😞': 4, '😡': 5 };
        emojiResult.recordset.forEach(emoji => {
          const emojiId = emojiMap[emoji.AnswerEmoji];
          if (emojiId && emojiCounts.hasOwnProperty(emojiId)) {
            emojiCounts[emojiId] = emoji.Count;
          }
        });
      }

      // Convert to display format
      const emojiData = [
        { emoji: '😍', label: 'Excellent', count: emojiCounts[1], id: 1 },
        { emoji: '😊', label: 'Good', count: emojiCounts[2], id: 2 },
        { emoji: '😐', label: 'Okay', count: emojiCounts[3], id: 3 },
        { emoji: '😞', label: 'Poor', count: emojiCounts[4], id: 4 },
        { emoji: '😡', label: 'Terrible', count: emojiCounts[5], id: 5 }
      ];

      reports.push({
        department: row.department,
        question: row.question,
        questionId: row.QuestionID,
        departmentId: row.DepartmentID,
        createdAt: row.CreatedAt,
        totalResponses: row.totalResponses,
        emojiData: emojiData
      });
    }

    res.json(reports);
  } catch (err) {
    console.error('Error fetching history data:', err);
    res.status(500).json({ error: err.message });
  }
});

// REMOVED: Password reset endpoint and password expiry check endpoint

// Export reports to Excel
app.get('/api/reports/export', async (req, res) => {
  try {
    const { departmentId, startDate, endDate } = req.query;
    const pool = await getPool();

    // Get detailed report data
    let query = `
      SELECT 
        d.Name as department,
        q.QuestionText as question,
        q.QuestionID,
        q.CreatedAt,
        a.AnswerEmoji,
        a.AnsweredAt,
        a.AnswerID`;

    const hasEmojiID = await checkColumnExists('SurveyAnswers', 'EmojiID');
    if (hasEmojiID) {
      query += ', a.EmojiID';
    }

    query += `
      FROM Departments d
      JOIN SurveyQuestions q ON d.DepartmentID = q.DepartmentID
      LEFT JOIN SurveyAnswers a ON q.QuestionID = a.QuestionID
      WHERE q.QuestionText IS NOT NULL`;

    const request = pool.request();

    // Add filters
    if (departmentId) {
      query += ' AND d.DepartmentID = @departmentId';
      request.input('departmentId', sql.Int, departmentId);
    }

    if (startDate) {
      query += ' AND q.CreatedAt >= @startDate';
      request.input('startDate', sql.DateTime, startDate);
    }

    if (endDate) {
      query += ' AND q.CreatedAt <= @endDate';
      request.input('endDate', sql.DateTime, endDate + ' 23:59:59');
    }

    query += ' ORDER BY d.Name, q.CreatedAt DESC, a.AnsweredAt DESC';

    const result = await request.query(query);

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();

    // Summary Sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Department', key: 'department', width: 25 },
      { header: 'Question', key: 'question', width: 50 },
      { header: 'Question Created', key: 'createdAt', width: 20 },
      { header: 'Total Responses', key: 'totalResponses', width: 15 },
      { header: 'Excellent (😍)', key: 'excellent', width: 15 },
      { header: 'Good (😊)', key: 'good', width: 15 },
      { header: 'Okay (😐)', key: 'okay', width: 15 },
      { header: 'Poor (😞)', key: 'poor', width: 15 },
      { header: 'Terrible (😡)', key: 'terrible', width: 15 }
    ];

    // Group data by question for summary
    const questionGroups = {};
    result.recordset.forEach(row => {
      const key = `${row.department}_${row.QuestionID}`;
      if (!questionGroups[key]) {
        questionGroups[key] = {
          department: row.department,
          question: row.question,
          createdAt: row.CreatedAt,
          responses: []
        };
      }
      if (row.AnswerID) {
        questionGroups[key].responses.push(row);
      }
    });

    // Add summary data
    Object.values(questionGroups).forEach(group => {
      const emojiCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      group.responses.forEach(response => {
        if (hasEmojiID && response.EmojiID) {
          emojiCounts[response.EmojiID]++;
        } else {
          // Map emoji characters to IDs
          const emojiMap = { '😍': 1, '😊': 2, '😐': 3, '😞': 4, '😡': 5 };
          const emojiId = emojiMap[response.AnswerEmoji];
          if (emojiId) {
            emojiCounts[emojiId]++;
          }
        }
      });

      summarySheet.addRow({
        department: group.department,
        question: group.question,
        createdAt: group.createdAt ? new Date(group.createdAt).toLocaleDateString() : '',
        totalResponses: group.responses.length,
        excellent: emojiCounts[1],
        good: emojiCounts[2],
        okay: emojiCounts[3],
        poor: emojiCounts[4],
        terrible: emojiCounts[5]
      });
    });

    // Raw Data Sheet
    const rawDataSheet = workbook.addWorksheet('Raw Data');
    const rawColumns = [
      { header: 'Department', key: 'department', width: 25 },
      { header: 'Question', key: 'question', width: 50 },
      { header: 'Question Created', key: 'questionCreated', width: 20 },
      { header: 'Answer Emoji', key: 'answerEmoji', width: 15 },
      { header: 'Answer Label', key: 'answerLabel', width: 15 },
      { header: 'Answered At', key: 'answeredAt', width: 20 }
    ];



    if (hasEmojiID) {
      rawColumns.push({ header: 'Emoji ID', key: 'emojiId', width: 10 });
    }

    rawDataSheet.columns = rawColumns;

    // Add raw data
    const emojiLabels = { 1: 'Excellent', 2: 'Good', 3: 'Okay', 4: 'Poor', 5: 'Terrible' };
    const emojiChars = { 1: '😍', 2: '😊', 3: '😐', 4: '😞', 5: '😡' };

    result.recordset.forEach(row => {
      if (row.AnswerID) {
        const rowData = {
          department: row.department,
          question: row.question,
          questionCreated: row.CreatedAt ? new Date(row.CreatedAt).toLocaleDateString() : '',
          answerEmoji: row.AnswerEmoji,
          answeredAt: row.AnsweredAt ? new Date(row.AnsweredAt).toLocaleString() : ''
        };

        if (hasEmojiID && row.EmojiID) {
          rowData.emojiId = row.EmojiID;
          rowData.answerLabel = emojiLabels[row.EmojiID] || 'Unknown';
          if (!rowData.answerEmoji) {
            rowData.answerEmoji = emojiChars[row.EmojiID] || '';
          }
        } else {
          // Try to determine label from emoji character
          const emojiMap = { '😍': 1, '😊': 2, '😐': 3, '😞': 4, '😡': 5 };
          const emojiId = emojiMap[row.AnswerEmoji];
          rowData.answerLabel = emojiId ? emojiLabels[emojiId] : 'Unknown';
          if (hasEmojiID) {
            rowData.emojiId = emojiId || null;
          }
        }

        rawDataSheet.addRow(rowData);
      }
    });

    // Style the headers
    [summarySheet, rawDataSheet].forEach(sheet => {
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6E6FA' }
      };
    });

    // Set response headers
    const filename = `Survey_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Send the workbook
    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('Error exporting to Excel:', err);
    res.status(500).json({ error: err.message });
  }
});

// Check if column exists in table
async function checkColumnExists(tableName, columnName) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('tableName', sql.NVarChar, tableName)
      .input('columnName', sql.NVarChar, columnName)
      .query(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = @tableName AND COLUMN_NAME = @columnName
      `);
    return result.recordset[0].count > 0;
  } catch (err) {
    console.error(`Error checking column ${columnName} in ${tableName}:`, err);
    return false;
  }
}

// Add EmojiID column to SurveyAnswers table if it doesn't exist
async function ensureEmojiIDColumn() {
  try {
    const pool = await getPool();
    const hasEmojiID = await checkColumnExists('SurveyAnswers', 'EmojiID');

    if (!hasEmojiID) {
      console.log('Adding EmojiID column to SurveyAnswers table...');
      await pool.request().query(`
        ALTER TABLE SurveyAnswers 
        ADD EmojiID int NULL
      `);
      console.log('EmojiID column added successfully');
    }
  } catch (err) {
    console.error('Error adding EmojiID column:', err);
  }
}

// Initialize database connection on startup
initializeDatabase()
  .then(() => ensureEmojiIDColumn())
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

// ROUTES

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT 1 as test');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (err) {
    console.error('Health check error:', err);
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

// Get database schema info
app.get('/api/schema', async (req, res) => {
  try {
    const pool = await getPool();

    // Get table info
    const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE' 
      ORDER BY TABLE_NAME
    `);

    const schema = {};
    for (const table of tablesResult.recordset) {
      const columnsResult = await pool.request()
        .input('tableName', sql.NVarChar, table.TABLE_NAME)
        .query(`
          SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = @tableName
          ORDER BY ORDINAL_POSITION
        `);

      schema[table.TABLE_NAME] = columnsResult.recordset;
    }

    res.json(schema);
  } catch (err) {
    console.error('Error getting schema:', err);
    res.status(500).json({ error: err.message });
  }
});

// DEPARTMENT ROUTES - Basic version without IsActive and Slug checks
app.get('/api/departments', async (req, res) => {
  try {
    const pool = await getPool();

    // Check if Slug column exists
    const hasSlug = await checkColumnExists('Departments', 'Slug');
    const hasIsActive = await checkColumnExists('Departments', 'IsActive');

    let query = 'SELECT DepartmentID, Name';

    if (hasSlug) {
      query += ', Slug as URLSlug';
    } else {
      // Generate slug from name if Slug column doesn't exist
      query += ', LOWER(REPLACE(Name, \' \', \'-\')) as URLSlug';
    }

    query += ' FROM Departments';

    if (hasIsActive) {
      query += ' WHERE IsActive = 1';
    }

    query += ' ORDER BY Name';

    const result = await pool.request().query(query);
    console.log('Departments fetched:', result.recordset);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('Error fetching departments:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add new department - Updated with random unique slug
app.post('/api/departments', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Department name is required' });
    }

    const cleanName = name.trim();
    const pool = await getPool();

    // Generate unique random slug
    const urlSlug = await generateUniqueSlug(pool);

    // Check what columns exist
    const hasSlug = await checkColumnExists('Departments', 'Slug');
    const hasIsActive = await checkColumnExists('Departments', 'IsActive');
    const hasCreatedAt = await checkColumnExists('Departments', 'CreatedAt');
    const hasUpdatedAt = await checkColumnExists('Departments', 'UpdatedAt');

    let query = 'INSERT INTO Departments (Name';
    let values = 'VALUES (@name';

    if (hasSlug) {
      query += ', Slug';
      values += ', @urlSlug';
    }

    if (hasIsActive) {
      query += ', IsActive';
      values += ', 1';
    }

    if (hasCreatedAt) {
      query += ', CreatedAt';
      values += ', GETDATE()';
    }

    if (hasUpdatedAt) {
      query += ', UpdatedAt';
      values += ', GETDATE()';
    }

    query += `) ${values})`;

    const request = pool.request().input('name', sql.NVarChar, cleanName);

    if (hasSlug) {
      request.input('urlSlug', sql.NVarChar, urlSlug);
    }

    await request.query(query);

    res.json({ success: true, urlSlug });
  } catch (err) {
    console.error('Error adding department:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update department - Only update name, keep existing slug
app.put('/api/departments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Department name is required' });
    }

    const cleanName = name.trim();
    const pool = await getPool();

    // Check if UpdatedAt column exists
    const hasUpdatedAt = await checkColumnExists('Departments', 'UpdatedAt');

    // Only update name and UpdatedAt, keep the existing slug unchanged
    let query = 'UPDATE Departments SET Name = @name';

    if (hasUpdatedAt) {
      query += ', UpdatedAt = GETDATE()';
    }

    query += ' WHERE DepartmentID = @id';

    const request = pool.request()
      .input('name', sql.NVarChar, cleanName)
      .input('id', sql.Int, id);

    const result = await request.query(query);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating department:', err);
    res.status(500).json({ error: err.message });
  }
});


// Delete department
app.delete('/api/departments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();

    // First check if department has any questions
    const questionCheck = await pool.request()
      .input('departmentId', sql.Int, id)
      .query('SELECT COUNT(*) as questionCount FROM SurveyQuestions WHERE DepartmentID = @departmentId');

    if (questionCheck.recordset[0].questionCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete department with existing questions. Delete questions first.'
      });
    }

    // Check if IsActive column exists (soft delete)
    const hasIsActive = await checkColumnExists('Departments', 'IsActive');

    let query;
    if (hasIsActive) {
      query = 'UPDATE Departments SET IsActive = 0 WHERE DepartmentID = @id';
    } else {
      query = 'DELETE FROM Departments WHERE DepartmentID = @id';
    }

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(query);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting department:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get questions by department ID
app.get('/api/departments/:id/questions', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();

    let query = `
      SELECT 
        QuestionID,
        QuestionText,
        IsActive,
        CreatedAt
      FROM SurveyQuestions
      WHERE DepartmentID = @departmentId
      ORDER BY CreatedAt DESC`;

    const result = await pool.request()
      .input('departmentId', sql.Int, id)
      .query(query);

    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching department questions:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get questions for department - Basic version
app.get('/api/departments/:slug/questions', async (req, res) => {
  try {
    const { slug } = req.params;
    const pool = await getPool();

    const hasSlug = await checkColumnExists('Departments', 'Slug');
    const hasIsActive = await checkColumnExists('Departments', 'IsActive');

    let deptQuery = 'SELECT DepartmentID FROM Departments WHERE ';

    if (hasSlug) {
      deptQuery += 'Slug = @slug';
    } else {
      deptQuery += 'LOWER(REPLACE(Name, \' \', \'-\')) = @slug';
    }

    if (hasIsActive) {
      deptQuery += ' AND IsActive = 1';
    }

    const deptResult = await pool.request()
      .input('slug', sql.NVarChar, slug)
      .query(deptQuery);

    if (deptResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    const departmentId = deptResult.recordset[0].DepartmentID;

    let questionQuery = 'SELECT QuestionID, QuestionText';

    if (await checkColumnExists('SurveyQuestions', 'IsActive')) {
      questionQuery += ', IsActive';
    }

    if (await checkColumnExists('SurveyQuestions', 'CreatedAt')) {
      questionQuery += ', CreatedAt';
    }

    questionQuery += ' FROM SurveyQuestions WHERE DepartmentID = @departmentId';

    if (await checkColumnExists('SurveyQuestions', 'CreatedAt')) {
      questionQuery += ' ORDER BY CreatedAt DESC';
    }

    const questions = await pool.request()
      .input('departmentId', sql.Int, departmentId)
      .query(questionQuery);

    res.json(questions.recordset);
  } catch (err) {
    console.error('Error fetching questions for department:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get active question for department - Basic version
app.get('/api/departments/:slug/active-question', async (req, res) => {
  try {
    const { slug } = req.params;
    const pool = await getPool();

    const hasSlug = await checkColumnExists('Departments', 'Slug');
    const hasIsActive = await checkColumnExists('SurveyQuestions', 'IsActive');

    let query = `
      SELECT TOP 1 q.QuestionID, q.QuestionText
      FROM SurveyQuestions q
      JOIN Departments d ON q.DepartmentID = d.DepartmentID
      WHERE `;

    if (hasSlug) {
      query += 'd.Slug = @slug';
    } else {
      query += 'LOWER(REPLACE(d.Name, \' \', \'-\')) = @slug';
    }

    if (hasIsActive) {
      query += ' AND q.IsActive = 1';
    }

    if (await checkColumnExists('SurveyQuestions', 'CreatedAt')) {
      query += ' ORDER BY q.CreatedAt DESC';
    }

    const result = await pool.request()
      .input('slug', sql.NVarChar, slug)
      .query(query);

    if (result.recordset.length > 0) {
      res.json(result.recordset[0]);
    } else {
      res.status(404).json({ error: 'No active question found' });
    }
  } catch (err) {
    console.error('Error fetching active question:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add new question - Basic version
app.post('/api/departments/:slug/questions', async (req, res) => {
  try {
    const { slug } = req.params;
    const { questionText } = req.body;

    if (!questionText || !questionText.trim()) {
      return res.status(400).json({ error: 'Question text is required' });
    }

    const pool = await getPool();

    const hasSlug = await checkColumnExists('Departments', 'Slug');
    const hasIsActive = await checkColumnExists('SurveyQuestions', 'IsActive');

    // Get department ID
    let deptQuery = 'SELECT DepartmentID FROM Departments WHERE ';

    if (hasSlug) {
      deptQuery += 'Slug = @slug';
    } else {
      deptQuery += 'LOWER(REPLACE(Name, \' \', \'-\')) = @slug';
    }

    const deptResult = await pool.request()
      .input('slug', sql.NVarChar, slug)
      .query(deptQuery);

    if (deptResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    const departmentId = deptResult.recordset[0].DepartmentID;

    // If IsActive column exists, deactivate other questions first
    if (hasIsActive) {
      await pool.request()
        .input('departmentId', sql.Int, departmentId)
        .query('UPDATE SurveyQuestions SET IsActive = 0 WHERE DepartmentID = @departmentId');
    }

    // Add new question
    let insertQuery = 'INSERT INTO SurveyQuestions (DepartmentID, QuestionText';
    let values = 'VALUES (@departmentId, @questionText';

    if (hasIsActive) {
      insertQuery += ', IsActive';
      values += ', 1';
    }

    if (await checkColumnExists('SurveyQuestions', 'CreatedAt')) {
      insertQuery += ', CreatedAt';
      values += ', GETDATE()';
    }

    if (await checkColumnExists('SurveyQuestions', 'UpdatedAt')) {
      insertQuery += ', UpdatedAt';
      values += ', GETDATE()';
    }

    insertQuery += `) ${values})`;

    await pool.request()
      .input('departmentId', sql.Int, departmentId)
      .input('questionText', sql.NVarChar, questionText.trim())
      .query(insertQuery);

    res.json({ success: true });
  } catch (err) {
    console.error('Error adding question:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get ALL questions - Basic version
app.get('/api/questions', async (req, res) => {
  try {
    const pool = await getPool();

    let query = 'SELECT q.QuestionID, q.QuestionText, q.DepartmentID';

    if (await checkColumnExists('SurveyQuestions', 'IsActive')) {
      query += ', q.IsActive';
    }

    if (await checkColumnExists('SurveyQuestions', 'CreatedAt')) {
      query += ', q.CreatedAt';
    }

    query += ' FROM SurveyQuestions q';

    if (await checkColumnExists('SurveyQuestions', 'CreatedAt')) {
      query += ' ORDER BY q.CreatedAt DESC';
    }

    const result = await pool.request().query(query);

    console.log('Questions query result:', result.recordset);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('Error fetching questions:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all reports - Updated to include EmojiID
app.get('/api/reports', async (req, res) => {
  try {
    const pool = await getPool();

    // Get all departments
    const deptResult = await pool.request()
      .query('SELECT DepartmentID, Name FROM Departments ORDER BY Name');

    const reports = [];

    for (const dept of deptResult.recordset) {
      try {
        const hasIsActive = await checkColumnExists('SurveyQuestions', 'IsActive');

        // Get active question for this department
        let questionQuery = `
          SELECT TOP 1 QuestionID, QuestionText
          FROM SurveyQuestions
          WHERE DepartmentID = @deptId`;

        if (hasIsActive) {
          questionQuery += ' AND IsActive = 1';
        }

        if (await checkColumnExists('SurveyQuestions', 'CreatedAt')) {
          questionQuery += ' ORDER BY CreatedAt DESC';
        }

        const questionResult = await pool.request()
          .input('deptId', sql.Int, dept.DepartmentID)
          .query(questionQuery);

        if (questionResult.recordset.length > 0) {
          const question = questionResult.recordset[0];

          // Get total count first
          const totalResult = await pool.request()
            .input('questionId', sql.Int, question.QuestionID)
            .query('SELECT COUNT(*) as TotalCount FROM SurveyAnswers WHERE QuestionID = @questionId');

          const totalCount = totalResult.recordset[0].TotalCount;

          // Get answers grouped by EmojiID
          const hasEmojiID = await checkColumnExists('SurveyAnswers', 'EmojiID');

          let answersQuery;
          if (hasEmojiID) {
            answersQuery = `
              SELECT EmojiID, COUNT(*) as Count,
                     CASE 
                       WHEN ${totalCount} > 0
                       THEN CAST(COUNT(*) * 100.0 / ${totalCount} AS DECIMAL(5,2))
                       ELSE 0
                     END as Percentage
              FROM SurveyAnswers
              WHERE QuestionID = @questionId AND EmojiID IS NOT NULL
              GROUP BY EmojiID
              ORDER BY EmojiID`;
          } else {
            // Fallback to emoji characters if EmojiID doesn't exist
            answersQuery = `
              SELECT AnswerEmoji, COUNT(*) as Count,
                     CASE 
                       WHEN ${totalCount} > 0
                       THEN CAST(COUNT(*) * 100.0 / ${totalCount} AS DECIMAL(5,2))
                       ELSE 0
                     END as Percentage
              FROM SurveyAnswers
              WHERE QuestionID = @questionId
              GROUP BY AnswerEmoji
              ORDER BY Count DESC`;
          }

          const answersResult = await pool.request()
            .input('questionId', sql.Int, question.QuestionID)
            .query(answersQuery);

          reports.push({
            department: dept.Name,
            question: question.QuestionText,
            totalResponses: totalCount,
            responses: answersResult.recordset
          });
        }
      } catch (err) {
        console.error(`Error getting report for department ${dept.Name}:`, err);
      }
    }

    res.json(reports);
  } catch (err) {
    console.error('Error generating reports:', err);
    res.status(500).json({ error: err.message });
  }
});

// Updated answer submission endpoint with DepartmentID support
app.post('/api/questions/:questionId/answers', async (req, res) => {
  try {
    const { questionId } = req.params;
    const { emoji, emojiId } = req.body;

    // Validate that we have either emoji or emojiId
    if (!emoji && !emojiId) {
      return res.status(400).json({ error: 'Either emoji or emojiId is required' });
    }

    const pool = await getPool();

    // First, get the DepartmentID from the question
    const questionResult = await pool.request()
      .input('questionId', sql.Int, questionId)
      .query('SELECT DepartmentID FROM SurveyQuestions WHERE QuestionID = @questionId');

    if (questionResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const departmentId = questionResult.recordset[0].DepartmentID;

    // Check if columns exist
    const hasEmojiID = await checkColumnExists('SurveyAnswers', 'EmojiID');
    const hasDepartmentID = await checkColumnExists('SurveyAnswers', 'DepartmentID');

    let insertQuery = 'INSERT INTO SurveyAnswers (QuestionID';
    let values = 'VALUES (@questionId';

    const request = pool.request()
      .input('questionId', sql.Int, questionId);

    // Include DepartmentID if column exists
    if (hasDepartmentID) {
      insertQuery += ', DepartmentID';
      values += ', @departmentId';
      request.input('departmentId', sql.Int, departmentId);
    }

    // Always include AnswerEmoji for backward compatibility
    if (emoji) {
      insertQuery += ', AnswerEmoji';
      values += ', @emoji';
      request.input('emoji', sql.NVarChar, emoji);
    }

    // Include EmojiID if column exists and emojiId is provided
    if (hasEmojiID && emojiId) {
      insertQuery += ', EmojiID';
      values += ', @emojiId';
      request.input('emojiId', sql.Int, emojiId);
    }

    if (await checkColumnExists('SurveyAnswers', 'AnsweredAt')) {
      insertQuery += ', AnsweredAt';
      values += ', GETDATE()';
    }

    if (await checkColumnExists('SurveyAnswers', 'CreatedAt')) {
      insertQuery += ', CreatedAt';
      values += ', GETDATE()';
    }

    insertQuery += `) ${values})`;

    await request.query(insertQuery);

    res.json({ success: true, departmentId });
  } catch (err) {
    console.error('Error submitting answer:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get emoji statistics across all questions
app.get('/api/emoji-stats', async (req, res) => {
  try {
    const pool = await getPool();
    const hasEmojiID = await checkColumnExists('SurveyAnswers', 'EmojiID');

    let query;
    if (hasEmojiID) {
      query = `
        SELECT EmojiID, COUNT(*) as TotalCount,
               CASE 
                 WHEN (SELECT COUNT(*) FROM SurveyAnswers WHERE EmojiID IS NOT NULL) > 0
                 THEN CAST(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM SurveyAnswers WHERE EmojiID IS NOT NULL) AS DECIMAL(5,2))
                 ELSE 0
               END as Percentage
        FROM SurveyAnswers
        WHERE EmojiID IS NOT NULL
        GROUP BY EmojiID
        ORDER BY EmojiID`;
    } else {
      query = `
        SELECT AnswerEmoji, COUNT(*) as TotalCount,
               CASE 
                 WHEN (SELECT COUNT(*) FROM SurveyAnswers) > 0
                 THEN CAST(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM SurveyAnswers) AS DECIMAL(5,2))
                 ELSE 0
               END as Percentage
        FROM SurveyAnswers
        GROUP BY AnswerEmoji
        ORDER BY TotalCount DESC`;
    }

    const result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching emoji statistics:', err);
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at: http://localhost:${PORT}/api/health`);
  console.log(`Schema check available at: http://localhost:${PORT}/api/schema`);
  console.log(`Emoji statistics available at: http://localhost:${PORT}/api/emoji-stats`);
});
