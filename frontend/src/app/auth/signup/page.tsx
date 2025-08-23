'use client';

import { useState } from 'react';
import axios from 'axios';
import { setToken } from '@/utils/auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function SignupPage() {
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
        setError('Signup succeeded but no token returned');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-8 bg-white p-6 rounded shadow">
      <h1 className="text-xl font-semibold mb-4">Signup</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Name</label>
          <input className="w-full border rounded px-3 py-2" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">E-Mail</label>
          <input type="email" className="w-full border rounded px-3 py-2" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Passwort</label>
          <input type="password" className="w-full border rounded px-3 py-2" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Bevorzugte Sprache</label>
          <select className="w-full border rounded px-3 py-2" value={preferredLanguage} onChange={e => setPreferredLanguage(e.target.value)}>
            <option value="de">Deutsch</option>
            <option value="en">Englisch</option>
            <option value="fr">Französisch</option>
            <option value="it">Italienisch</option>
            <option value="es">Spanisch</option>
          </select>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white rounded px-4 py-2">
          {isLoading ? 'Registriere…' : 'Registrieren'}
        </button>
      </form>
    </div>
  );
}



