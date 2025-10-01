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
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-3 sm:py-6 gap-3 sm:gap-0">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Image 
                src="/branding/LeylaAI.png" 
                alt="Leyla AI Logo" 
                width={40} 
                height={40}
                className="h-8 sm:h-10 w-auto"
              />
              <h1 className="text-base sm:text-2xl font-bold text-dark-50">
                <span className="hidden sm:inline">{t('test_chat.title')}</span>
                <span className="sm:hidden">AI Chat</span>
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto overflow-x-auto pb-safe">
              <Link 
                href="/chats" 
                className="flex items-center text-xs sm:text-sm font-medium text-elysViolet-400 hover:text-elysViolet-300 transition-colors whitespace-nowrap px-2 sm:px-0 py-2 min-h-[44px]"
              >
                <ChatBubbleLeftRightIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                <span className="hidden sm:inline">{t('test_chat.navigation.all_chats')}</span>
                <span className="sm:hidden">Chats</span>
              </Link>
              <Link 
                href="/chat-review" 
                className="flex items-center text-xs sm:text-sm font-medium text-elysPink-400 hover:text-elysPink-300 transition-colors whitespace-nowrap px-2 sm:px-0 py-2 min-h-[44px]"
              >
                <DocumentTextIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                <span className="hidden sm:inline">{t('test_chat.navigation.review_responses')}</span>
                <span className="sm:hidden">Review</span>
              </Link>
              <Link 
                href="/" 
                className="flex items-center text-xs sm:text-sm font-medium text-elysViolet-400 hover:text-elysViolet-300 transition-colors whitespace-nowrap px-2 sm:px-0 py-2 min-h-[44px]"
              >
                <span className="hidden sm:inline">{t('test_chat.navigation.back_to_dashboard')}</span>
                <span className="sm:hidden">←</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
        <div className="py-4 sm:py-6">
          <Suspense fallback={<div className="text-center text-dark-400">{t('test_chat.loading')}</div>}>
            <TestChatWrapper />
          </Suspense>
        </div>
      </main>
    </div>
  );
} 