/**
 * formatDate — ISO date string (or any Date-parseable value) → locale string.
 * Returns '—' for falsy input.
 */
export function formatDate(val) {
  if (!val) return '—';
  return new Date(val).toLocaleString();
}

/**
 * formatUnixDate — Unix timestamp in seconds → locale string.
 * Returns '—' for falsy input.
 */
export function formatUnixDate(unix) {
  if (!unix) return '—';
  return new Date(unix * 1000).toLocaleString();
}

/**
 * timeAgo — ISO date string → relative time label ("5m ago", "2h ago", "3d ago").
 * Returns '—' for falsy input.
 */
export function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
