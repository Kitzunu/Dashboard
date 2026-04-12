import React from 'react';
import { useServerStatus } from '../context/ServerContext.jsx';

/**
 * Shared realm selector dropdown — only renders when multiple realms are configured.
 * Reads/writes selectedRealmId from ServerContext.
 */
export default function RealmSelector() {
  const { worldservers, selectedRealmId, setSelectedRealmId } = useServerStatus();

  if (worldservers.length <= 1) return null;

  return (
    <div className="realm-selector">
      <label className="realm-selector-label">Realm</label>
      <select
        className="realm-selector-select"
        value={selectedRealmId}
        onChange={(e) => setSelectedRealmId(e.target.value)}
      >
        {worldservers.map((ws) => (
          <option key={ws.id} value={ws.id}>{ws.name}</option>
        ))}
      </select>
    </div>
  );
}
