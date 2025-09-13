import Link from 'next/link';
import {
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  CogIcon,
  HomeIcon,
} from '@heroicons/react/24/outline';

export default function MobileDashboard() {
  return (
    <div className="min-h-screen flex flex-col bg-dark-900">
      <header className="bg-dark-800 shadow-2xl border-b border-elysPink-600 p-4 flex justify-between items-center">
        <h1 className="text-lg font-bold text-dark-50">Leyla AI</h1>
        <Link
          href="/"
          className="text-elysViolet-400 text-sm font-medium"
        >
          Desktop View
        </Link>
      </header>

      <main className="flex-1 p-4 space-y-4">
        <Link
          href="/test-chat"
          className="block p-4 bg-dark-700 rounded-xl shadow-2xl text-center font-medium text-dark-50 border border-dark-600 hover:border-elysPink-500 transition-all duration-300"
        >
          AI Chat
        </Link>
        <Link
          href="/config"
          className="block p-4 bg-dark-700 rounded-xl shadow-2xl text-center font-medium text-dark-50 border border-dark-600 hover:border-elysPink-500 transition-all duration-300"
        >
          Settings
        </Link>
        <Link
          href="/calendar-new"
          className="block p-4 bg-dark-700 rounded-xl shadow-2xl text-center font-medium text-dark-50 border border-dark-600 hover:border-elysPink-500 transition-all duration-300"
        >
          Calendar
        </Link>
      </main>

      <nav className="bg-dark-800 border-t border-elysPink-600 p-2 flex justify-around">
        <Link href="/mobile" className="flex flex-col items-center text-elysViolet-400">
          <HomeIcon className="h-6 w-6" />
          <span className="text-xs">Home</span>
        </Link>
        <Link href="/test-chat" className="flex flex-col items-center text-dark-300">
          <ChatBubbleLeftRightIcon className="h-6 w-6" />
          <span className="text-xs">Chat</span>
        </Link>
        <Link href="/calendar-new" className="flex flex-col items-center text-dark-300">
          <CalendarDaysIcon className="h-6 w-6" />
          <span className="text-xs">Calendar</span>
        </Link>
        <Link href="/config" className="flex flex-col items-center text-dark-300">
          <CogIcon className="h-6 w-6" />
          <span className="text-xs">Config</span>
        </Link>
      </nav>
    </div>
  );
}
