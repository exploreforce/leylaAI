'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { getToken, clearToken } from '@/utils/auth';
import { reviewApi, authApi } from '@/utils/api';
import { ClockIcon, ChartBarIcon } from '@heroicons/react/24/outline';

export default function HeaderAuth() {
  const [hasToken, setHasToken] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setHasToken(!!getToken());
  }, []);

  useEffect(() => {
    if (!hasToken) return;

    const loadPendingCount = async () => {
      try {
        const response = await reviewApi.getReviewStats();
        setPendingCount(response.data?.pendingCount || 0);
      } catch (error) {
        console.error('Failed to load review stats:', error);
      }
    };

    loadPendingCount();
    
    // Poll every 30 seconds
    const interval = setInterval(loadPendingCount, 30000);
    return () => clearInterval(interval);
  }, [hasToken]);

  useEffect(() => {
    if (!hasToken) return;

    const checkAdminStatus = async () => {
      try {
        const response = await authApi.getCurrentUser();
        setIsAdmin(response.data?.role === 'admin');
      } catch (error) {
        console.error('Failed to check admin status:', error);
      }
    };

    checkAdminStatus();
  }, [hasToken]);

  const handleLogout = () => {
    clearToken();
    setHasToken(false);
    window.location.href = '/auth/login';
  };

  return (
    <div className="w-full bg-dark-800 border-b border-elysPink-600 shadow-lg">
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        <Link className="flex items-center space-x-3 font-semibold text-transparent bg-gradient-to-r from-elysPink-600 to-elysBlue-800 bg-clip-text hover:from-elysPink-500 hover:to-elysBlue-700 transition-all duration-300" href="/">
          <Image 
            src="/branding/LeylaAI.png" 
            alt="Leyla AI Logo" 
            width={40} 
            height={40}
            className="h-10 w-auto"
          />
          <span>Leyla AI</span>
        </Link>
        <div className="flex items-center space-x-3">
          {!hasToken ? (
            <>
              <Link className="text-elysViolet-400 hover:text-elysViolet-300 transition-colors duration-300 px-3 py-1 rounded-lg hover:bg-dark-700" href="/auth/login">Login</Link>
              <Link className="text-elysPink-400 hover:text-elysPink-300 transition-colors duration-300 px-3 py-1 rounded-lg hover:bg-dark-700" href="/auth/signup">Signup</Link>
            </>
          ) : (
            <>
              {isAdmin && (
                <Link href="/dashboard" className="text-elysViolet-400 hover:text-elysViolet-300 transition-colors duration-300 px-3 py-1 rounded-lg hover:bg-dark-700 flex items-center space-x-1">
                  <ChartBarIcon className="h-5 w-5" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
              )}
              <Link href="/appointments-review" className="relative text-elysViolet-400 hover:text-elysViolet-300 transition-colors duration-300 px-3 py-1 rounded-lg hover:bg-dark-700 flex items-center space-x-1">
                <ClockIcon className="h-5 w-5" />
                <span className="hidden sm:inline">Review</span>
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-elysPink-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
                    {pendingCount}
                  </span>
                )}
              </Link>
              <button onClick={handleLogout} className="text-elysBlue-400 hover:text-elysBlue-300 transition-colors duration-300 px-3 py-1 rounded-lg hover:bg-dark-700">Logout</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}



