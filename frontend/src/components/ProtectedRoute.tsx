'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/utils/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface User {
  userId: string;
  accountId: string;
  email: string;
  role: string;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAdminStatus = async () => {
      const token = getToken();
      
      if (!token) {
        router.push('/auth/login');
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          router.push('/auth/login');
          return;
        }

        const data = await res.json();
        const user: User = data.data;

        if (user.role !== 'admin') {
          // Not an admin - show forbidden page
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        setIsAdmin(true);
        setLoading(false);
      } catch (error) {
        console.error('Failed to check admin status:', error);
        router.push('/auth/login');
      }
    };

    checkAdminStatus();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-elysPink-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">403 Forbidden</h1>
          <p className="text-gray-400 mb-6">Sie haben keine Berechtigung, diese Seite zu sehen.</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-elysPink-600 hover:bg-elysPink-700 text-white rounded-lg transition-colors"
          >
            Zurück zur Startseite
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

