'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import TestChat from '@/components/chat/TestChat';
import { botApi } from '@/utils/api';

const STORAGE_KEY = 'lastTestChatSessionId';

export default function TestChatWrapper() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlSessionId = searchParams?.get('sessionId');
  const forceNew = searchParams?.get('new') === 'true';
  const [resolvedSessionId, setResolvedSessionId] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(true);

  useEffect(() => {
    const resolveSession = async () => {
      console.log('🔍 Resolving session...', { urlSessionId, forceNew });
      
      // Priority 0: Force new session if ?new=true
      if (forceNew) {
        console.log('🆕 Force new session requested');
        setResolvedSessionId(null);
        setIsResolving(false);
        return;
      }
      
      // Priority 1: Session ID in URL
      if (urlSessionId) {
        console.log('✅ Using session ID from URL:', urlSessionId);
        setResolvedSessionId(urlSessionId);
        // Save to localStorage for future use
        localStorage.setItem(STORAGE_KEY, urlSessionId);
        setIsResolving(false);
        return;
      }

      // Priority 2: Last session from localStorage
      const lastSessionId = localStorage.getItem(STORAGE_KEY);
      if (lastSessionId) {
        console.log('📦 Found session ID in localStorage:', lastSessionId);
        // Verify session still exists on backend
        try {
          await botApi.getTestChatSession(lastSessionId);
          console.log('✅ Session exists, redirecting...');
          router.push(`/test-chat?sessionId=${lastSessionId}`);
          return;
        } catch (error) {
          console.log('⚠️ Session not found, clearing localStorage');
          localStorage.removeItem(STORAGE_KEY);
        }
      }

      // Priority 3: Get last active session from backend
      try {
        console.log('🌐 Fetching last active session from backend...');
        const response = await botApi.getActiveTestChatSession();
        if (response.data && response.data.id) {
          console.log('✅ Found active session from backend:', response.data.id);
          localStorage.setItem(STORAGE_KEY, response.data.id);
          router.push(`/test-chat?sessionId=${response.data.id}`);
          return;
        }
      } catch (error) {
        console.log('⚠️ No active session found on backend');
      }

      // Priority 4: No session found, let TestChat create new one
      console.log('🆕 No existing session, will create new one');
      setResolvedSessionId(null);
      setIsResolving(false);
    };

    resolveSession();
  }, [urlSessionId, forceNew, router]);

  if (isResolving) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading chat session...</p>
        </div>
      </div>
    );
  }

  return <TestChat existingSessionId={resolvedSessionId} />;
}