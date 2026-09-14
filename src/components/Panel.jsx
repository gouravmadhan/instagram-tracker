export default function Panel({ title, hint, count, accent = 'violet', children }) {
  const accentClasses = {
    violet: 'text-violet',
    coral: 'text-coral',
    leaf: 'text-leaf',
    amber: 'text-amber',
    muted: 'text-muted',
  };
  return (
    <section className="rounded-lg border border-hair bg-panel p-5">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h3 className="font-display text-base text-cream">{title}</h3>
        {typeof count === 'number' && (
          <span className={`font-mono text-sm ${accentClasses[accent] || accentClasses.violet}`}>
            {count}
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-muted mb-3">{hint}</p>}
      <div className="max-h-72 overflow-y-auto pr-1">{children}</div>
    </section>
  );
}
