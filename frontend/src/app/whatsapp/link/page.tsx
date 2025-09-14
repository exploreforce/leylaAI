'use client';

import { useEffect, useState } from 'react';

type WaStatus = {
  status: 'idle' | 'qr' | 'authenticated' | 'ready' | 'disconnected' | 'auth_failure';
  meNumber: string | null;
  qrAvailable: boolean;
  qrGeneratedAt: number | null;
};

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function WhatsAppLinkPage() {
  const [status, setStatus] = useState<WaStatus | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      setError(null);
      const r = await fetch(`${API}/api/whatsapp/status`);
      const j = await r.json();
      setStatus(j?.data || null);
    } catch (e: any) {
      setError('Failed to load status');
    }
  };

  const loadQr = async () => {
    try {
      setError(null);
      const r = await fetch(`${API}/api/whatsapp/qr`);
      if (!r.ok) {
        setQrDataUrl(null);
        return;
      }
      const j = await r.json();
      setQrDataUrl(j?.data?.dataUrl || null);
    } catch (e: any) {
      setError('Failed to load QR');
    }
  };

  useEffect(() => {
    loadStatus();
    const id = setInterval(() => {
      loadStatus();
    }, 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (status?.status === 'qr') {
      loadQr();
    } else {
      setQrDataUrl(null);
    }
  }, [status?.status]);

  return (
    <div className="min-h-screen bg-dark-900 text-dark-100 p-6">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">WhatsApp Linking</h1>
        {error && (
          <div className="mb-3 text-red-400">{error}</div>
        )}
        <div className="mb-4 p-4 rounded-lg bg-dark-800 border border-dark-600">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-dark-300">Status</div>
              <div className="text-lg font-medium">{status?.status || 'loading...'}</div>
            </div>
            <button
              onClick={() => { loadStatus(); if (status?.status === 'qr') loadQr(); }}
              className="px-3 py-1.5 rounded-md bg-elysPink-600 text-white hover:bg-elysPink-500"
            >
              Refresh
            </button>
          </div>
          {status?.meNumber && (
            <div className="mt-2 text-sm text-dark-300">Logged in as: {status.meNumber}</div>
          )}
        </div>

        {status?.status === 'qr' && (
          <div className="p-4 rounded-lg bg-dark-800 border border-dark-600">
            <div className="mb-2 text-sm text-dark-300">Scan this QR with WhatsApp on your phone</div>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="WhatsApp QR" className="w-64 h-64 bg-white p-2 mx-auto" />
            ) : (
              <div className="text-dark-300">Waiting for QR...</div>
            )}
            {qrDataUrl && (
              <div className="mt-2 text-xs break-all text-dark-400">{qrDataUrl}</div>
            )}
          </div>
        )}

        {status?.status === 'ready' && (
          <div className="p-4 rounded-lg bg-dark-800 border border-dark-600">
            <div className="text-elysPink-400 font-medium">Connected</div>
            <div className="text-sm text-dark-300">The bot can now receive and send WhatsApp messages.</div>
          </div>
        )}
      </div>
    </div>
  );
}


