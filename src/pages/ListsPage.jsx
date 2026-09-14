import { useEffect, useState } from 'react';
import ListEditor from '../components/ListEditor.jsx';
import { addToList, clearList, fetchLists, removeFromList } from '../api.js';

const EMPTY = { allowed: [], disabled: [], allowed_pending: [] };

export default function ListsPage({ onRefreshStatus }) {
  const [lists, setLists] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLists()
      .then(setLists)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function makeHandlers(type) {
    return {
      onAdd: async (usernames) => {
        const result = await addToList(type, usernames);
        setLists((prev) => ({ ...prev, [type]: result.usernames }));
        onRefreshStatus?.();
        return result;
      },
      onRemove: async (username) => {
        const result = await removeFromList(type, username);
        setLists((prev) => ({ ...prev, [type]: result.usernames }));
        onRefreshStatus?.();
      },
      onClearAll: async () => {
        const result = await clearList(type);
        setLists((prev) => ({ ...prev, [type]: result.usernames }));
        onRefreshStatus?.();
      },
    };
  }

  if (loading) return <p className="text-sm text-muted">Loading lists…</p>;

  return (
    <div className="space-y-6">
      {error && (
        <p className="text-sm text-coral bg-coral/10 border border-coral/30 rounded-md px-4 py-3">
          {error}
        </p>
      )}
      <p className="text-xs text-muted -mt-2">
        Changes here update the analysis on the Upload &amp; analyze tab immediately — no re-upload needed.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ListEditor
          title="Allowed"
          description="Accounts you're fine not being followed back by — excluded from 'not following back'."
          usernames={lists.allowed}
          {...makeHandlers('allowed')}
        />
        <ListEditor
          title="Disabled / deactivated"
          description="Accounts that are gone or deactivated — also excluded from 'not following back'."
          usernames={lists.disabled}
          {...makeHandlers('disabled')}
        />
        <ListEditor
          title="Allowed pending requests"
          description="Outgoing follow requests you're fine leaving pending indefinitely."
          usernames={lists.allowed_pending}
          {...makeHandlers('allowed_pending')}
        />
      </div>
    </div>
  );
}
