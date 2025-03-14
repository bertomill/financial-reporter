import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { useAuth } from '../../firebase/auth';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

type Report = {
  id: string;
  file_name: string;
  upload_date: string;
  status: 'processing' | 'completed' | 'failed' | 'extracted' | 'uploaded';
  user_id: string;
  analysis?: any;
  error?: string;
  extracted_text?: string;
};

export default function Reports() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    // Redirect if not logged in
    if (!currentUser) {
      router.push('/login');
      return;
    }

    // Check if backend is running
    checkBackendStatus();
  }, [currentUser, router]);

  useEffect(() => {
    if (currentUser && backendStatus === 'online') {
      fetchReports();
    }
  }, [currentUser, backendStatus]);

  const checkBackendStatus = async () => {
    try {
      await axios.get(`${API_URL}/api/v1/health`);
      setBackendStatus('online');
    } catch (error) {
      console.error('Backend server is not running:', error);
      setBackendStatus('offline');
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      // We're using the user_id as a query parameter, but the backend might not be filtering by it yet
      // That's okay for now since we're using in-memory storage in the backend
      const response = await axios.get(`${API_URL}/api/v1/reports`);
      console.log('Reports from backend:', response.data);
      
      // Filter reports for the current user if needed
      const userReports = currentUser 
        ? response.data.filter((report: Report) => report.user_id === currentUser.uid)
        : response.data;
      
      setReports(userReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setError('Failed to load reports. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchReports();
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'extracted':
        return 'bg-yellow-100 text-yellow-800';
      case 'uploaded':
        return 'bg-gray-100 text-gray-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAnalyze = async (reportId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const response = await axios.post(`${API_URL}/api/v1/reports/${reportId}/analyze`);
      console.log('Analysis triggered:', response.data);
      
      // Update the report status in the list
      setReports(prevReports => 
        prevReports.map(report => 
          report.id === reportId 
            ? { ...report, status: 'processing' } 
            : report
        )
      );
    } catch (error) {
      console.error('Error triggering analysis:', error);
      setError('Failed to start analysis. Please try again later.');
    }
  };

  if (!currentUser) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <Layout title="Reports" description="View your uploaded financial reports">
      <div className="py-10">
        <header className="flex justify-between items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900">Your Reports</h1>
          </div>
          <div className="px-4 sm:px-6 lg:px-8 flex space-x-3">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Refresh
            </button>
            <Link href="/upload">
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                Upload New
              </button>
            </Link>
          </div>
        </header>
        <main>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
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
                      The backend server is not running. Please start the server to view your reports.
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

            {error && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600 mb-4"></div>
                <p className="text-gray-500">Loading reports...</p>
              </div>
            ) : reports.length > 0 ? (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {reports.map((report) => (
                    <li key={report.id}>
                      <Link href={`/reports/${report.id}`}>
                        <div className="block hover:bg-gray-50 cursor-pointer">
                          <div className="px-4 py-4 sm:px-6">
                            <div className="flex items-center justify-between">
                              <div className="truncate">
                                <div className="flex text-sm">
                                  <p className="font-medium text-blue-600 truncate">{report.file_name}</p>
                                </div>
                                <div className="mt-2 flex">
                                  <div className="flex items-center text-sm text-gray-500">
                                    <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                    </svg>
                                    <p>
                                      Uploaded on {new Date(report.upload_date).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="ml-2 flex-shrink-0 flex">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(report.status)}`}>
                                  {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                                </span>
                              </div>
                            </div>
                            {report.status === 'processing' && (
                              <div className="mt-2 flex items-center text-sm text-gray-500">
                                <div className="mr-2 inline-block animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
                                <p>Analysis in progress...</p>
                              </div>
                            )}
                            {report.status === 'extracted' && (
                              <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
                                <p>Text extracted - ready for analysis</p>
                                <button
                                  onClick={(e) => handleAnalyze(report.id, e)}
                                  className="ml-2 inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                  Analyze
                                </button>
                              </div>
                            )}
                            {report.status === 'uploaded' && (
                              <div className="mt-2 flex items-center text-sm text-gray-500">
                                <div className="mr-2 inline-block animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
                                <p>Extracting text...</p>
                              </div>
                            )}
                            {report.status === 'completed' && report.analysis && (
                              <div className="mt-2 text-sm text-gray-500">
                                <p className="truncate">{report.analysis.summary}</p>
                              </div>
                            )}
                            {report.status === 'failed' && (
                              <div className="mt-2 text-sm text-red-500">
                                <p>{report.error || 'Processing failed'}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No reports</h3>
                <p className="mt-1 text-sm text-gray-500">
                  You haven't uploaded any reports yet.
                </p>
                <div className="mt-6">
                  <Link href="/upload">
                    <button
                      type="button"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Upload your first report
                    </button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </Layout>
  );
} 