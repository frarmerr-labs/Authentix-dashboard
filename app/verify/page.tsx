'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Search, Award } from 'lucide-react';

export default function VerifyLandingPage() {
  const router = useRouter();
  const [token, setToken] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = token.trim();
    if (!t) return;
    // Support full URLs pasted in (e.g. verify.digicertificates.in/org/TOKEN)
    const urlMatch = t.match(/\/([^/]+)$/);
    router.push(`/verify/${urlMatch ? urlMatch[1] : t}`);
  }

  return (
    <div className="min-h-screen bg-[#f8f9fc] dark:bg-[#0d0d0f] flex flex-col">

      {/* Header */}
      <header className="border-b border-black/5 dark:border-white/5 bg-white/80 dark:bg-[#111113]/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-full bg-brand-500/10 flex items-center justify-center">
            <Award className="h-3.5 w-3.5 text-brand-500" />
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            Certificate Verification
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-6 text-center">

          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-brand-500" />
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Verify a Certificate
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Paste the verification link or token from your certificate to confirm its authenticity.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste verification link or token…"
              className="w-full px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#111113] text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              autoFocus
            />
            <button
              type="submit"
              disabled={!token.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white text-sm font-medium transition-colors"
            >
              <Search className="w-4 h-4" />
              Verify Certificate
            </button>
          </form>

          <p className="text-xs text-gray-400 dark:text-gray-500">
            Secured by{' '}
            <span className="font-semibold text-gray-600 dark:text-gray-400">Authentix</span>
            {' '}— Certificate Management Platform
          </p>
        </div>
      </main>
    </div>
  );
}
