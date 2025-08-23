'use client';

import { useState } from 'react';
import axios from 'axios';
import { setToken } from '@/utils/auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function LoginPage() {
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
        setError('Login succeeded but no token returned');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-8 bg-white p-6 rounded shadow">
      <h1 className="text-xl font-semibold mb-4">Login</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-700 mb-1">E-Mail</label>
          <input type="email" className="w-full border rounded px-3 py-2" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Passwort</label>
          <input type="password" className="w-full border rounded px-3 py-2" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white rounded px-4 py-2">
          {isLoading ? 'Logge ein…' : 'Login'}
        </button>
      </form>
    </div>
  );
}



