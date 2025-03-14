import React, { ReactNode, useState } from 'react';
import { useAuth } from '../firebase/auth';
import { useRouter } from 'next/router';
import SimpleSidebar from './SimpleSidebar';
import Head from 'next/head';

interface LayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

export default function Layout({ children, title, description }: LayoutProps) {
  const { currentUser, logout } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Function to handle sidebar collapse state
  const handleSidebarCollapse = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
  };

  return (
    <>
      <Head>
        <title>{title} | Financial Reporter</title>
        <meta name="description" content={description || 'Financial Reporter application'} />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <nav className="bg-white shadow-sm h-16 flex items-center px-6 justify-between">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">Financial Reporter</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {currentUser ? (
              <>
                <span className="text-sm text-gray-700">{currentUser.email}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => router.push('/login')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Sign In
              </button>
            )}
          </div>
        </nav>

        <div className="flex h-[calc(100vh-4rem)]">
          {/* Sidebar - no fixed width container, let SimpleSidebar control its width */}
          <SimpleSidebar onCollapse={handleSidebarCollapse} />
          
          {/* Main content */}
          <div className="flex-1 overflow-auto p-6">
            {children}
          </div>
        </div>
      </div>
    </>
  );
} 