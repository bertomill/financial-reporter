import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc, 
  doc, 
  orderBy, 
  limit,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from './config';

// Interface for report data
export interface Report {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadDate: Date;
  downloadURL: string;
  userId: string;
  status: 'processing' | 'completed' | 'failed';
  company: string;
  quarter: string;
  year: string;
  analysis?: {
    summary: string;
    keyPoints: string[];
    sentiment: {
      overall: string;
      confidence: number;
      breakdown: {
        positive: number;
        neutral: number;
        negative: number;
      }
    };
    topics: Array<{
      name: string;
      sentiment: string;
      mentions: number;
    }>;
    quotes: Array<{
      text: string;
      speaker: string;
      sentiment: string;
    }>;
  };
}

// Convert Firestore document to Report interface
function convertDoc(doc: QueryDocumentSnapshot<DocumentData>): Report {
  const data = doc.data();
  
  return {
    id: doc.id,
    fileName: data.fileName || '',
    fileSize: data.fileSize || 0,
    fileType: data.fileType || '',
    uploadDate: data.uploadDate?.toDate() || new Date(),
    downloadURL: data.downloadURL || '',
    userId: data.userId || '',
    status: data.status || 'processing',
    company: data.company || 'Unknown Company',
    quarter: data.quarter || '',
    year: data.year || '',
    analysis: data.analysis || null,
  };
}

// Get all reports for a user
export async function getUserReports(userId: string): Promise<Report[]> {
  try {
    const reportsRef = collection(db, 'reports');
    const q = query(
      reportsRef, 
      where('userId', '==', userId),
      orderBy('uploadDate', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(convertDoc);
  } catch (error) {
    console.error('Error getting user reports:', error);
    throw error;
  }
}

// Get a single report by ID
export async function getReportById(reportId: string): Promise<Report | null> {
  try {
    const reportRef = doc(db, 'reports', reportId);
    const reportSnap = await getDoc(reportRef);
    
    if (reportSnap.exists()) {
      const data = reportSnap.data();
      return {
        id: reportSnap.id,
        fileName: data.fileName || '',
        fileSize: data.fileSize || 0,
        fileType: data.fileType || '',
        uploadDate: data.uploadDate?.toDate() || new Date(),
        downloadURL: data.downloadURL || '',
        userId: data.userId || '',
        status: data.status || 'processing',
        company: data.company || 'Unknown Company',
        quarter: data.quarter || '',
        year: data.year || '',
        analysis: data.analysis || null,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting report:', error);
    throw error;
  }
}

// Get recent reports for a user
export async function getRecentReports(userId: string, limitCount: number = 5): Promise<Report[]> {
  try {
    const reportsRef = collection(db, 'reports');
    const q = query(
      reportsRef, 
      where('userId', '==', userId),
      orderBy('uploadDate', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(convertDoc);
  } catch (error) {
    console.error('Error getting recent reports:', error);
    throw error;
  }
} 