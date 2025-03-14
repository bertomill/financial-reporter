const express = require('express');
const cors = require('cors');
const multer = require('multer');
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin SDK
try {
  // Check if running in production or development
  let serviceAccount;
  if (process.env.NODE_ENV === 'production') {
    // In production, use environment variables
    serviceAccount = {
      type: process.env.FIREBASE_TYPE,
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
    };
  } else {
    // In development, use service account file
    console.log('Loading Firebase service account from file');
    try {
      serviceAccount = require('./serviceAccountKey.json');
      console.log('Service account loaded successfully');
      console.log('Project ID:', serviceAccount.project_id);
      console.log('Client email:', serviceAccount.client_email);
    } catch (loadError) {
      console.error('Error loading service account file:', loadError);
      throw loadError;
    }
  }

  console.log('Initializing Firebase Admin SDK');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'financial-reporter-9c731.firebasestorage.app'
  });
  console.log('Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('Firebase admin initialization error', error);
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

// Verify bucket access
console.log('Verifying Firebase Storage bucket access');
bucket.exists().then(data => {
  const exists = data[0];
  console.log('Bucket exists:', exists);
}).catch(error => {
  console.error('Error verifying bucket access:', error);
});

const app = express();
const port = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadDir = path.join(__dirname, 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    }
  }),
  fileFilter: function (req, file, cb) {
    // Accept only PDF files
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed!'), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Routes
app.get('/', (req, res) => {
  res.send('Financial Reporter API is running');
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Get all reports
app.get('/api/reports', async (req, res) => {
  try {
    console.log('Fetching all reports');
    const reportsSnapshot = await db.collection('reports').get();
    const reports = [];
    
    reportsSnapshot.forEach(doc => {
      reports.push({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore Timestamp to ISO string for easier handling in frontend
        upload_date: doc.data().uploadDate ? doc.data().uploadDate.toDate().toISOString() : new Date().toISOString()
      });
    });
    
    console.log(`Fetched ${reports.length} reports`);
    res.status(200).json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports', details: error.message });
  }
});

// Get a single report by ID
app.get('/api/reports/:id', async (req, res) => {
  try {
    const reportId = req.params.id;
    console.log(`Fetching report with ID: ${reportId}`);
    
    const reportDoc = await db.collection('reports').doc(reportId).get();
    
    if (!reportDoc.exists) {
      console.log(`Report with ID ${reportId} not found`);
      return res.status(404).json({ error: 'Report not found' });
    }
    
    const reportData = reportDoc.data();
    const report = {
      id: reportDoc.id,
      ...reportData,
      // Convert Firestore Timestamp to ISO string for easier handling in frontend
      upload_date: reportData.uploadDate ? reportData.uploadDate.toDate().toISOString() : new Date().toISOString()
    };
    
    console.log(`Fetched report: ${report.id}`);
    res.status(200).json(report);
  } catch (error) {
    console.error(`Error fetching report:`, error);
    res.status(500).json({ error: 'Failed to fetch report', details: error.message });
  }
});

// Upload PDF route
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('Upload request received:', { 
      body: req.body,
      file: req.file ? {
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path
      } : 'No file'
    });

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    console.log('Processing upload for user:', userId);

    // Upload file to Firebase Storage
    const filePath = req.file.path;
    const fileName = `reports/${userId}/${Date.now()}_${req.file.originalname}`;
    
    console.log('Uploading to Firebase Storage:', { filePath, fileName });
    console.log('File exists:', fs.existsSync(filePath));
    console.log('File size:', fs.statSync(filePath).size);
    
    try {
      console.log('Starting bucket upload...');
      await bucket.upload(filePath, {
        destination: fileName,
        metadata: {
          contentType: 'application/pdf',
        }
      });
      console.log('Successfully uploaded to Firebase Storage');
    } catch (storageError) {
      console.error('Firebase Storage upload error:', storageError);
      console.error('Error details:', JSON.stringify(storageError, null, 2));
      return res.status(500).json({ 
        error: 'Failed to upload to Firebase Storage',
        details: storageError.message
      });
    }

    // Get download URL
    console.log('Getting signed URL');
    let url;
    try {
      [url] = await bucket.file(fileName).getSignedUrl({
        action: 'read',
        expires: '03-01-2500', // Long expiration
      });
      console.log('Got signed URL:', url);
    } catch (urlError) {
      console.error('Error getting signed URL:', urlError);
      return res.status(500).json({ 
        error: 'Failed to get download URL',
        details: urlError.message
      });
    }

    // Extract company name, quarter, and year from filename
    const extractCompanyName = (fileName) => {
      const parts = fileName.split('_');
      if (parts.length > 0) {
        return parts[0].replace(/[-\.]/g, ' ');
      }
      return 'Unknown Company';
    };

    const extractQuarter = (fileName) => {
      if (fileName.toLowerCase().includes('q1')) return 'Q1';
      if (fileName.toLowerCase().includes('q2')) return 'Q2';
      if (fileName.toLowerCase().includes('q3')) return 'Q3';
      if (fileName.toLowerCase().includes('q4')) return 'Q4';
      return '';
    };

    const extractYear = (fileName) => {
      const yearMatch = fileName.match(/20\d{2}/);
      if (yearMatch) {
        return yearMatch[0];
      }
      return new Date().getFullYear().toString();
    };

    // Create document in Firestore
    console.log('Creating Firestore document');
    let reportRef;
    try {
      reportRef = await db.collection('reports').add({
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        uploadDate: admin.firestore.FieldValue.serverTimestamp(),
        downloadURL: url,
        userId: userId,
        status: 'processing',
        company: extractCompanyName(req.file.originalname),
        quarter: extractQuarter(req.file.originalname),
        year: extractYear(req.file.originalname),
      });
      console.log('Created Firestore document with ID:', reportRef.id);
    } catch (firestoreError) {
      console.error('Firestore document creation error:', firestoreError);
      return res.status(500).json({ 
        error: 'Failed to create document in Firestore',
        details: firestoreError.message
      });
    }

    // Clean up the temporary file
    try {
      fs.unlinkSync(filePath);
      console.log('Temporary file cleaned up:', filePath);
    } catch (cleanupError) {
      console.warn('Failed to clean up temporary file:', cleanupError);
      // Continue despite cleanup error
    }

    // Return success response
    console.log('Upload process completed successfully');
    res.status(200).json({
      success: true,
      reportId: reportRef.id,
      downloadURL: url
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    // Provide more detailed error information
    const errorResponse = {
      error: 'Failed to upload file',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      code: error.code
    };
    res.status(500).json(errorResponse);
  }
});

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  console.log('Creating uploads directory:', uploadDir);
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('Uploads directory created successfully');
  } catch (err) {
    console.error('Failed to create uploads directory:', err);
  }
} else {
  console.log('Uploads directory exists:', uploadDir);
}

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 