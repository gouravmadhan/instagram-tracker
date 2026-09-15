import { useState } from 'react';
import { loginWithPassword, signup } from '../api.js';

export default function LoginGate({ onAuthenticated }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result =
        mode === 'signup' ? await signup(email, password, name) : await loginWithPassword(email, password);
      onAuthenticated(result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-ink">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <img src="/icon.svg" alt="" className="w-14 h-14 mx-auto mb-6 rounded-2xl" />
          <h1 className="font-display text-2xl text-cream mb-2">Followgraph</h1>
          <p className="text-sm text-muted leading-relaxed">
            See who doesn't follow you back, who unfollowed you, and manage your lists — your data stays
            private to your account.
          </p>
        </div>

        <a
          href="/api/auth/login"
          className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-md bg-cream text-ink text-sm font-medium hover:bg-cream/90 transition-colors mb-5"
        >
          Continue with Google
        </a>

        <div className="flex items-center gap-3 mb-5">
          <div className="h-px flex-1 bg-hair" />
          <span className="text-xs text-muted">or</span>
          <div className="h-px flex-1 bg-hair" />
        </div>

        <div className="rounded-lg border border-hair bg-panel p-5">
          <div className="flex gap-1 mb-4 p-1 rounded-md bg-ink">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError('');
              }}
              className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
                mode === 'signin' ? 'bg-violet/20 text-violet' : 'text-muted'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError('');
              }}
              className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
                mode === 'signup' ? 'bg-violet/20 text-violet' : 'text-muted'
              }`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                autoComplete="name"
                className="w-full bg-ink border border-hair rounded-md px-3 py-2 text-sm text-cream placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-violet"
              />
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoComplete="email"
              required
              className="w-full bg-ink border border-hair rounded-md px-3 py-2 text-sm text-cream placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-violet"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'Password (min. 8 characters)' : 'Password'}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
              minLength={mode === 'signup' ? 8 : undefined}
              className="w-full bg-ink border border-hair rounded-md px-3 py-2 text-sm text-cream placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-violet"
            />

            {error && <p className="text-xs text-coral">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full px-4 py-2.5 rounded-md bg-violet text-ink text-sm font-medium disabled:opacity-40 hover:bg-violet/90 transition-colors"
            >
              {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
