"use client";
import BotConfigForm from '@/components/BotConfigForm';
import WhatsAppLink from '@/components/WhatsAppLink';
import { CogIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

export default function ConfigPage() {
  const [activeTab, setActiveTab] = useState<'bot' | 'whatsapp'>('bot');

  return (
    <div className="min-h-screen bg-dark-900">
      <header className="bg-dark-800 shadow-2xl border-b border-rouge-600">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-6">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Image 
                src="/branding/LeylaAI.png" 
                alt="Leyla AI Logo" 
                width={40} 
                height={40}
                className="h-8 sm:h-10 w-auto"
              />
              <CogIcon className="h-6 sm:h-8 w-6 sm:w-8 text-elysBlue-500" />
              <h1 className="text-lg sm:text-2xl font-bold text-dark-50">Settings</h1>
            </div>
            <Link href="/" className="text-xs sm:text-sm font-medium text-elysViolet-400 hover:text-elysViolet-300 transition-colors px-2 py-1 sm:px-0">
              <span className="hidden sm:inline">← Back to Dashboard</span>
              <span className="sm:hidden">←</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
        <div className="mb-4 sm:mb-6 border-b border-dark-700 overflow-x-auto">
          <nav className="-mb-px flex space-x-4 sm:space-x-6 min-w-max" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('bot')}
              className={`whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 text-sm font-medium transition-colors ${activeTab === 'bot' ? 'border-elysPink-500 text-elysPink-400' : 'border-transparent text-dark-300 hover:text-dark-100 hover:border-dark-500'}`}
            >
              <span className="inline-flex items-center gap-1.5 sm:gap-2">
                <CogIcon className="h-4 sm:h-5 w-4 sm:w-5" />
                <span className="text-xs sm:text-sm">Bot-Konfiguration</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 text-sm font-medium transition-colors ${activeTab === 'whatsapp' ? 'border-elysPink-500 text-elysPink-400' : 'border-transparent text-dark-300 hover:text-dark-100 hover:border-dark-500'}`}
            >
              <span className="inline-flex items-center gap-1.5 sm:gap-2">
                <ChatBubbleLeftRightIcon className="h-4 sm:h-5 w-4 sm:w-5" />
                <span className="text-xs sm:text-sm">Whatsapp Link</span>
              </span>
            </button>
          </nav>
        </div>

        <div className="py-4 sm:py-6">
          {activeTab === 'bot' && (
            <BotConfigForm />
          )}
          {activeTab === 'whatsapp' && (
            <div className="max-w-xl">
              <WhatsAppLink />
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 