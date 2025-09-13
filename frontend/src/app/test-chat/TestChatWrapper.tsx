'use client';

import { useSearchParams } from 'next/navigation';
import TestChat from '@/components/chat/TestChat';

export default function TestChatWrapper() {
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get('sessionId');

  return <TestChat existingSessionId={sessionId} />;
}