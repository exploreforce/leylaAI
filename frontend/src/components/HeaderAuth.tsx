'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { getToken, clearToken } from '@/utils/auth';

export default function HeaderAuth() {
  const [hasToken, setHasToken] = useState(false);
  useEffect(() => {
    setHasToken(!!getToken());
  }, []);

  const handleLogout = () => {
    clearToken();
    setHasToken(false);
    window.location.href = '/auth/login';
  };

  return (
    <div className="w-full bg-dark-800 border-b border-elysPink-600 shadow-lg">
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        <Link className="flex items-center space-x-3 font-semibold text-transparent bg-gradient-to-r from-elysPink-600 to-elysBlue-800 bg-clip-text hover:from-elysPink-500 hover:to-elysBlue-700 transition-all duration-300" href="/">
          <Image 
            src="/branding/LeylaAI.png" 
            alt="Leyla AI Logo" 
            width={40} 
            height={40}
            className="h-10 w-auto"
          />
          <span>Leyla AI</span>
        </Link>
        <div className="space-x-3">
          {!hasToken ? (
            <>
              <Link className="text-elysViolet-400 hover:text-elysViolet-300 transition-colors duration-300 px-3 py-1 rounded-lg hover:bg-dark-700" href="/auth/login">Login</Link>
              <Link className="text-elysPink-400 hover:text-elysPink-300 transition-colors duration-300 px-3 py-1 rounded-lg hover:bg-dark-700" href="/auth/signup">Signup</Link>
            </>
          ) : (
            <button onClick={handleLogout} className="text-elysBlue-400 hover:text-elysBlue-300 transition-colors duration-300 px-3 py-1 rounded-lg hover:bg-dark-700">Logout</button>
          )}
        </div>
      </div>
    </div>
  );
}



