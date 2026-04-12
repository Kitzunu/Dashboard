import React from 'react';
import { useServerStatus } from '../context/ServerContext.jsx';

/**
 * Server selector dropdown for targeting a specific worldserver process.
 * Only renders when multiple worldservers are configured.
 * Returns the server name (id) used by processManager.sendCommand().
 */
export default function ServerSelector({ value, onChange }) {
  const { worldservers } = useServerStatus();

  if (worldservers.length <= 1) return null;

  return (
    <div className="realm-selector">
      <label className="realm-selector-label">Server</label>
      <select
        className="realm-selector-select"
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">All Servers</option>
        {worldservers.map((ws) => (
          <option key={ws.id} value={ws.id}>{ws.name}</option>
        ))}
      </select>
    </div>
  );
}
