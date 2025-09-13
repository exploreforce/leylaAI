'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChatBubbleLeftRightIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import TestChatWrapper from './TestChatWrapper';

export default function TestChatPage() {
  const { t } = useTranslation('chat');
  
  return (
    <div className="min-h-screen bg-dark-900">
      <header className="bg-dark-800 shadow-2xl border-b border-elysPink-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <Image 
                src="/branding/LeylaAI.png" 
                alt="Leyla AI Logo" 
                width={40} 
                height={40}
                className="h-10 w-auto"
              />
              <h1 className="text-2xl font-bold text-dark-50">{t('test_chat.title')}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/chats" className="text-sm font-medium text-elysViolet-400 hover:text-elysViolet-300 transition-colors flex items-center">
                <ChatBubbleLeftRightIcon className="h-4 w-4 mr-1" />
                {t('test_chat.navigation.all_chats')}
              </Link>
              <Link href="/chat-review" className="text-sm font-medium text-elysPink-400 hover:text-elysPink-300 transition-colors flex items-center">
                <DocumentTextIcon className="h-4 w-4 mr-1" />
                {t('test_chat.navigation.review_responses')}
              </Link>
              <Link href="/" className="text-sm font-medium text-elysViolet-400 hover:text-elysViolet-300 transition-colors">
                {t('test_chat.navigation.back_to_dashboard')}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Suspense fallback={<div className="text-center text-dark-400">{t('test_chat.loading')}</div>}>
            <TestChatWrapper />
          </Suspense>
        </div>
      </main>
    </div>
  );
} 