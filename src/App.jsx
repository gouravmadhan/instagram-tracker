import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import UploadPage from './pages/UploadPage.jsx';
import ListsPage from './pages/ListsPage.jsx';
import LoginGate from './components/LoginGate.jsx';
import { fetchMe, fetchStatus, logout } from './api.js';

const TABS = [
  { path: '/', label: 'Upload & analyze' },
  { path: '/manage', label: 'Manage lists' },
];

export default function App() {
  // undefined = still checking session, null = logged out, object = logged in
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    fetchMe()
      .then((d) => setUser(d.user))
      .catch(() => setUser(null));
  }, []);

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink">
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <LoginGate onAuthenticated={setUser} />;
  }

  return <Dashboard user={user} onSignedOut={() => setUser(null)} />;
}

function Dashboard({ user, onSignedOut }) {
  const location = useLocation();
  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusError, setStatusError] = useState('');

  const refreshStatus = useCallback(async () => {
    try {
      const data = await fetchStatus();
      setStatus(data);
      setStatusError('');
    } catch (err) {
      if (err.message === 'Not authenticated') {
        onSignedOut();
        return;
      }
      setStatusError(err.message);
    } finally {
      setLoadingStatus(false);
    }
  }, [onSignedOut]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  async function handleLogout() {
    await logout().catch(() => {});
    onSignedOut();
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 shrink-0 border-r border-hair bg-panel px-6 py-8 hidden md:flex md:flex-col md:sticky md:top-0 md:h-screen md:overflow-y-auto">
        <div className="flex items-center gap-2">
          <img src="/icon.svg" alt="" className="w-7 h-7 rounded-lg" />
          <div>
            <p className="font-display text-lg text-cream leading-tight">Followgraph</p>
            <p className="text-[11px] text-muted">follower &amp; following tracker</p>
          </div>
        </div>
        <nav className="mt-10 space-y-1">
          {TABS.map((t) => (
            <Link
              key={t.path}
              to={t.path}
              className={`block w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname === t.path ? 'bg-violet/15 text-violet' : 'text-muted hover:text-cream'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <p className="mt-8 text-xs text-muted leading-relaxed">
          Data is compared against the last snapshot you committed with "Move current → previous".
        </p>

        <div className="mt-auto pt-6 border-t border-hair flex items-center gap-2.5">
          {user.picture && (
            <img src={user.picture} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-cream truncate">{user.name}</p>
            <p className="text-[11px] text-muted truncate">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-muted hover:text-coral transition-colors shrink-0"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between border-b border-hair bg-panel px-5 py-4">
          <div className="flex items-center gap-2">
            <img src="/icon.svg" alt="" className="w-6 h-6 rounded-md" />
            <p className="font-display text-base text-cream">Followgraph</p>
          </div>
          <div className="flex items-center gap-2">
            {TABS.map((t) => (
              <Link
                key={t.path}
                to={t.path}
                className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                  location.pathname === t.path ? 'bg-violet/15 text-violet' : 'text-muted'
                }`}
              >
                {t.label}
              </Link>
            ))}
            <button onClick={handleLogout} className="text-xs text-muted hover:text-coral">
              Sign out
            </button>
          </div>
        </header>

        <main className="flex-1 px-5 md:px-10 py-8 w-full">
          {statusError && (
            <p className="text-sm text-coral bg-coral/10 border border-coral/30 rounded-md px-4 py-3 mb-6">
              Couldn't reach the API: {statusError}. Check MONGODB_URI is set in your environment.
            </p>
          )}
          {loadingStatus ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : (
            <Routes>
              <Route
                path="/"
                element={
                  <UploadPage
                    status={status}
                    onUploaded={(result) => setStatus(result)}
                    onRefreshStatus={refreshStatus}
                  />
                }
              />
              <Route path="/home" element={<Navigate to="/" replace />} />
              <Route path="/manage" element={<ListsPage onRefreshStatus={refreshStatus} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </main>
      </div>
    </div>
  );
}
