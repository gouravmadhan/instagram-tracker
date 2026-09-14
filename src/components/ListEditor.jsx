import { useState } from 'react';

export default function ListEditor({ title, description, usernames, onAdd, onRemove, onClearAll }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [filter, setFilter] = useState('');
  const [note, setNote] = useState('');

  async function handleAdd(e) {
    e.preventDefault();
    if (!value.trim()) return;
    setBusy(true);
    setNote('');
    try {
      const before = usernames.length;
      const result = await onAdd(value);
      const after = result?.usernames?.length ?? before;
      const addedCount = result?.processed?.length ?? 0;
      setNote(
        addedCount > 1
          ? `Added ${after - before} new (${addedCount} pasted, rest already on the list).`
          : ''
      );
      setValue('');
    } finally {
      setBusy(false);
    }
  }

  async function handleClearAll() {
    if (usernames.length === 0) return;
    const confirmed = window.confirm(`Remove all ${usernames.length} usernames from "${title}"? This can't be undone.`);
    if (!confirmed) return;
    setClearing(true);
    try {
      await onClearAll();
    } finally {
      setClearing(false);
    }
  }

  const visible = filter
    ? usernames.filter((u) => u.toLowerCase().includes(filter.toLowerCase()))
    : usernames;

  return (
    <section className="rounded-lg border border-hair bg-panel p-5 flex flex-col">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-base text-cream">{title}</h3>
        <span className="font-mono text-sm text-violet">{usernames.length}</span>
      </div>
      <p className="text-xs text-muted mt-1 mb-4">{description}</p>

      <form onSubmit={handleAdd} className="mb-3">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={'username\nor paste many at once — comma, space, or newline separated'}
          rows={2}
          className="w-full bg-ink border border-hair rounded-md px-3 py-2 text-sm font-mono text-cream placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-violet resize-y"
        />
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted">{note}</p>
          <button
            type="submit"
            disabled={busy || !value.trim()}
            className="px-3 py-1.5 rounded-md bg-violet text-ink text-sm font-medium disabled:opacity-40 hover:bg-violet/90 transition-colors"
          >
            {busy ? 'Adding…' : 'Add'}
          </button>
        </div>
      </form>

      <div className="flex items-center justify-between gap-2 mb-2">
        {usernames.length > 8 ? (
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="filter…"
            className="flex-1 bg-transparent border-b border-hair text-xs text-muted px-1 py-1 focus:outline-none focus:border-violet"
          />
        ) : (
          <span />
        )}
        <button
          onClick={handleClearAll}
          disabled={clearing || usernames.length === 0}
          className="text-xs text-muted hover:text-coral transition-colors disabled:opacity-30 disabled:hover:text-muted shrink-0"
        >
          {clearing ? 'Removing…' : 'Remove all'}
        </button>
      </div>

      <ul className="divide-y divide-hair/60 max-h-64 overflow-y-auto pr-1">
        {visible.length === 0 && <li className="text-sm text-muted py-3">No usernames yet.</li>}
        {visible.map((u) => (
          <li key={u} className="flex items-center justify-between gap-3 py-2 group">
            <span className="font-mono text-sm text-cream truncate">@{u}</span>
            <span className="flex items-center gap-3 shrink-0">
              <a
                href={`https://www.instagram.com/${u}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-muted group-hover:text-violet transition-colors"
              >
                view ↗
              </a>
              <button
                onClick={() => onRemove(u)}
                className="text-xs text-muted hover:text-coral transition-colors opacity-0 group-hover:opacity-100"
              >
                remove
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
