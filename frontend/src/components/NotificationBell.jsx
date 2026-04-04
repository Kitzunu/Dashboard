import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api.js';

const POLL_INTERVAL_MS = 30000;

const TYPE_LABELS = {
  latency:          'Latency',
  threshold:        'Resource Threshold',
  server_crash:     'Server Crash',
  server_online:    'Server Online',
  server_stop:      'Server Stopped',
  agent_disconnect: 'Agent Disconnect',
};

function severityClass(severity) {
  switch (severity) {
    case 'critical': return 'notif-critical';
    case 'warning':  return 'notif-warning';
    default:         return 'notif-info';
  }
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationBell({ onNavigate }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  const fetchCount = useCallback(async () => {
    try {
      const data = await api.getUnreadCount();
      setUnreadCount(data.count);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchCount]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleOpen = async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    setLoading(true);
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications || []);
      // Mark as read
      if (data.notifications && data.notifications.length > 0) {
        const maxId = Math.max(...data.notifications.map((n) => n.id));
        await api.markNotificationsRead(maxId);
        setUnreadCount(0);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="notification-bell-container" ref={panelRef}>
      <button className="notification-bell-btn" onClick={handleOpen} aria-label="Notifications" title="Notifications">
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <span style={{ fontWeight: 600 }}>Notifications</span>
            {onNavigate && (
              <button className="btn btn-ghost btn-xs"
                onClick={() => { setOpen(false); onNavigate('alerts'); }}>
                View All
              </button>
            )}
          </div>
          <div className="notification-panel-body">
            {loading ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)' }}>Loading…</div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)' }}>No notifications</div>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <div key={n.id} className={`notification-item ${severityClass(n.severity)}`}>
                  <div className="notification-item-header">
                    <span className="notification-item-type">{TYPE_LABELS[n.type] || n.type}</span>
                    <span className="notification-item-time">{timeAgo(n.created_at)}</span>
                  </div>
                  <div className="notification-item-title">{n.title}</div>
                  {n.description && (
                    <div className="notification-item-desc">{n.description}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
