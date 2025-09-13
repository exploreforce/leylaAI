'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon, 
  ExclamationTriangleIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { botApi, appointmentsApi } from '@/utils/api';
import { useTranslation } from 'react-i18next';
import moment from 'moment';

const Dashboard = () => {
  const { t } = useTranslation('dashboard');
  const { t: tCommon } = useTranslation('common');
  
  const [stats, setStats] = useState({
    appointments: { today: 0, thisWeek: 0 },
    chats: { current: 0 },
    reviews: { needsReview: 0 }
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Load real review stats
        const reviewResponse = await botApi.getChatsForReview();
        const pendingReviews = reviewResponse.data?.length || 0;

        // Load real chat stats
        const chatsResponse = await botApi.getAllTestChatSessions();
        const currentChats = chatsResponse.data?.length || 0;

        // Load real appointment stats
        const today = moment().format('YYYY-MM-DD');
        const weekStart = moment().startOf('week').format('YYYY-MM-DD');
        const weekEnd = moment().endOf('week').format('YYYY-MM-DD');

        // Get today's appointments
        const todayAppointments = await appointmentsApi.getAll({
          startDate: today,
          endDate: today
        });

        // Get this week's appointments
        const weekAppointments = await appointmentsApi.getAll({
          startDate: weekStart,
          endDate: weekEnd
        });

        const todayCount = todayAppointments.data?.length || 0;
        const weekCount = weekAppointments.data?.length || 0;

        console.log('📊 Dashboard stats loaded:', {
          today: todayCount,
          thisWeek: weekCount,
          chats: currentChats,
          reviews: pendingReviews
        });

        setStats({
          appointments: { today: todayCount, thisWeek: weekCount },
          chats: { current: currentChats },
          reviews: { needsReview: pendingReviews }
        });
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
    };

    loadStats();

    // Refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-dark-900">
      <header className="bg-dark-800 shadow-2xl border-b border-elysPink-600">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Image 
                src="/branding/LeylaAI.png" 
                alt="Leyla AI Logo" 
                width={48} 
                height={48}
                className="h-12 w-auto"
              />
              <h1 className="text-2xl font-bold text-transparent bg-gradient-to-r from-elysPink-600 to-elysBlue-800 bg-clip-text">{t('title')}</h1>
            </div>
            <nav className="flex space-x-4">
              <Link href="/test-chat" className="text-elysViolet-400 hover:text-elysViolet-300 px-3 py-2 rounded-lg transition-all duration-300 hover:bg-dark-700">
                {t('quick_actions.start_chat')}
              </Link>
              <Link href="/chat-review" className="text-elysPink-400 hover:text-elysPink-300 px-3 py-2 rounded-lg flex items-center transition-all duration-300 hover:bg-dark-700">
                {t('reviews.title')}
                {stats.reviews.needsReview > 0 && (
                  <span className="ml-1 bg-elysPink-600 text-white text-xs rounded-full px-2 py-1 shadow-lg">
                    {stats.reviews.needsReview}
                  </span>
                )}
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          
          {/* Appointments Container */}
          <div className="bg-dark-700 rounded-xl shadow-2xl border border-dark-500 hover:border-elysPink-400 transition-all duration-300 flex flex-col h-64">
            <div className="flex items-center mb-4 space-x-3 p-6 pb-0">
              <CalendarDaysIcon className="h-6 w-6 text-elysPink-500" />
              <h2 className="text-lg font-semibold text-elysPink-400">{t('appointments.title')}</h2>
            </div>
            <div className="flex-1 flex items-center justify-center px-6">
              <div className="grid grid-cols-2 gap-8 w-full text-center">
                <div>
                  <div className="text-2xl font-bold text-elysPink-500 mb-1">{stats.appointments.today}</div>
                  <div className="text-xs text-dark-300">{t('appointments.today')}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-elysViolet-400 mb-1">{stats.appointments.thisWeek}</div>
                  <div className="text-xs text-dark-300">{t('appointments.this_week')}</div>
                </div>
              </div>
            </div>
            <div className="p-6 pt-0">
              <Link href="/calendar-new" className="block bg-gradient-to-r from-elysPink-600 to-elysViolet-600 text-white px-4 py-2.5 rounded-lg hover:from-elysPink-500 hover:to-elysBlue-700 text-center text-sm font-medium transition-all duration-300 shadow-lg hover:shadow-elysPink-500/25 hover:-translate-y-0.5">
                {t('appointments.manage_calendar')}
              </Link>
            </div>
          </div>

          {/* Current Chats Container */}
          <div className="bg-dark-700 rounded-xl shadow-2xl border border-dark-500 hover:border-elysViolet-400 transition-all duration-300 flex flex-col h-64">
            <div className="flex items-center mb-4 space-x-3 p-6 pb-0">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-elysViolet-500" />
              <h2 className="text-lg font-semibold text-elysViolet-400">{t('chats.title')}</h2>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center px-6">
              <div className="text-4xl font-bold text-elysViolet-500 mb-2">{stats.chats.current}</div>
              <div className="text-xs text-dark-300">{t('chats.active_conversations')}</div>
            </div>
            <div className="p-6 pt-0">
              <Link href="/chats" className="block bg-gradient-to-r from-elysViolet-600 to-elysBlue-700 text-white px-4 py-2.5 rounded-lg hover:from-elysViolet-500 hover:to-elysBlue-600 text-center text-sm font-medium transition-all duration-300 shadow-lg hover:shadow-elysViolet-500/25 hover:-translate-y-0.5">
                {t('chats.view_all')}
              </Link>
            </div>
          </div>

          {/* Needs Review Container */}
          <div className="bg-dark-700 rounded-xl shadow-2xl border border-dark-500 hover:border-elysPink-400 transition-all duration-300 flex flex-col h-64">
            <div className="flex items-center mb-4 space-x-3 p-6 pb-0">
              <ExclamationTriangleIcon className="h-6 w-6 text-elysPink-500" />
              <h2 className="text-lg font-semibold text-elysPink-400">{t('reviews.title')}</h2>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center px-6">
              <div className={`text-4xl font-bold mb-2 ${stats.reviews.needsReview > 0 ? 'text-elysPink-600' : 'text-dark-400'}`}>
                {stats.reviews.needsReview}
              </div>
              <div className="text-xs text-dark-300">{t('reviews.pending_approvals')}</div>
            </div>
            <div className="p-6 pt-0">
              <Link 
                href="/chat-review" 
                className={`block px-4 py-2.5 rounded-lg text-center text-sm font-medium transition-all duration-300 ${
                  stats.reviews.needsReview > 0 
                    ? 'bg-gradient-to-r from-elysPink-600 to-elysViolet-700 text-white hover:from-elysPink-500 hover:to-elysViolet-600 shadow-lg hover:shadow-elysPink-500/25 hover:-translate-y-0.5' 
                    : 'bg-dark-600 text-dark-400 cursor-not-allowed border border-dark-500'
                }`}
              >
                {t('reviews.review_messages')}
              </Link>
            </div>
          </div>

          {/* Settings Container */}
          <div className="bg-dark-700 rounded-xl shadow-2xl border border-dark-500 hover:border-elysBlue-400 transition-all duration-300 flex flex-col h-64">
            <div className="flex items-center mb-4 space-x-3 p-6 pb-0">
              <CogIcon className="h-6 w-6 text-elysBlue-500" />
              <h2 className="text-lg font-semibold text-elysBlue-400">{t('settings.title')}</h2>
            </div>
            <div className="flex-1 flex items-center justify-center px-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-elysBlue-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <CogIcon className="h-6 w-6 text-elysBlue-400" />
                </div>
                <div className="text-xs text-dark-300">{t('settings.description')}</div>
              </div>
            </div>
            <div className="p-6 pt-0">
              <Link href="/config" className="block bg-gradient-to-r from-elysBlue-700 to-elysViolet-700 text-white px-4 py-2.5 rounded-lg hover:from-elysBlue-600 hover:to-elysViolet-600 text-center text-sm font-medium transition-all duration-300 shadow-lg hover:shadow-elysBlue-600/25 hover:-translate-y-0.5">
                {t('settings.button')}
              </Link>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Dashboard;
