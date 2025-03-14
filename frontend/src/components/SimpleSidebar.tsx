import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../firebase/auth';
import { 
  LayoutDashboard, 
  FileText, 
  Upload, 
  BarChart2, 
  TrendingUp, 
  PieChart, 
  LineChart, 
  Lightbulb, 
  User, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  Users
} from 'lucide-react';

interface SimpleSidebarProps {
  onCollapse?: (collapsed: boolean) => void;
}

export default function SimpleSidebar({ onCollapse }: SimpleSidebarProps) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const { currentUser } = useAuth();
  
  // Check if the current path matches the href
  const isActive = (href: string) => router.pathname === href;
  
  // Style for active and inactive links
  const linkStyle = `flex items-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${collapsed ? 'justify-center' : ''}`;
  const activeLinkStyle = "bg-gray-100 text-gray-900";
  const inactiveLinkStyle = "text-gray-500 hover:bg-gray-100 hover:text-gray-900";
  
  // Toggle sidebar collapse
  const toggleSidebar = () => {
    const newCollapsedState = !collapsed;
    setCollapsed(newCollapsedState);
    
    // Notify parent component if onCollapse is provided
    if (onCollapse) {
      onCollapse(newCollapsedState);
    }
  };

  // Effect to notify parent of initial state
  useEffect(() => {
    if (onCollapse) {
      onCollapse(collapsed);
    }
  }, [onCollapse, collapsed]);

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!currentUser || !currentUser.email) return 'U';
    
    // If display name exists, use that
    if (currentUser.displayName) {
      return currentUser.displayName
        .split(' ')
        .map(name => name[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    
    // Otherwise use email
    return currentUser.email.substring(0, 2).toUpperCase();
  };

  return (
    <div className={`relative h-full border-r border-gray-200 bg-white transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Collapse toggle button */}
      <button 
        onClick={toggleSidebar}
        className="absolute -right-3 top-6 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-100"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className="flex flex-col h-full">
        {/* Logo area */}
        <div className={`flex h-16 items-center ${collapsed ? 'justify-center' : 'px-4'}`}>
          <div className="text-xl font-bold text-gray-900">
            {!collapsed ? "Financial Reporter" : "FR"}
          </div>
        </div>

        {/* Main menu */}
        <div className="flex-1 overflow-y-auto py-4">
          <div className="space-y-4">
            <div className="px-3 py-2">
              {!collapsed && (
                <h2 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Overview
                </h2>
              )}
              <div className="space-y-1">
                <Link href="/dashboard" className={`${linkStyle} ${isActive('/dashboard') ? activeLinkStyle : inactiveLinkStyle}`}>
                  <LayoutDashboard size={20} className="mr-2" />
                  {!collapsed && "Dashboard"}
                </Link>
                <Link href="/reports" className={`${linkStyle} ${isActive('/reports') ? activeLinkStyle : inactiveLinkStyle}`}>
                  <FileText size={20} className="mr-2" />
                  {!collapsed && "Reports"}
                </Link>
                <Link href="/upload" className={`${linkStyle} ${isActive('/upload') ? activeLinkStyle : inactiveLinkStyle}`}>
                  <Upload size={20} className="mr-2" />
                  {!collapsed && "Upload"}
                </Link>
              </div>
            </div>
            
            <div className="px-3 py-2">
              {!collapsed && (
                <h2 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Analytics
                </h2>
              )}
              <div className="space-y-1">
                <Link href="/financial-data" className={`${linkStyle} ${isActive('/financial-data') ? activeLinkStyle : inactiveLinkStyle}`}>
                  <BarChart2 size={20} className="mr-2" />
                  {!collapsed && "Financial Data"}
                </Link>
                <Link href="/forecasting" className={`${linkStyle} ${isActive('/forecasting') ? activeLinkStyle : inactiveLinkStyle}`}>
                  <TrendingUp size={20} className="mr-2" />
                  {!collapsed && "Forecasting"}
                </Link>
                <Link href="/trends" className={`${linkStyle} ${isActive('/trends') ? activeLinkStyle : inactiveLinkStyle}`}>
                  <LineChart size={20} className="mr-2" />
                  {!collapsed && "Trends"}
                </Link>
                <Link href="/comparisons" className={`${linkStyle} ${isActive('/comparisons') ? activeLinkStyle : inactiveLinkStyle}`}>
                  <PieChart size={20} className="mr-2" />
                  {!collapsed && "Comparisons"}
                </Link>
                <Link href="/insights" className={`${linkStyle} ${isActive('/insights') ? activeLinkStyle : inactiveLinkStyle}`}>
                  <Lightbulb size={20} className="mr-2" />
                  {!collapsed && "Insights"}
                </Link>
              </div>
            </div>
            
            <div className="px-3 py-2">
              {!collapsed && (
                <h2 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Settings
                </h2>
              )}
              <div className="space-y-1">
                <Link href="/profile" className={`${linkStyle} ${isActive('/profile') ? activeLinkStyle : inactiveLinkStyle}`}>
                  <User size={20} className="mr-2" />
                  {!collapsed && "Profile"}
                </Link>
                <Link href="/preferences" className={`${linkStyle} ${isActive('/preferences') ? activeLinkStyle : inactiveLinkStyle}`}>
                  <Settings size={20} className="mr-2" />
                  {!collapsed && "Preferences"}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Invite people button */}
        <div className="px-3 py-2 border-t border-gray-200">
          <Link 
            href="/invite" 
            className={`flex items-center rounded-md px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
            <Users size={20} className={collapsed ? '' : 'mr-2'} />
            {!collapsed && "Invite people"}
          </Link>
        </div>

        {/* User profile at bottom */}
        <div className="mt-auto px-3 py-4 border-t border-gray-200">
          {currentUser ? (
            <div className={`flex items-center ${collapsed ? 'justify-center' : 'px-2'}`}>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-600">
                <span className="text-sm font-medium">{getUserInitials()}</span>
              </div>
              {!collapsed && (
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    {currentUser.displayName || currentUser.email}
                  </p>
                  {currentUser.displayName && (
                    <p className="text-xs text-gray-500">{currentUser.email}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Link 
              href="/login" 
              className={`flex items-center rounded-md px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors ${collapsed ? 'justify-center' : ''}`}
            >
              <User size={20} className={collapsed ? '' : 'mr-2'} />
              {!collapsed && "Sign In"}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
} 