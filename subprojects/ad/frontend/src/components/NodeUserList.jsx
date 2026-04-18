export default function NodeUserList({
  nodeLabel,
  users,
  loading,
  error,
  onUserClick,
  formatNodeLabel,
  formatSourceType,
  formatUserType,
}) {
  return (
    <section className="panel">
      <h2>Users {nodeLabel ? `for ${nodeLabel}` : ""}</h2>
      {loading ? <p className="empty">Loading users...</p> : null}
      {error ? <p className="error-message">{error}</p> : null}
      {!loading && !error && users.length === 0 ? <p className="empty">Click a node to load users.</p> : null}
      {!loading && !error && users.length > 0 ? (
        <ul className="user-list">
          {users.map((user) => (
            <li key={user.user_id}>
              <button type="button" onClick={() => onUserClick(user.user_id)}>
                <strong>{user.user_id}</strong>
                <span>{user.device_id}</span>
                <span>{formatSourceType(user.source_type)}</span>
                <span>{formatUserType(user.user_type)}</span>
                <span>当前环节：{formatNodeLabel(user.current_node)}</span>
                <span>归因结果：{formatNodeLabel(user.result_node)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
