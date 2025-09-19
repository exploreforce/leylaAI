'use client';

import { useState } from 'react';
import { getToken } from '@/utils/auth';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface SessionStatus {
  id: string;
  name?: string;
  phone?: string;
  status: string;
  webhookConfigured: boolean;
  webhookUrl?: string;
  expectedWebhookUrl?: string;
}

interface WebhookStatusResponse {
  totalSessions: number;
  configuredWebhookUrl: string;
  sessions: SessionStatus[];
}

export default function WebhookAdmin() {
  const [status, setStatus] = useState<WebhookStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const loadWebhookStatus = async () => {
    const token = getToken();
    if (!token) {
      setResult('❌ Authentication required');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`${API}/api/admin/webhook-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setStatus(data.data);
      } else {
        setResult(`❌ ${data.error}`);
      }
    } catch (error: any) {
      setResult(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const setupWebhooks = async () => {
    const token = getToken();
    if (!token) {
      setResult('❌ Authentication required');
      return;
    }

    setSetupLoading(true);
    setResult(null);

    try {
      const response = await fetch(`${API}/api/admin/setup-webhooks`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setResult('✅ Webhooks successfully configured for all sessions!');
        // Refresh status after setup
        setTimeout(() => loadWebhookStatus(), 1000);
      } else {
        setResult(`❌ ${data.error}`);
      }
    } catch (error: any) {
      setResult(`❌ Error: ${error.message}`);
    } finally {
      setSetupLoading(false);
    }
  };

  return (
    <div className="bg-dark-800 rounded-lg p-6 border border-dark-600">
      <h3 className="text-lg font-semibold text-dark-50 mb-4">
        🔗 Webhook Administration
      </h3>
      <p className="text-sm text-dark-300 mb-4">
        Manage webhook configuration for all WasenderAPI sessions automatically.
      </p>
      
      <div className="space-y-4">
        <div className="flex space-x-3">
          <button
            onClick={loadWebhookStatus}
            disabled={loading}
            className="px-4 py-2 bg-elysBlue-600 text-white rounded-md hover:bg-elysBlue-500 disabled:opacity-50"
          >
            {loading ? 'Loading...' : '📊 Check Status'}
          </button>
          
          <button
            onClick={setupWebhooks}
            disabled={setupLoading}
            className="px-4 py-2 bg-elysPink-600 text-white rounded-md hover:bg-elysPink-500 disabled:opacity-50"
          >
            {setupLoading ? 'Setting up...' : '🔧 Setup All Webhooks'}
          </button>
        </div>
        
        {result && (
          <div className={`p-3 rounded-md text-sm ${
            result.includes('✅') 
              ? 'bg-green-900/20 text-green-300 border border-green-700' 
              : 'bg-red-900/20 text-red-300 border border-red-700'
          }`}>
            {result}
          </div>
        )}
        
        {status && (
          <div className="mt-4 space-y-3">
            <div className="p-3 bg-dark-700 rounded-md">
              <h4 className="text-sm font-medium text-dark-200 mb-2">Configuration Summary</h4>
              <div className="text-sm text-dark-300 space-y-1">
                <div><strong>Total Sessions:</strong> {status.totalSessions}</div>
                <div><strong>Webhook URL:</strong> <code className="bg-dark-600 px-1 rounded text-xs">{status.configuredWebhookUrl}</code></div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-dark-200">Session Details</h4>
              {status.sessions.map((session) => (
                <div key={session.id} className="p-3 bg-dark-700 rounded-md border-l-4 border-l-dark-500">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm font-medium text-dark-100">
                      {session.name || `Session ${session.id}`}
                    </div>
                    <div className={`text-xs px-2 py-1 rounded ${
                      session.webhookConfigured 
                        ? 'bg-green-900/20 text-green-300 border border-green-700'
                        : 'bg-red-900/20 text-red-300 border border-red-700'
                    }`}>
                      {session.webhookConfigured ? '✅ Configured' : '❌ Not Configured'}
                    </div>
                  </div>
                  <div className="text-xs text-dark-400 space-y-1">
                    <div><strong>ID:</strong> {session.id}</div>
                    {session.phone && <div><strong>Phone:</strong> {session.phone}</div>}
                    <div><strong>Status:</strong> {session.status}</div>
                    {session.webhookUrl && (
                      <div><strong>Current Webhook:</strong> <code className="bg-dark-600 px-1 rounded">{session.webhookUrl}</code></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
