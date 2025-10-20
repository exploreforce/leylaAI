'use client';

import { useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { setToken } from '@/utils/auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function LoginPage() {
  const { t } = useTranslation('common');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${BASE_URL}/api/auth/login`, { email, password });
      if (res.data?.token) {
        setToken(res.data.token);
        window.location.href = '/';
      } else {
        setError(t('auth.login.error_no_token'));
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || t('auth.login.error_failed'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center px-3 sm:px-4 py-8">
      <div className="max-w-md w-full bg-dark-700 p-6 sm:p-8 rounded-xl shadow-2xl border border-dark-600">
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-50 mb-2">{t('auth.login.title')}</h1>
          <p className="text-sm text-dark-300">{t('auth.login.subtitle')}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">{t('auth.login.email_label')}</label>
            <input 
              type="email" 
              className="w-full border border-dark-500 rounded-lg px-3 sm:px-4 py-3 bg-dark-600 text-dark-50 placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-elysPink-500 focus:border-transparent transition-all min-h-[44px]" 
              placeholder={t('auth.login.email_placeholder')}
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">{t('auth.login.password_label')}</label>
            <input 
              type="password" 
              className="w-full border border-dark-500 rounded-lg px-3 sm:px-4 py-3 bg-dark-600 text-dark-50 placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-elysPink-500 focus:border-transparent transition-all min-h-[44px]" 
              placeholder={t('auth.login.password_placeholder')}
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={isLoading} 
            className="w-full bg-gradient-to-r from-elysPink-500 to-elysViolet-600 text-white rounded-lg px-4 py-3 font-semibold hover:from-elysPink-600 hover:to-elysViolet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg min-h-[44px]"
          >
            {isLoading ? t('auth.login.logging_in') : t('auth.login.login_button')}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-dark-300">
            {t('auth.login.no_account')}{' '}
            <Link href="/auth/signup" className="text-elysPink-400 hover:text-elysPink-300 font-medium">
              {t('auth.login.signup_link')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}



