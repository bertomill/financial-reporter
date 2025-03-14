import React, { useState } from 'react';

interface ErrorDetailsProps {
  error: any;
}

export default function ErrorDetails({ error }: ErrorDetailsProps) {
  const [expanded, setExpanded] = useState(false);

  if (!error) return null;

  // Extract error details
  const errorDetails = {
    message: error.message || 'Unknown error',
    status: error.response?.status,
    statusText: error.response?.statusText,
    data: error.response?.data,
    stack: error.stack
  };

  // Extract more detailed information from the backend response
  const backendError = error.response?.data || {};
  const backendDetails = {
    error: backendError.error,
    detail: backendError.detail,
    type: backendError.type,
    path: error.response?.config?.url
  };

  return (
    <div className="mt-4 border border-red-300 rounded-md overflow-hidden">
      <div 
        className="bg-red-50 px-4 py-2 flex justify-between items-center cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="text-sm font-medium text-red-800">Technical Error Details</h3>
        <button className="text-red-600">
          {expanded ? '▲ Hide' : '▼ Show'}
        </button>
      </div>
      
      {expanded && (
        <div className="p-4 bg-white">
          <div className="mb-2">
            <span className="font-medium">Error Message:</span> {errorDetails.message}
          </div>
          
          {errorDetails.status && (
            <div className="mb-2">
              <span className="font-medium">Status:</span> {errorDetails.status} {errorDetails.statusText}
            </div>
          )}
          
          {backendDetails.path && (
            <div className="mb-2">
              <span className="font-medium">Request URL:</span> {backendDetails.path}
            </div>
          )}
          
          {backendDetails.error && backendDetails.error !== errorDetails.message && (
            <div className="mb-2">
              <span className="font-medium">Server Error:</span> {backendDetails.error}
            </div>
          )}
          
          {backendDetails.detail && (
            <div className="mb-2">
              <span className="font-medium">Error Detail:</span> {backendDetails.detail}
            </div>
          )}
          
          {backendDetails.type && (
            <div className="mb-2">
              <span className="font-medium">Error Type:</span> {backendDetails.type}
            </div>
          )}
          
          {errorDetails.data && (
            <div className="mb-2">
              <span className="font-medium">Server Response:</span>
              <pre className="mt-1 bg-gray-100 p-2 rounded text-xs overflow-auto">
                {JSON.stringify(errorDetails.data, null, 2)}
              </pre>
            </div>
          )}
          
          {errorDetails.stack && (
            <div>
              <span className="font-medium">Stack Trace:</span>
              <pre className="mt-1 bg-gray-100 p-2 rounded text-xs overflow-auto">
                {errorDetails.stack}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 