import WhatsAppLink from '@/components/WhatsAppLink';

export default function WhatsAppLinkPage() {
  return (
    <div className="min-h-screen bg-dark-900 text-dark-100 p-6">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">WhatsApp Linking</h1>
        <WhatsAppLink />
      </div>
    </div>
  );
}


