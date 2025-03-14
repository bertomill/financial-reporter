import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { useAuth } from '../../firebase/auth';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

type ReportAnalysis = {
  summary: string;
  key_points: string[];
  sentiment: {
    overall: 'positive' | 'neutral' | 'negative';
    confidence: number;
    breakdown: {
      positive: number;
      neutral: number;
      negative: number;
    }
  };
  topics: Array<{
    name: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    mentions: number;
  }>;
  quotes?: Array<{
    text: string;
    speaker: string;
    sentiment: 'positive' | 'neutral' | 'negative';
  }>;
};

type Report = {
  id: string;
  file_name: string;
  upload_date: string;
  status: 'processing' | 'completed' | 'failed' | 'extracted' | 'uploaded';
  user_id: string;
  analysis?: ReportAnalysis;
  error?: string;
  extracted_text?: string;
};

export default function ReportDetails() {
  const router = useRouter();
  const { id } = router.query;
  const { currentUser } = useAuth();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline'>('online');

  useEffect(() => {
    // Redirect if not logged in
    if (!currentUser) {
      router.push('/login');
      return;
    }

    // Only fetch if we have an ID
    if (id) {
      fetchReport();
      
      // Set up automatic refresh for processing reports
      const interval = setInterval(() => {
        if (report && report.status === 'processing') {
          fetchReport();
        }
      }, 5000); // Refresh every 5 seconds
      
      setRefreshInterval(interval);
    }
    
    // Clean up interval on unmount
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [currentUser, id, router]);
  
  // Update refresh behavior when report status changes
  useEffect(() => {
    if (report && report.status !== 'processing' && refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [report, refreshInterval]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/v1/reports/${id}`);
      console.log('Report details from backend:', response.data);
      setReport(response.data);
    } catch (error) {
      console.error('Error fetching report:', error);
      setError('Failed to load report details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchReport();
  };

  const handleAnalyze = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/api/v1/reports/${id}/analyze`);
      console.log('Analysis triggered:', response.data);
      // Update the report status
      setReport(prev => prev ? { ...prev, status: 'processing' } : null);
      
      // Set up automatic refresh to check progress
      const interval = setInterval(() => {
        fetchReport();
      }, 5000); // Refresh every 5 seconds
      
      setRefreshInterval(interval);
    } catch (error) {
      console.error('Error triggering analysis:', error);
      setError('Failed to start analysis. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const checkBackendStatus = async () => {
    try {
      await axios.get(`${API_URL}/api/health`);
      setBackendStatus('online');
    } catch (error) {
      console.error('Backend server is not running:', error);
      setBackendStatus('offline');
    }
  };

  if (!currentUser) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <Layout title="Report Details" description="View report details and analysis">
      <div className="py-10">
        <header className="flex justify-between items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900">Report Details</h1>
          </div>
          <div className="px-4 sm:px-6 lg:px-8">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </header>
        <main>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600 mb-4"></div>
                <p className="text-gray-500">Loading report details...</p>
              </div>
            ) : report ? (
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {report.file_name}
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    Uploaded on {new Date(report.upload_date).toLocaleString()}
                  </p>
                </div>
                <div className="border-t border-gray-200">
                  <dl>
                    <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Status</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          report.status === 'completed' ? 'bg-green-100 text-green-800' :
                          report.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                          report.status === 'extracted' ? 'bg-yellow-100 text-yellow-800' :
                          report.status === 'uploaded' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                        </span>
                        
                        {report.status === 'processing' && (
                          <span className="ml-2 text-sm text-gray-500">
                            (Refreshing automatically every 5 seconds)
                          </span>
                        )}
                        
                        {(report.status === 'extracted' || report.status === 'uploaded') && (
                          <button
                            onClick={handleAnalyze}
                            className="ml-3 inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            disabled={loading}
                          >
                            {loading ? 'Starting...' : 'Analyze with AI'}
                          </button>
                        )}
                      </dd>
                    </div>
                    
                    {report.extracted_text && (
                      <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">Extracted Text</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                          <div className="max-h-60 overflow-y-auto">
                            <pre className="text-xs whitespace-pre-wrap font-mono bg-gray-50 p-3 rounded">
                              {report.extracted_text}
                            </pre>
                          </div>
                        </dd>
                      </div>
                    )}
                    
                    {report.analysis && (
                      <>
                        <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-gray-500">Summary</dt>
                          <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            {report.analysis.summary}
                          </dd>
                        </div>
                        
                        <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-gray-500">Key Points</dt>
                          <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            <ul className="list-disc pl-5 space-y-1">
                              {report.analysis.key_points.map((point: string, index: number) => (
                                <li key={index}>{point}</li>
                              ))}
                            </ul>
                          </dd>
                        </div>
                        
                        <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-gray-500">Sentiment</dt>
                          <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            <div className="flex items-center">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                report.analysis.sentiment.overall === 'positive' ? 'bg-green-100 text-green-800' :
                                report.analysis.sentiment.overall === 'neutral' ? 'bg-gray-100 text-gray-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {report.analysis.sentiment.overall.charAt(0).toUpperCase() + report.analysis.sentiment.overall.slice(1)}
                              </span>
                              <span className="ml-2 text-gray-500">
                                ({(report.analysis.sentiment.confidence * 100).toFixed(0)}% confidence)
                              </span>
                            </div>
                            
                            <div className="mt-4">
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div className="flex rounded-full h-2.5">
                                  <div 
                                    className="bg-green-500 h-2.5 rounded-l-full" 
                                    style={{width: `${report.analysis.sentiment.breakdown.positive}%`}}
                                  ></div>
                                  <div 
                                    className="bg-gray-500 h-2.5" 
                                    style={{width: `${report.analysis.sentiment.breakdown.neutral}%`}}
                                  ></div>
                                  <div 
                                    className="bg-red-500 h-2.5 rounded-r-full" 
                                    style={{width: `${report.analysis.sentiment.breakdown.negative}%`}}
                                  ></div>
                                </div>
                              </div>
                              <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>Positive ({report.analysis.sentiment.breakdown.positive}%)</span>
                                <span>Neutral ({report.analysis.sentiment.breakdown.neutral}%)</span>
                                <span>Negative ({report.analysis.sentiment.breakdown.negative}%)</span>
                              </div>
                            </div>
                          </dd>
                        </div>
                        
                        <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-gray-500">Topics</dt>
                          <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            <div className="space-y-2">
                              {report.analysis.topics.map((topic, index) => (
                                <div key={index} className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <span className="font-medium">{topic.name}</span>
                                    <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${
                                      topic.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                                      topic.sentiment === 'neutral' ? 'bg-gray-100 text-gray-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {topic.sentiment.charAt(0).toUpperCase() + topic.sentiment.slice(1)}
                                    </span>
                                  </div>
                                  <span className="text-gray-500 text-xs">{topic.mentions} mentions</span>
                                </div>
                              ))}
                            </div>
                          </dd>
                        </div>
                        
                        {report.analysis.quotes && report.analysis.quotes.length > 0 && (
                          <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Notable Quotes</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                              <ul className="space-y-3">
                                {report.analysis.quotes.map((quote, index) => (
                                  <li key={index} className="bg-gray-50 p-3 rounded">
                                    <blockquote className="italic">"{quote.text}"</blockquote>
                                    <div className="mt-1 flex justify-between text-xs">
                                      <span className="font-medium">{quote.speaker}</span>
                                      <span className={`px-2 py-0.5 rounded-full ${
                                        quote.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                                        quote.sentiment === 'neutral' ? 'bg-gray-100 text-gray-800' :
                                        'bg-red-100 text-red-800'
                                      }`}>
                                        {quote.sentiment.charAt(0).toUpperCase() + quote.sentiment.slice(1)}
                                      </span>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </dd>
                          </div>
                        )}
                      </>
                    )}
                    
                    {!report.analysis && report.status === 'processing' && (
                      <div className="bg-white px-4 py-5 sm:px-6">
                        <div className="flex items-center">
                          <div className="mr-3 inline-block animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
                          <p className="text-sm text-gray-500">
                            This report is being processed. The system is extracting text from the PDF and analyzing it with AI.
                            This may take a few minutes depending on the size and complexity of the document.
                          </p>
                        </div>
                        <div className="mt-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-sm">
                          <p className="font-medium">What's happening behind the scenes:</p>
                          <ol className="list-decimal pl-5 mt-2 space-y-1">
                            <li>Extracting text from your PDF document</li>
                            <li>Processing the text to identify key information</li>
                            <li>Analyzing sentiment and important topics</li>
                            <li>Generating a comprehensive analysis</li>
                          </ol>
                        </div>
                      </div>
                    )}
                    
                    {report.status === 'failed' && (
                      <div className="bg-white px-4 py-5 sm:px-6">
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                          <p className="font-medium">Processing failed</p>
                          <p className="mt-1">{report.error || "There was an error processing this report. Please try uploading it again."}</p>
                        </div>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            ) : (
              <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 text-center">
                <p className="text-gray-500">Report not found.</p>
                <button
                  onClick={() => router.push('/reports')}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Back to Reports
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </Layout>
  );
}