import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './config';
import { db } from './config';
import { collection, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

/**
 * Uploads a PDF file to the backend server
 * 
 * @param file The PDF file to upload
 * @param userId The ID of the user uploading the file
 * @param onProgress Optional callback for tracking upload progress
 * @returns Object containing the report ID and status
 */
export const uploadPDF = async (
  file: File, 
  userId: string,
  onProgress?: (progress: number) => void
): Promise<{ reportId: string; status: string }> => {
  try {
    console.log('Starting file upload process:', {
      fileName: file.name,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      fileType: file.type,
      userId
    });

    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId);

    console.log('Sending file to backend API');
    
    // Update to use the v1 API endpoint
    const response = await axios.post(`${API_URL}/api/v1/reports/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
    
    console.log('Upload successful, response:', response.data);
    
    // The backend returns { id: "...", status: "processing" } 
    return {
      reportId: response.data.id,
      status: response.data.status
    };
  } catch (error) {
    console.error('Error uploading PDF:', error);
    
    // Enhanced error logging
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      // Log the specific backend error if available
      if (error.response?.data) {
        const errorData = error.response.data;
        console.error('Backend error details:', errorData);
        
        // Enhance the error object with backend details
        if (errorData.detail) {
          error.message = `Server error: ${errorData.detail}`;
        } else if (errorData.error) {
          error.message = `Server error: ${errorData.error}`;
        }
      }
    }
    
    throw error;
  }
};

// Helper function to extract company name from filename (basic implementation)
function extractCompanyName(fileName: string): string {
  // This is a very basic implementation
  // In a real app, you might want to use a more sophisticated approach
  const parts = fileName.split('_');
  if (parts.length > 0) {
    return parts[0].replace(/[-\.]/g, ' ');
  }
  return 'Unknown Company';
}

// Helper function to extract quarter from filename (basic implementation)
function extractQuarter(fileName: string): string {
  if (fileName.toLowerCase().includes('q1')) return 'Q1';
  if (fileName.toLowerCase().includes('q2')) return 'Q2';
  if (fileName.toLowerCase().includes('q3')) return 'Q3';
  if (fileName.toLowerCase().includes('q4')) return 'Q4';
  return '';
}

// Helper function to extract year from filename (basic implementation)
function extractYear(fileName: string): string {
  // Look for a 4-digit number that could be a year
  const yearMatch = fileName.match(/20\d{2}/);
  if (yearMatch) {
    return yearMatch[0];
  }
  return new Date().getFullYear().toString();
}

// Update the report status and add analysis data
export async function updateReportWithAnalysis(reportId: string, analysisData: any) {
  try {
    const reportRef = doc(db, 'reports', reportId);
    await updateDoc(reportRef, {
      status: 'completed',
      analysis: analysisData,
      completedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating report with analysis:', error);
    throw error;
  }
} 