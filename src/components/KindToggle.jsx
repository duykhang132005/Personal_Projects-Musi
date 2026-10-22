export default function KindToggle({ kind, onChange }) {
  const opts = [['song', 'Songs'], ['album', 'Albums']];
  const i = opts.findIndex(([k]) => k === kind);
  return (
    <div className="seg" role="tablist" style={{ '--seg-i': i }}>
      <span className="seg__pill" aria-hidden="true" />
      {opts.map(([k, label]) => (
        <button key={k} role="tab" aria-selected={kind === k} className={kind === k ? 'on' : ''} onClick={() => onChange(k)}>
          {label}
        </button>
      ))}
    </div>
  );
}
