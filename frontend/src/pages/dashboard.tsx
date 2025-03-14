import React, { useEffect } from 'react';
import { useAuth } from '../firebase/auth';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const router = useRouter();

  // Redirect if not logged in
  useEffect(() => {
    if (!currentUser) {
      router.push('/login');
    }
  }, [currentUser, router]);

  // If not logged in and still loading, show loading state
  if (!currentUser) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <Layout title="Dashboard" description="Your financial reports dashboard">
      <div className="py-10">
        <header>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          </div>
        </header>
        <main>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
              <p className="text-gray-700">
                Welcome to your Financial Reporter dashboard. This is where you'll see your uploaded reports and their analyses.
              </p>
              <div className="mt-6">
                <h2 className="text-xl font-medium text-gray-900">Recent Reports</h2>
                <p className="mt-2 text-gray-600">You don't have any reports yet. Upload your first financial report to get started.</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
}