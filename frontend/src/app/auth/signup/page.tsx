'use client';

import { useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { setToken } from '@/utils/auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function SignupPage() {
  const { t } = useTranslation('common');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('de');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${BASE_URL}/api/auth/signup`, {
        email,
        password,
        name,
        preferredLanguage,
      });
      if (res.data?.token) {
        setToken(res.data.token);
        window.location.href = '/';
      } else {
        setError(t('auth.signup.error_failed'));
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || t('auth.signup.error_failed'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center px-3 sm:px-4 py-8">
      <div className="max-w-md w-full bg-dark-700 p-6 sm:p-8 rounded-xl shadow-2xl border border-dark-600">
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-50 mb-2">{t('auth.signup.title')}</h1>
          <p className="text-sm text-dark-300">{t('auth.signup.subtitle')}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">{t('auth.signup.name_label')}</label>
            <input 
              type="text"
              className="w-full border border-dark-500 rounded-lg px-3 sm:px-4 py-3 bg-dark-600 text-dark-50 placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-elysPink-500 focus:border-transparent transition-all min-h-[44px]" 
              placeholder={t('auth.signup.name_placeholder')}
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">{t('auth.signup.email_label')}</label>
            <input 
              type="email" 
              className="w-full border border-dark-500 rounded-lg px-3 sm:px-4 py-3 bg-dark-600 text-dark-50 placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-elysPink-500 focus:border-transparent transition-all min-h-[44px]" 
              placeholder={t('auth.signup.email_placeholder')}
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">{t('auth.signup.password_label')}</label>
            <input 
              type="password" 
              className="w-full border border-dark-500 rounded-lg px-3 sm:px-4 py-3 bg-dark-600 text-dark-50 placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-elysPink-500 focus:border-transparent transition-all min-h-[44px]" 
              placeholder={t('auth.signup.password_placeholder')}
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">{t('settings:language.select_language')}</label>
            <select 
              className="w-full border border-dark-500 rounded-lg px-3 sm:px-4 py-3 bg-dark-600 text-dark-50 focus:outline-none focus:ring-2 focus:ring-elysPink-500 focus:border-transparent transition-all min-h-[44px]" 
              value={preferredLanguage} 
              onChange={e => setPreferredLanguage(e.target.value)}
            >
              <option value="de">{t('language_names.de')}</option>
              <option value="en">{t('language_names.en')}</option>
              <option value="es">{t('language_names.es')}</option>
              <option value="fr">Français</option>
              <option value="it">{t('language_names.it')}</option>
            </select>
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
            {isLoading ? t('auth.signup.signing_up') : t('auth.signup.signup_button')}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-dark-300">
            {t('auth.signup.have_account')}{' '}
            <Link href="/auth/login" className="text-elysPink-400 hover:text-elysPink-300 font-medium">
              {t('auth.signup.login_link')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}



