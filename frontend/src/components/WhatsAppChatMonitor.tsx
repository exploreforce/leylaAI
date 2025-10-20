'use client';

import { useEffect, useState } from 'react';
import { getToken } from '@/utils/auth';

type WaStatus = {
  status: 'idle' | 'qr' | 'authenticated' | 'ready' | 'disconnected' | 'auth_failure' | 'unknown';
  meNumber: string | null;
  sessionId: string | null;
  qrAvailable: boolean;
  qrGeneratedAt: number | null;
};

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface WhatsAppChatMonitorProps {
  onStatusChange?: (status: WaStatus) => void;
}

export default function WhatsAppChatMonitor({ onStatusChange }: WhatsAppChatMonitorProps) {
  const [status, setStatus] = useState<WaStatus | null>(null);
  const [jwt, setJwt] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      const token = jwt || getToken();
      if (!token) return;
      
      const url = `${API}/api/whatsapp/user/status`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return;
      
      const j = await r.json();
      const newStatus = j?.data || null;
      
      const statusObj = {
        status: newStatus?.status || 'unknown',
        meNumber: newStatus?.meNumber || status?.meNumber || null,
        sessionId: newStatus?.sessionId || null,
        qrAvailable: newStatus?.qrAvailable || false,
        qrGeneratedAt: newStatus?.qrGeneratedAt || null
      };
      
      setStatus(statusObj);
      onStatusChange?.(statusObj);
    } catch (e) {
      // Silent fail for chat monitor
    }
  };

  useEffect(() => {
    const token = getToken();
    if (token) setJwt(token);
    loadStatus();
    
    // Intelligent polling for chat monitoring:
    // - Fast polling during connection (QR/auth)
    // - Slow polling when connected (for message monitoring)
    // - No polling when disconnected
    const pollInterval = setInterval(() => {
      if (status?.status === 'qr' || status?.status === 'authenticated') {
        // Fast polling during connection
        loadStatus();
      } else if (status?.status === 'ready') {
        // Slow polling for message monitoring (webhooks are preferred)
        loadStatus();
      }
      // No polling for 'disconnected', 'unknown', 'auth_failure'
    }, status?.status === 'ready' ? 30000 : 5000); // 30s when ready, 5s when connecting
    
    return () => clearInterval(pollInterval);
  }, [jwt, status?.status]);

  return null; // This is a background monitor component
}
