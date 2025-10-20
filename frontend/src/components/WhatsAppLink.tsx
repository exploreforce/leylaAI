'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getToken } from '@/utils/auth';
import WebhookAdmin from './WebhookAdmin';

type WaStatus = {
  status: 'idle' | 'qr' | 'authenticated' | 'ready' | 'disconnected' | 'auth_failure' | 'unknown';
  meNumber: string | null;
  sessionId: string | null;
  qrAvailable: boolean;
  qrGeneratedAt: number | null;
};

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function WhatsAppLink() {
  const { t } = useTranslation('settings');
  const [status, setStatus] = useState<WaStatus | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [jwt, setJwt] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string>("");

  const loadStatus = async () => {
    try {
      setError(null);
      setSuccessMessage(null);
      
      // Always use user-specific endpoint if we have a token
      const token = jwt || getToken();
      if (!token) {
        // No token available, don't make requests
        setStatus({ status: 'unknown', meNumber: null, sessionId: null, qrAvailable: false, qrGeneratedAt: null });
        return;
      }
      
      const url = `${API}/api/whatsapp/user/status`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) {
        const t = await r.text().catch(() => '');
        throw new Error(t || 'Status request failed');
      }
      const j = await r.json();
      const newStatus = j?.data || null;
      
      // Preserve existing meNumber if the new response doesn't have one
      setStatus(prevStatus => ({
        status: newStatus?.status || 'unknown',
        meNumber: newStatus?.meNumber || prevStatus?.meNumber || null,
        sessionId: newStatus?.sessionId || null,
        qrAvailable: newStatus?.qrAvailable || false,
        qrGeneratedAt: newStatus?.qrGeneratedAt || null
      }));
    } catch (e: any) {
      setError(t('whatsapp.errors.failed_status'));
    }
  };

  const loadQr = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const token = jwt || getToken();
      if (!token) {
        setLoading(false);
        setError(t('whatsapp.errors.auth_required'));
        return;
      }
      
      const url = `${API}/api/whatsapp/user/qr`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      setLoading(false);
      if (!r.ok) {
        setQrDataUrl(null);
        return;
      }
      const j = await r.json();
      setQrDataUrl(j?.data?.dataUrl || null);
    } catch (e: any) {
      setLoading(false);
      setError(t('whatsapp.errors.failed_qr'));
    }
  };

  const ensureUserSession = async () => {
    if (!jwt) return;
    try {
      setError(null);
      setSuccessMessage(null);
      setLoading(true);
      const response = await fetch(`${API}/api/whatsapp/user/session/ensure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ phoneNumber }),
      });
      setLoading(false);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to ensure session');
      }
      
      const result = await response.json();
      if (result.success && result.data) {
        // Update status immediately with the response
        setStatus({
          status: result.data.status || 'unknown',
          meNumber: result.data.meNumber || null,
          qrAvailable: result.data.status === 'qr',
          qrGeneratedAt: null
        });
      }
      
      // Status is already updated above - no need for additional refresh
    } catch (e: any) {
      setLoading(false);
      setError(e.message || 'Failed to ensure session');
    }
  };

  const deleteSession = async () => {
    if (!jwt) return;
    
    // Show confirmation dialog
    if (!confirm('Are you sure you want to delete the current WhatsApp session? This will disconnect the bot from WhatsApp and you will need to create a new session.')) {
      return;
    }
    
    try {
      setError(null);
      setSuccessMessage(null);
      setLoading(true);
      const response = await fetch(`${API}/api/whatsapp/user/session`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
      });
      setLoading(false);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to delete session');
      }
      
      const result = await response.json();
      if (result.success) {
        // Reset all status to force user to create new session
        setStatus({
          status: 'unknown',
          meNumber: null,
          sessionId: null,
          qrAvailable: false,
          qrGeneratedAt: null
        });
        setQrDataUrl(null);
        setPhoneNumber(""); // Clear phone number input
        
        // Show success message temporarily
        setSuccessMessage(`Session deleted successfully. ${result.deletedFromWasenderAPI ? 'Removed from WasenderAPI and database.' : 'Removed from database only.'}`);
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (e: any) {
      setLoading(false);
      setError(e.message || 'Failed to delete session');
    }
  };

  useEffect(() => {
    const token = getToken();
    if (token) setJwt(token);
    loadStatus(); // Load once on mount
    
    // NO automatic polling in settings - only manual refresh via buttons
    // Chat monitoring is handled by WhatsAppChatMonitor component
  }, [jwt]);

  useEffect(() => {
    // Only load QR if status is 'qr' AND we have a sessionId
    // This prevents trying to load QR when there's no session in the database
    if (status?.status === 'qr' && status?.sessionId) {
      loadQr();
    } else {
      setQrDataUrl(null);
    }
  }, [status?.status, status?.sessionId]);

  // Special polling ONLY during active QR scanning
  useEffect(() => {
    if (status?.status === 'qr') {
      const qrPollInterval = setInterval(() => {
        loadStatus(); // Check if QR was scanned
      }, 3000);
      return () => clearInterval(qrPollInterval);
    }
  }, [status?.status]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="mb-3 p-3 rounded-lg bg-red-900/20 border border-red-600 text-red-400">{error}</div>
      )}
      {successMessage && (
        <div className="mb-3 p-3 rounded-lg bg-green-900/20 border border-green-600 text-green-400">{successMessage}</div>
      )}

      <div className="p-4 rounded-lg bg-dark-800 border border-dark-600">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-dark-300">{t('whatsapp.status_label')}</div>
            <div className="text-lg font-medium">{status?.status || t('whatsapp.loading')}</div>
          </div>
          <button
            onClick={() => { loadStatus(); if (status?.status === 'qr') loadQr(); }}
            className="px-3 py-1.5 rounded-md bg-elysPink-600 text-white hover:bg-elysPink-500"
          >
            {t('whatsapp.refresh_button')}
          </button>
        </div>
        {status?.meNumber && (
          <div className="mt-2 text-sm text-dark-300">{t('whatsapp.logged_in_as')} {status.meNumber}</div>
        )}
        {status?.status !== 'ready' && (
          <div className="mt-3 space-y-2">
            {jwt && !status?.meNumber && (
              <div className="flex items-center gap-2">
                <input
                  type="tel"
                  placeholder={t('whatsapp.phone_placeholder')}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-dark-700 border border-dark-600 text-dark-100"
                  disabled={loading}
                />
                <button
                  onClick={() => ensureUserSession()}
                  disabled={!phoneNumber.trim() || loading}
                  className="px-3 py-1.5 rounded-md bg-elysBlue-600 text-white hover:bg-elysBlue-500 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t('whatsapp.creating') : t('whatsapp.create_session')}
                </button>
              </div>
            )}
            {jwt && (
              <div>
                <button
                  onClick={() => loadQr()}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-md bg-elysViolet-600 text-white hover:bg-elysViolet-500 disabled:opacity-50"
                >
                  {loading ? t('whatsapp.loading') : t('whatsapp.generate_qr')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {status?.status === 'qr' && (
        <div className="p-4 rounded-lg bg-dark-800 border border-dark-600">
          <div className="mb-2 text-sm text-dark-300">{t('whatsapp.scan_qr')}</div>
          {loading && <div className="text-dark-300">{t('whatsapp.loading_qr')}</div>}
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="WhatsApp QR" className="w-64 h-64 bg-white p-2 mx-auto" />
          ) : (!loading && (
            <div className="text-dark-300">Waiting for QR...</div>
          ))}
          {qrDataUrl && (
            <div className="mt-2 text-xs break-all text-dark-400">{qrDataUrl}</div>
          )}
        </div>
      )}

      {status?.status === 'ready' && (
        <div className="p-4 rounded-lg bg-dark-800 border border-dark-600">
          <div className="text-elysPink-400 font-medium">{t('whatsapp.connected')}</div>
          <div className="text-sm text-dark-300">{t('whatsapp.connected_message')}</div>
        </div>
      )}

      {/* Session Management - Show delete button when user is logged in */}
      {jwt && (
        <div className="p-4 rounded-lg bg-dark-800 border border-dark-600">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-dark-300">{t('whatsapp.session_management.title')}</div>
              <div className="text-xs text-dark-400 mt-1">
                {status?.meNumber ? `${t('whatsapp.session_management.session_for')} ${status.meNumber}` : 
                 status?.status === 'unknown' ? t('whatsapp.session_management.reset_broken') : 
                 t('whatsapp.session_management.manage')}
              </div>
            </div>
            <button
              onClick={deleteSession}
              disabled={loading}
              className="px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <svg 
                className="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                />
              </svg>
              {loading ? t('whatsapp.session_management.deleting') : t('whatsapp.session_management.delete_button')}
            </button>
          </div>
        </div>
      )}
      
      {/* Webhook Administration - for managing multiple customers */}
      <WebhookAdmin />
    </div>
  );
}


