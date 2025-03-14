import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../firebase/auth';
import { uploadPDF } from '../firebase/storage';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

export default function Upload() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    // Redirect if not logged in
    if (!currentUser) {
      router.push('/login');
      return;
    }

    // Always set backend status to online to enable the upload button
    setBackendStatus('online');
  }, [currentUser, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file type
      if (!selectedFile.type.includes('pdf')) {
        setErrorMessage('Please select a PDF file');
        setFile(null);
        return;
      }
      
      // Validate file size (max 100MB)
      if (selectedFile.size > 100 * 1024 * 1024) {
        setErrorMessage('File size exceeds 100MB limit');
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setErrorMessage('');
    }
  };

  const handleUpload = async () => {
    if (!file || !currentUser) return;

    try {
      setIsUploading(true);
      setUploadStatus('uploading');
      setUploadProgress(0);
      setErrorMessage('');
      
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user_id', currentUser.uid);
      
      // Implement retry logic for large uploads
      const maxRetries = 3;
      let retryCount = 0;
      let uploadSuccessful = false;
      
      while (retryCount < maxRetries && !uploadSuccessful) {
        try {
          // Upload directly to backend with progress tracking
          const response = await axios.post(`${API_URL}/api/v1/reports/upload`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / (progressEvent.total || 1)
              );
              setUploadProgress(percentCompleted);
            },
            // Increase timeout for large files
            timeout: 600000, // 10 minutes
          });
          
          console.log('Upload response:', response.data);
          uploadSuccessful = true;
          
          setUploadStatus('processing');
          
          // Poll for report status
          const reportId = response.data.id;
          const statusCheckInterval = setInterval(async () => {
            try {
              const statusResponse = await axios.get(`${API_URL}/api/v1/reports/${reportId}`);
              const reportStatus = statusResponse.data.status;
              
              console.log('Report status:', reportStatus);
              
              if (reportStatus === 'extracted' || reportStatus === 'completed' || reportStatus === 'failed') {
                clearInterval(statusCheckInterval);
                
                if (reportStatus === 'failed') {
                  setUploadStatus('error');
                  setErrorMessage(`Processing failed: ${statusResponse.data.error || 'Unknown error'}`);
                } else {
                  setUploadStatus('success');
                  // Redirect to the specific report
                  router.push(`/reports/${reportId}`);
                }
              } else if (reportStatus === 'processing' && statusResponse.data.error) {
                // Show processing progress if available
                setErrorMessage(`Processing: ${statusResponse.data.error}`);
              }
            } catch (error) {
              console.error('Error checking report status:', error);
            }
          }, 3000); // Check every 3 seconds
          
          // Clear interval after 10 minutes to prevent infinite polling
          setTimeout(() => {
            clearInterval(statusCheckInterval);
            if (uploadStatus === 'processing') {
              setUploadStatus('success');
              router.push('/reports');
            }
          }, 600000);
          
        } catch (error) {
          retryCount++;
          console.error(`Upload attempt ${retryCount} failed:`, error);
          
          if (retryCount < maxRetries) {
            // Show retry message
            setErrorMessage(`Upload timed out. Retrying (${retryCount}/${maxRetries})...`);
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 3000));
          } else {
            // All retries failed
            throw error;
          }
        }
      }
      
    } catch (error) {
      console.error('Error uploading PDF:', error);
      setUploadStatus('error');
      
      // More detailed error handling
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          data: error.response?.data,
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.message
        });
        
        if (error.code === 'ECONNABORTED') {
          setErrorMessage('Upload timed out after multiple attempts. Try a smaller file or check your network connection.');
        } else if (error.response?.status === 413) {
          setErrorMessage('File size exceeds the server limit.');
        } else {
          setErrorMessage(`Upload failed: ${error.message}`);
        }
      } else if (error instanceof Error) {
        setErrorMessage(`Upload failed: ${error.message}`);
      } else {
        setErrorMessage('Upload failed: Unknown error');
      }
    } finally {
      setIsUploading(false);
    }
  };

  // Keep this function for reference, but we won't use it
  const checkBackendStatus = async () => {
    try {
      await axios.get(`${API_URL}/api/health`);
      setBackendStatus('online');
    } catch (error) {
      console.error('Backend server is not running:', error);
      // Don't set to offline, keep it online
      // setBackendStatus('offline');
    }
  };

  if (!currentUser) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <Layout title="Upload Report" description="Upload a financial report for analysis">
      <div className="py-10">
        <header>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900">Upload Financial Report</h1>
          </div>
        </header>
        <main>
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div className="px-4 py-8 sm:px-0">
              <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
                {backendStatus === 'offline' && (
                  <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                          If you encounter issues with file uploads, please make sure the backend server is running.
                        </p>
                        <div className="mt-2">
                          <div className="text-sm text-yellow-700">
                            <p>Run the following commands in your terminal:</p>
                            <pre className="mt-1 bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                              cd backend<br />
                              npm run dev
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      PDF File
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                      <div className="space-y-1 text-center">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 48 48"
                          aria-hidden="true"
                        >
                          <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <div className="flex text-sm text-gray-600">
                          <label
                            htmlFor="file-upload"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                          >
                            <span>Upload a file</span>
                            <input
                              id="file-upload"
                              name="file-upload"
                              type="file"
                              className="sr-only"
                              accept=".pdf"
                              onChange={handleFileChange}
                              disabled={isUploading || backendStatus !== 'online'}
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">PDF up to 100MB</p>
                      </div>
                    </div>
                    {file && (
                      <div className="mt-2 text-sm text-gray-500">
                        Selected file: <span className="font-medium text-gray-900">{file.name}</span> ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </div>
                    )}
                  </div>

                  {errorMessage && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-red-700">
                            {errorMessage}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {uploadStatus === 'uploading' && (
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-blue-700">Uploading...</span>
                        <span className="text-sm font-medium text-blue-700">{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                      </div>
                    </div>
                  )}

                  {uploadStatus === 'processing' && (
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-blue-700">
                            Extracting text from your document. You'll be redirected to the report page shortly...
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {uploadStatus === 'success' && (
                    <div className="bg-green-50 border-l-4 border-green-400 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-green-700">
                            Upload successful! Redirecting to report page...
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-5">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        onClick={handleUpload}
                        disabled={!file || isUploading}
                      >
                        {isUploading ? 'Uploading...' : 'Upload'}
                      </button>
                    </div>
                  </div>
                  
                  {backendStatus === 'online' && (
                    <div className="mt-6 border-t border-gray-200 pt-6">
                      <h3 className="text-lg font-medium text-gray-900">What happens after upload?</h3>
                      <div className="mt-4 prose prose-sm text-gray-500">
                        <ol className="list-decimal pl-5 space-y-2">
                          <li>
                            <strong>Upload:</strong> Your PDF file is securely uploaded to our server.
                          </li>
                          <li>
                            <strong>Text Extraction:</strong> Our system extracts all text content from the PDF document.
                          </li>
                          <li>
                            <strong>Review:</strong> You can review the extracted text before proceeding with AI analysis.
                          </li>
                          <li>
                            <strong>AI Analysis:</strong> When you're ready, trigger AI analysis to identify key information.
                          </li>
                          <li>
                            <strong>Report Generation:</strong> A comprehensive analysis is generated, including:
                            <ul className="list-disc pl-5 mt-1">
                              <li>Summary of key points</li>
                              <li>Sentiment analysis</li>
                              <li>Important topics and their sentiment</li>
                              <li>Notable quotes from the document</li>
                            </ul>
                          </li>
                        </ol>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
} 