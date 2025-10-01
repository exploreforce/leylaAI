'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { botApi } from '@/utils/api';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

interface ChatForReview {
  id: string;
  type: 'test' | 'whatsapp';
  title: string;
  lastUserMessage: string;
  pendingReply: string;
  timestamp: string;
  sessionId: number;
}

export default function ChatReviewPage() {
  const { t } = useTranslation('chat');
  const [chats, setChats] = useState<ChatForReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChats = async () => {
      try {
        const response = await botApi.getChatsForReview();
        if (response.data) {
          setChats(response.data);
        }
      } catch (error) {
        console.error('Failed to load chats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChats();
    
    // Refresh every 5 seconds
    const interval = setInterval(loadChats, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit', 
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-lg text-dark-50">{t('chat_review.loading_chats')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="bg-dark-800 shadow-2xl border-b border-elysPink-600">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Image 
                src="/branding/LeylaAI.png" 
                alt="Leyla AI Logo" 
                width={40} 
                height={40}
                className="h-8 sm:h-10 w-auto"
              />
              <h1 className="text-base sm:text-2xl font-bold text-dark-50">
                <span className="hidden sm:inline">{t('chat_review.title')}</span>
                <span className="sm:hidden">Review</span>
              </h1>
            </div>
            <Link 
              href="/" 
              className="text-elysViolet-400 hover:text-elysViolet-300 px-3 py-2.5 rounded transition-colors text-sm sm:text-base min-h-[44px] flex items-center"
            >
              <span className="hidden sm:inline">{t('common.back_to_dashboard')}</span>
              <span className="sm:hidden">← Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Chat List */}
      <main className="max-w-4xl mx-auto py-4 sm:py-8 px-3 sm:px-4">
        {chats.length === 0 ? (
          <div className="bg-dark-700 rounded-xl shadow-2xl p-8 text-center border border-dark-600">
            <div className="flex items-center justify-center text-elysPink-400 text-lg mb-4">
              <CheckCircleIcon className="h-6 w-6 mr-2" />
              {t('chat_review.no_chats')}
            </div>
            <p className="text-dark-200">{t('chat_review.all_up_to_date')}</p>
            <Link 
              href="/test-chat" 
              className="mt-4 inline-block bg-gradient-to-r from-elysViolet-500 to-elysBlue-600 text-white px-4 py-2 rounded-lg hover:from-elysViolet-600 hover:to-elysBlue-700 transition-all duration-300 shadow-lg"
            >
              {t('test_chat.start_new')}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-dark-200 mb-4">
              {chats.length} chat{chats.length !== 1 ? 's' : ''} need{chats.length === 1 ? 's' : ''} your review
            </div>
            
            {chats.map((chat) => (
              <Link key={chat.id} href={`/chat-review/${chat.id}`}>
                <div className="bg-dark-700 rounded-xl shadow-2xl hover:shadow-rouge-500/20 transition-all duration-300 p-6 cursor-pointer border-l-4 border-rouge-500 border border-dark-600 hover:border-rouge-500">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className={`inline-block w-3 h-3 rounded-full mr-3 shadow-lg ${
                          chat.type === 'test' ? 'bg-luxe-500 shadow-luxe-500/25' : 'bg-success-500 shadow-success-500/25'
                        }`}></span>
                        <h3 className="font-semibold text-dark-50">{chat.title}</h3>
                        <span className="ml-2 text-xs bg-rouge-500 text-white px-2 py-1 rounded-full shadow-lg">
                          {t('chat_review.pending_review')}
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="bg-dark-600 rounded-lg p-3 border border-elysPink-400/20">
                          <div className="text-xs text-elysPink-400 font-medium mb-1">{t('chat_review.user_label')}</div>
                          <div className="text-dark-100 text-sm">{chat.lastUserMessage}</div>
                        </div>
                        
                        <div className="bg-dark-600 rounded-lg p-3 border border-elysViolet-400/20">
                          <div className="text-xs text-elysViolet-400 font-medium mb-1">{t('chat_review.pending_ai_reply')}</div>
                          <div className="text-dark-100 text-sm">{chat.pendingReply}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-4 text-right">
                      <div className="text-xs text-dark-300">{formatTimestamp(chat.timestamp)}</div>
                      <div className="mt-2 text-elysViolet-400 hover:text-elysViolet-300 text-sm font-medium transition-colors">
                        {t('chat_review.review_arrow')}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}