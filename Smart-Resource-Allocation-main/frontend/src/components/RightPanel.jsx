export default function RightPanel({ title, subtitle, open, onToggle, children }) {
  return (
    <section className={`right-panel-wrapper ${open ? 'open' : 'collapsed'}`}>
      <div className="right-panel-header panel-header">
        <div>
          <div className="panel-title">{title}</div>
          {subtitle && <div className="panel-subtitle">{subtitle}</div>}
        </div>
        <button className="btn btn-ghost right-panel-toggle" onClick={onToggle}>
          {open ? 'Close panel' : 'Open panel'}
        </button>
      </div>
      <div className="right-panel-body">{children}</div>
    </section>
  );
}
