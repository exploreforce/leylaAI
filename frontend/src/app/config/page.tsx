import BotConfigForm from '@/components/BotConfigForm';
import { CogIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import Image from 'next/image';

export default function ConfigPage() {
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
        <div className="px-4 py-6 sm:px-0">
          <BotConfigForm />
        </div>
      </main>
    </div>
  );
} 