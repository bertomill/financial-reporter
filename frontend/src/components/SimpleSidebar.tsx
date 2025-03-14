import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function SimpleSidebar() {
  const router = useRouter();
  
  // Check if the current path matches the href
  const isActive = (href: string) => router.pathname === href;
  
  // Style for active and inactive links
  const linkStyle = "flex items-center rounded-md px-4 py-2 text-sm font-medium transition-colors";
  const activeLinkStyle = "bg-gray-100 text-gray-900";
  const inactiveLinkStyle = "text-gray-500 hover:bg-gray-100 hover:text-gray-900";
  
  return (
    <div className="pb-12 h-full">
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Overview
          </h2>
          <div className="space-y-1">
            <Link href="/dashboard" className={`${linkStyle} ${isActive('/dashboard') ? activeLinkStyle : inactiveLinkStyle}`}>
              Dashboard
            </Link>
            <Link href="/reports" className={`${linkStyle} ${isActive('/reports') ? activeLinkStyle : inactiveLinkStyle}`}>
              Reports
            </Link>
            <Link href="/upload" className={`${linkStyle} ${isActive('/upload') ? activeLinkStyle : inactiveLinkStyle}`}>
              Upload
            </Link>
          </div>
        </div>
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Analytics
          </h2>
          <div className="space-y-1">
            <Link href="/financial-data" className={`${linkStyle} ${isActive('/financial-data') ? activeLinkStyle : inactiveLinkStyle}`}>
              Financial Data
            </Link>
            <Link href="/trends" className={`${linkStyle} ${isActive('/trends') ? activeLinkStyle : inactiveLinkStyle}`}>
              Trends
            </Link>
            <Link href="/comparisons" className={`${linkStyle} ${isActive('/comparisons') ? activeLinkStyle : inactiveLinkStyle}`}>
              Comparisons
            </Link>
            <Link href="/insights" className={`${linkStyle} ${isActive('/insights') ? activeLinkStyle : inactiveLinkStyle}`}>
              Insights
            </Link>
          </div>
        </div>
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Settings
          </h2>
          <div className="space-y-1">
            <Link href="/profile" className={`${linkStyle} ${isActive('/profile') ? activeLinkStyle : inactiveLinkStyle}`}>
              Profile
            </Link>
            <Link href="/preferences" className={`${linkStyle} ${isActive('/preferences') ? activeLinkStyle : inactiveLinkStyle}`}>
              Preferences
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 