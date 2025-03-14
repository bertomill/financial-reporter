import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import { useAuth } from '../firebase/auth';
import axios from 'axios';
import Head from 'next/head';

const API_URL = 'http://localhost:8000';

type Report = {
  id: string;
  file_name: string;
  upload_date: string;
  status: 'processing' | 'completed' | 'failed';
  user_id: string;
  analysis?: any;
  error?: string;
};

export default function Dashboard() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [recentReports, setRecentReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
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
      fetchRecentReports();
    }
  }, [currentUser, backendStatus]);

  const checkBackendStatus = async () => {
    try {
      await axios.get(`${API_URL}/api/health`);
      setBackendStatus('online');
    } catch (error) {
      console.error('Backend server is not running:', error);
      setBackendStatus('offline');
    }
  };

  const fetchRecentReports = async () => {
    try {
      setLoading(true);
      // Fetch all reports and filter for the current user
      const response = await axios.get(`${API_URL}/api/reports`);
      console.log('Reports from backend:', response.data);
      
      // Filter reports for the current user
      const userReports = currentUser 
        ? response.data.filter((report: Report) => report.user_id === currentUser.uid)
        : response.data;
      
      // Get the 3 most recent reports
      const sorted = userReports.sort((a: Report, b: Report) => 
        new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime()
      );
      setRecentReports(sorted.slice(0, 3));
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>Financial Reporter</title>
        <meta name="description" content="AI-powered financial report analysis" />
      </Head>
      <Layout title="Dashboard" description="Financial Reporter Dashboard">
        <div className="py-10">
          <header>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
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

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Welcome Card */}
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Welcome, {currentUser.displayName || currentUser.email}
                    </h3>
                    <div className="mt-2 max-w-xl text-sm text-gray-500">
                      <p>
                        Upload financial reports and get AI-powered insights. Our system extracts key information, analyzes sentiment, and identifies important trends.
                      </p>
                    </div>
                    <div className="mt-5">
                      <Link href="/upload">
                        <button
                          type="button"
                          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                          Upload a Report
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      How It Works
                    </h3>
                    <div className="mt-5">
                      <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div className="bg-gray-50 px-4 py-5 sm:p-6 rounded-lg">
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Upload
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            Upload your PDF financial reports
                          </dd>
                        </div>
                        <div className="bg-gray-50 px-4 py-5 sm:p-6 rounded-lg">
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Process
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            AI extracts and analyzes text
                          </dd>
                        </div>
                        <div className="bg-gray-50 px-4 py-5 sm:p-6 rounded-lg">
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Analyze
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            Get sentiment and key points
                          </dd>
                        </div>
                        <div className="bg-gray-50 px-4 py-5 sm:p-6 rounded-lg">
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Insights
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            View detailed analysis results
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Reports */}
              <div className="mt-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">Recent Reports</h2>
                  <Link href="/reports">
                    <span className="text-sm font-medium text-blue-600 hover:text-blue-500 cursor-pointer">
                      View all
                    </span>
                  </Link>
                </div>
                <div className="mt-4 bg-white shadow overflow-hidden sm:rounded-md">
                  {loading ? (
                    <div className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600 mb-4"></div>
                      <p className="text-gray-500">Loading reports...</p>
                    </div>
                  ) : recentReports.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                      {recentReports.map((report) => (
                        <li key={report.id}>
                          <Link href={`/reports/${report.id}`}>
                            <div className="block hover:bg-gray-50 cursor-pointer">
                              <div className="px-4 py-4 sm:px-6">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-blue-600 truncate">
                                    {report.file_name}
                                  </p>
                                  <div className="ml-2 flex-shrink-0 flex">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                      report.status === 'completed' ? 'bg-green-100 text-green-800' :
                                      report.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                                    </span>
                                  </div>
                                </div>
                                <div className="mt-2 sm:flex sm:justify-between">
                                  <div className="sm:flex">
                                    <p className="flex items-center text-sm text-gray-500">
                                      <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                      </svg>
                                      {new Date(report.upload_date).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-center py-12">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No reports</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Get started by uploading your first report.
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
              </div>
            </div>
          </main>
        </div>
      </Layout>
    </>
  );
} 