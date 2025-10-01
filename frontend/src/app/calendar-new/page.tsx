'use client';

import CalendarPro from '@/components/calendar/CalendarPro';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import Image from 'next/image';

export default function CalendarNewPage() {
  const { t } = useTranslation('calendar');
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
              <CalendarDaysIcon className="h-6 sm:h-8 w-6 sm:w-8 text-elysPink-500" />
              <div>
                <h1 className="text-base sm:text-2xl font-bold text-transparent bg-gradient-to-r from-elysPink-600 to-elysBlue-800 bg-clip-text">
                  <span className="hidden sm:inline">{t('header.title')}</span>
                  <span className="sm:hidden">Calendar</span>
                </h1>
              </div>
            </div>
            <div className="flex items-center">
              <Link 
                href="/" 
                className="text-xs sm:text-sm font-medium text-elysViolet-400 hover:text-elysViolet-300 transition-colors duration-300 px-3 py-2.5 rounded-lg hover:bg-dark-700 min-h-[44px] flex items-center"
              >
                <span className="hidden sm:inline">{t('header.back_to_dashboard')}</span>
                <span className="sm:hidden">← Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
        <div className="py-4 sm:py-6 bg-dark-800 rounded-xl shadow-2xl border border-dark-600">
          <CalendarPro />
        </div>
      </main>
    </div>
  );
}
