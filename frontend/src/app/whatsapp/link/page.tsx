import WhatsAppLink from '@/components/WhatsAppLink';
import Link from 'next/link';
import Image from 'next/image';

export default function WhatsAppLinkPage() {
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
              <h1 className="text-base sm:text-2xl font-bold text-dark-50">WhatsApp Linking</h1>
            </div>
            <Link 
              href="/config" 
              className="text-elysViolet-400 hover:text-elysViolet-300 px-3 py-2.5 rounded transition-colors text-sm sm:text-base min-h-[44px] flex items-center"
            >
              <span className="hidden sm:inline">← Back to Settings</span>
              <span className="sm:hidden">← Settings</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <WhatsAppLink />
      </main>
    </div>
  );
}


