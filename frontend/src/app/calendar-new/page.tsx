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
              <CalendarDaysIcon className="h-8 w-8 text-elysPink-500" />
              <div>
                <h1 className="text-2xl font-bold text-transparent bg-gradient-to-r from-elysPink-600 to-elysBlue-800 bg-clip-text">{t('header.title')}</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/" 
                className="text-sm font-medium text-elysViolet-400 hover:text-elysViolet-300 transition-colors duration-300 px-3 py-1 rounded-lg hover:bg-dark-700"
              >
                {t('header.back_to_dashboard')}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 bg-dark-800 rounded-xl shadow-2xl border border-dark-600">
          <CalendarPro />
        </div>
      </main>
    </div>
  );
}
