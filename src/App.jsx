import { useCallback, useEffect, useState } from 'react';
import UploadPage from './pages/UploadPage.jsx';
import ListsPage from './pages/ListsPage.jsx';
import { fetchStatus } from './api.js';

const TABS = [
  { id: 'upload', label: 'Upload & analyze' },
  { id: 'lists', label: 'Manage lists' },
];

export default function App() {
  const [tab, setTab] = useState('upload');
  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusError, setStatusError] = useState('');

  const refreshStatus = useCallback(async () => {
    try {
      const data = await fetchStatus();
      setStatus(data);
      setStatusError('');
    } catch (err) {
      setStatusError(err.message);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 shrink-0 border-r border-hair bg-panel px-6 py-8 hidden md:flex md:flex-col">
        <div>
          <p className="font-display text-xl text-cream leading-tight">Followgraph</p>
          <p className="text-xs text-muted mt-1">follower &amp; following tracker</p>
        </div>
        <nav className="mt-10 space-y-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === t.id ? 'bg-violet/15 text-violet' : 'text-muted hover:text-cream'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto pt-8 text-xs text-muted leading-relaxed">
          Data is compared against the last snapshot you committed with "Move current → previous".
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between border-b border-hair bg-panel px-5 py-4">
          <p className="font-display text-lg text-cream">Followgraph</p>
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                  tab === t.id ? 'bg-violet/15 text-violet' : 'text-muted'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </header>

        <main className="flex-1 px-5 md:px-10 py-8 max-w-6xl w-full">
          {statusError && (
            <p className="text-sm text-coral bg-coral/10 border border-coral/30 rounded-md px-4 py-3 mb-6">
              Couldn't reach the API: {statusError}. Check MONGODB_URI is set in your environment.
            </p>
          )}
          {loadingStatus ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : tab === 'upload' ? (
            <UploadPage
              status={status}
              onUploaded={(result) => setStatus(result)}
              onRefreshStatus={refreshStatus}
            />
          ) : (
            <ListsPage onRefreshStatus={refreshStatus} />
          )}
        </main>
      </div>
    </div>
  );
}
