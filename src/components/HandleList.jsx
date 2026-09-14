export default function HandleList({ rows, emptyLabel = 'Nothing here', renderActions }) {
  if (!rows || rows.length === 0) {
    return <p className="text-sm text-muted py-3">{emptyLabel}</p>;
  }
  return (
    <ul className="divide-y divide-hair/60">
      {rows.map((row) => (
        <li key={row.username} className="flex items-center justify-between gap-3 py-2 group">
          <span className="font-mono text-sm text-cream truncate">@{row.username}</span>
          <span className="flex items-center gap-3 shrink-0">
            {renderActions?.(row)}
            <a
              href={row.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted group-hover:text-violet transition-colors"
            >
              view ↗
            </a>
          </span>
        </li>
      ))}
    </ul>
  );
}
