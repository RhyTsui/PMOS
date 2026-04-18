export default function UserTracePanel({ userId, trace, loading, error, formatStepLabel }) {
  return (
    <section className="panel">
      <h2>Trace {userId ? `for ${userId}` : ""}</h2>
      {loading ? <p className="empty">Loading trace...</p> : null}
      {error ? <p className="error-message">{error}</p> : null}
      {!loading && !error && trace.length === 0 ? (
        <p className="empty">Click a user to load trace details.</p>
      ) : null}
      {!loading && !error && trace.length > 0 ? (
        <ol className="trace-list">
          {trace.map((step, index) => (
            <li key={`${step.step}-${step.time}-${index}`}>
              <strong>{formatStepLabel(step.step)}</strong>
              <span>{step.time}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
