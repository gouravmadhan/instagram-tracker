import { useCallback, useEffect, useRef, useState } from 'react';
import Panel from '../components/Panel.jsx';
import HandleList from '../components/HandleList.jsx';
import ListEditor from '../components/ListEditor.jsx';
import {
  addToList,
  clearList,
  commitSnapshot,
  fetchLists,
  fileToBase64,
  removeFromList,
  uploadZip,
} from '../api.js';

function fmtDate(d) {
  if (!d) return 'never';
  const date = new Date(d);
  return date.toLocaleString();
}

export default function UploadPage({ status, onUploaded, onRefreshStatus }) {
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [committing, setCommitting] = useState(false);
  const [movingUser, setMovingUser] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [watchlistLoading, setWatchlistLoading] = useState(true);
  const inputRef = useRef(null);

  const analysis = status?.analysis;

  useEffect(() => {
    fetchLists()
      .then((d) => setWatchlist(d.watchlist || []))
      .catch(() => {})
      .finally(() => setWatchlistLoading(false));
  }, []);

  const watchlistHandlers = {
    onAdd: async (usernames) => {
      const result = await addToList('watchlist', usernames);
      setWatchlist(result.usernames);
      return result;
    },
    onRemove: async (username) => {
      const result = await removeFromList('watchlist', username);
      setWatchlist(result.usernames);
    },
    onClearAll: async () => {
      const result = await clearList('watchlist');
      setWatchlist(result.usernames);
    },
  };

  const handleFile = useCallback(
    async (file) => {
      if (!file) return;
      if (!file.name.toLowerCase().endsWith('.zip')) {
        setError('Please upload the .zip export from Instagram.');
        return;
      }
      setError('');
      setBusy(true);
      try {
        const base64 = await fileToBase64(file);
        const result = await uploadZip(base64);
        onUploaded(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
    },
    [onUploaded]
  );

  async function handleCommit() {
    setCommitting(true);
    setError('');
    try {
      await commitSnapshot();
      await onRefreshStatus();
    } catch (err) {
      setError(err.message);
    } finally {
      setCommitting(false);
    }
  }

  async function handleMove(type, username) {
    setMovingUser(username);
    setError('');
    try {
      await addToList(type, username);
      await onRefreshStatus();
    } catch (err) {
      setError(err.message);
    } finally {
      setMovingUser(null);
    }
  }

  async function handleRemoveFromList(type, username) {
    setMovingUser(username);
    setError('');
    try {
      await removeFromList(type, username);
      await onRefreshStatus();
    } catch (err) {
      setError(err.message);
    } finally {
      setMovingUser(null);
    }
  }

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={`rounded-lg border border-dashed p-10 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-violet bg-violet/5' : 'border-hair bg-panel hover:border-violet/60'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <p className="font-display text-lg text-cream">
          {busy ? 'Parsing your export…' : 'Drop your Instagram data export .zip here'}
        </p>
        <p className="text-sm text-muted mt-1">or click to browse — request it from Instagram Settings → Accounts Center → Your information</p>
      </div>

      {error && (
        <p className="text-sm text-coral bg-coral/10 border border-coral/30 rounded-md px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-hair bg-panel2 px-5 py-4">
        <div className="text-sm text-muted">
          <span className="text-cream">{status?.currentFollowersCount ?? 0}</span> followers ·{' '}
          <span className="text-cream">{status?.currentFollowingCount ?? 0}</span> following ·
          last upload <span className="text-cream">{fmtDate(status?.lastUploadAt)}</span>
        </div>
        <button
          onClick={handleCommit}
          disabled={committing || !status?.hasCurrent}
          className="px-4 py-2 rounded-md bg-cream text-ink text-sm font-medium disabled:opacity-30 hover:bg-cream/90 transition-colors"
        >
          {committing ? 'Saving baseline…' : 'Move current → previous'}
        </button>
      </div>

      {!watchlistLoading && (
        <ListEditor
          title="Watchlist"
          description="Usernames you just want to keep an eye on and view anytime — doesn't affect any of the analysis. Add or remove here whenever, no upload needed."
          usernames={watchlist}
          {...watchlistHandlers}
        />
      )}

      {!analysis && (
        <p className="text-sm text-muted">
          Upload a zip to see your analysis. After you review it, use "Move current → previous" so the
          next upload compares against today's data.
        </p>
      )}

      {analysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          <Panel
            title="Not following back"
            hint="You follow them, they don't follow you, and they're not on your allowed list."
            count={analysis.notFollowingBack.length}
            accent="coral"
          >
            <HandleList
              rows={analysis.notFollowingBack}
              emptyLabel="Everyone follows you back 🎉"
              renderActions={(row) => (
                <>
                  <button
                    onClick={() => handleMove('allowed', row.username)}
                    disabled={movingUser === row.username}
                    className="text-xs text-muted hover:text-leaf transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-100 disabled:text-muted"
                  >
                    {movingUser === row.username ? '…' : 'allow'}
                  </button>
                  <button
                    onClick={() => handleMove('disabled', row.username)}
                    disabled={movingUser === row.username}
                    className="text-xs text-muted hover:text-coral transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-100 disabled:text-muted"
                  >
                    {movingUser === row.username ? '…' : 'disable'}
                  </button>
                </>
              )}
            />
          </Panel>

          <Panel
            title="Follow you, but you don't follow back"
            hint="In your followers list but not in your following list."
            count={analysis.followersNotFollowedBack.length}
            accent="leaf"
          >
            <HandleList rows={analysis.followersNotFollowedBack} emptyLabel="You follow everyone back." />
          </Panel>

          <Panel
            title="Started following back"
            hint="On your allowed list, and now following you — safe to remove from allowed."
            count={analysis.startedFollowingCanRemoveFromAllowed.length}
            accent="leaf"
          >
            <HandleList rows={analysis.startedFollowingCanRemoveFromAllowed} emptyLabel="None yet." />
          </Panel>

          <Panel
            title="Disabled accounts that are back"
            hint="On your disabled list, but now showing up in your followers again — likely reactivated."
            count={analysis.disabledAccountsBack.length}
            accent="leaf"
          >
            <HandleList
              rows={analysis.disabledAccountsBack}
              emptyLabel="None back yet."
              renderActions={(row) => (
                <button
                  onClick={() => handleRemoveFromList('disabled', row.username)}
                  disabled={movingUser === row.username}
                  className="text-xs text-muted hover:text-coral transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-100 disabled:text-muted"
                >
                  {movingUser === row.username ? '…' : 'remove'}
                </button>
              )}
            />
          </Panel>

          <Panel
            title="Allowed, but not followed anymore"
            hint="On your allowed list, but you don't currently follow them."
            count={analysis.notInAllowedListAnymore.length}
            accent="amber"
          >
            <HandleList
              rows={analysis.notInAllowedListAnymore}
              emptyLabel="List is consistent."
              renderActions={(row) => (
                <button
                  onClick={() => handleRemoveFromList('allowed', row.username)}
                  disabled={movingUser === row.username}
                  className="text-xs text-muted hover:text-coral transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-100 disabled:text-muted"
                >
                  {movingUser === row.username ? '…' : 'remove'}
                </button>
              )}
            />
          </Panel>

          <Panel
            title="Pending requests — allowed"
            hint="Outgoing follow requests you've explicitly allowed to stay pending."
            count={analysis.pendingAllowed.length}
            accent="leaf"
          >
            <HandleList rows={analysis.pendingAllowed} emptyLabel="None." />
          </Panel>

          <Panel
            title="Pending requests — can cancel"
            hint="Outgoing requests not on your allowed-pending list."
            count={analysis.pendingCanRemove.length}
            accent="coral"
          >
            <HandleList
              rows={analysis.pendingCanRemove}
              emptyLabel="None."
              renderActions={(row) => (
                <button
                  onClick={() => handleMove('allowed_pending', row.username)}
                  disabled={movingUser === row.username}
                  className="text-xs text-muted hover:text-leaf transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-100 disabled:text-muted"
                >
                  {movingUser === row.username ? '…' : 'allow'}
                </button>
              )}
            />
          </Panel>

          <Panel
            title="Removed since last baseline"
            hint="No longer in your following list (and not also missing from followers)."
            count={analysis.removedFromFollowingOnly.length}
            accent="coral"
          >
            <HandleList rows={analysis.removedFromFollowingOnly} emptyLabel="Nothing removed." />
          </Panel>

          <Panel
            title="Unfollowed you since last baseline"
            hint="No longer in your followers list (and you're still following them)."
            count={analysis.removedFromFollowersOnly.length}
            accent="coral"
          >
            <HandleList rows={analysis.removedFromFollowersOnly} emptyLabel="Nobody unfollowed you." />
          </Panel>

          <Panel
            title="New follows since last baseline"
            hint="Added to your following list since the last committed snapshot."
            count={analysis.addedToFollowingOnly.length}
            accent="leaf"
          >
            <HandleList rows={analysis.addedToFollowingOnly} emptyLabel="No new follows." />
          </Panel>

          <Panel
            title="New followers since last baseline"
            hint="Added to your followers list since the last committed snapshot."
            count={analysis.addedToFollowersOnly.length}
            accent="leaf"
          >
            <HandleList rows={analysis.addedToFollowersOnly} emptyLabel="No new followers." />
          </Panel>

          <Panel
            title="Mutually removed"
            hint="Missing from both following and followers vs. the last baseline — likely deleted/deactivated accounts."
            count={analysis.commonRemoved.length}
            accent="muted"
          >
            <HandleList rows={analysis.commonRemoved} emptyLabel="None." />
          </Panel>

          <Panel
            title="Mutually added"
            hint="New in both following and followers vs. the last baseline — a new mutual."
            count={analysis.commonAdded.length}
            accent="leaf"
          >
            <HandleList rows={analysis.commonAdded} emptyLabel="None." />
          </Panel>
        </div>
      )}
    </div>
  );
}
