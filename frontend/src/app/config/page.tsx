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
              <CogIcon className="h-8 w-8 text-elysBlue-500" />
              <h1 className="text-2xl font-bold text-dark-50">Settings</h1>
            </div>
            <Link href="/" className="text-sm font-medium text-elysViolet-400 hover:text-elysViolet-300 transition-colors">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="mb-6 border-b border-dark-700">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('bot')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 text-sm font-medium ${activeTab === 'bot' ? 'border-elysPink-500 text-elysPink-400' : 'border-transparent text-dark-300 hover:text-dark-100 hover:border-dark-500'}`}
              >
                <span className="inline-flex items-center gap-2">
                  <CogIcon className="h-5 w-5" />
                  Bot-Konfiguration
                </span>
              </button>
              <button
                onClick={() => setActiveTab('whatsapp')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 text-sm font-medium ${activeTab === 'whatsapp' ? 'border-elysPink-500 text-elysPink-400' : 'border-transparent text-dark-300 hover:text-dark-100 hover:border-dark-500'}`}
              >
                <span className="inline-flex items-center gap-2">
                  <ChatBubbleLeftRightIcon className="h-5 w-5" />
                  Whatsapp Link
                </span>
              </button>
            </nav>
          </div>
        </div>

        <div className="px-4 py-6 sm:px-0">
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