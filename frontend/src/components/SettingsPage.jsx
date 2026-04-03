import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';

const ENV_SETTING_DEFS = [
  {
    section: 'Server Executables',
    restart: true,
    settings: [
      { key: 'WORLDSERVER_PATH', label: 'Worldserver path',      description: 'Full path to the worldserver executable.',  type: 'text', placeholder: 'C:\\AzerothCore\\worldserver.exe' },
      { key: 'AUTHSERVER_PATH',  label: 'Authserver path',       description: 'Full path to the authserver executable.',   type: 'text', placeholder: 'C:\\AzerothCore\\authserver.exe' },
      { key: 'WORLDSERVER_DIR',  label: 'Worldserver directory', description: 'Working directory for the worldserver process. Leave blank to use the executable\'s directory.', type: 'text', placeholder: 'C:\\AzerothCore' },
      { key: 'AUTHSERVER_DIR',   label: 'Authserver directory',  description: 'Working directory for the authserver process. Leave blank to use the executable\'s directory.',  type: 'text', placeholder: 'C:\\AzerothCore' },
    ],
  },
  {
    section: 'Data Paths',
    restart: true,
    settings: [
      { key: 'DBC_PATH',       label: 'DBC files path',       description: 'Path to the WotLK 3.3.5a DBFilesClient folder. Enables human-readable race, class, map, and zone names.', type: 'text', placeholder: 'C:\\WoW\\Data\\enUS\\DBFilesClient' },
      { key: 'CONFIG_PATH',    label: 'Config files path',    description: 'Directory containing worldserver.conf, authserver.conf, and module configs for the Config editor.',        type: 'text', placeholder: 'C:\\AzerothCore\\configs' },
      { key: 'BACKUP_PATH',    label: 'Backup directory',     description: 'Where database backup files are saved by scheduled backup tasks. Created automatically if missing.',       type: 'text', placeholder: 'C:\\AzerothCore\\backups' },
      { key: 'MYSQLDUMP_PATH', label: 'mysqldump path',       description: 'Full path to the mysqldump executable. Only needed if mysqldump is not on the system PATH.',              type: 'text', placeholder: 'C:\\MySQL\\bin\\mysqldump.exe' },
    ],
  },
  {
    section: 'Network & Access',
    restart: true,
    settings: [
      { key: 'FRONTEND_URL', label: 'Frontend URL(s)',  description: 'Comma-separated origins allowed by CORS. Include every address you use to open the dashboard (e.g. localhost and your LAN IP).', type: 'text', placeholder: 'http://localhost:5173,http://192.168.1.100:5173' },
      { key: 'ALLOWED_IPS',  label: 'Allowed IPs',     description: 'Comma-separated IPs that may reach the backend. Default is localhost only. Add LAN/WAN IPs for remote access.',                  type: 'text', placeholder: '127.0.0.1,::1,192.168.1.50' },
      { key: 'WORLDSERVER_HOST', label: 'Worldserver host', description: 'Host used for TCP latency measurement on the Overview page.',    type: 'text', placeholder: '127.0.0.1' },
      { key: 'WORLDSERVER_PORT', label: 'Worldserver port', description: 'Port used for TCP latency measurement on the Overview page.',    type: 'text', placeholder: '8085' },
    ],
  },
  {
    section: 'Session & Logging',
    restart: true,
    settings: [
      { key: 'IDLE_TIMEOUT_MINUTES',    label: 'Idle timeout (minutes)',        description: 'Auto-logout after this many minutes of inactivity. Set to 0 or leave blank to disable.',               type: 'text', placeholder: '30' },
      { key: 'AUDIT_LOG_RETENTION_DAYS', label: 'Audit log retention (days)',   description: 'Delete audit log entries older than this many days. Set to 0 or leave blank to keep logs forever.',    type: 'text', placeholder: '90' },
    ],
  },
  {
    section: 'Discord',
    restart: true,
    settings: [
      { key: 'DISCORD_WEBHOOK_URL', label: 'Webhook URL', description: 'Discord channel webhook URL for alerts. Leave blank to disable all Discord notifications.', type: 'text', placeholder: 'https://discord.com/api/webhooks/…' },
    ],
  },
];

const SETTING_DEFS = [
  {
    section: 'Config Editor',
    settings: [
      {
        key: 'config.bak_enabled',
        label: 'Create .bak backup on save',
        description: 'When enabled, saving a config file creates a .bak copy of the previous version in the same directory.',
        type: 'boolean',
        default: 'true',
      },
    ],
  },
  {
    section: 'Discord Alerts',
    settings: [
      {
        key: 'discord.enabled',
        label: 'Enable Discord alerts',
        description: 'Master switch. When off, no messages are sent regardless of other settings.',
        type: 'boolean',
        default: 'true',
      },
      {
        key: 'discord.webhook_username',
        label: 'Display name',
        description: 'Name shown on Discord messages. Overrides the webhook\'s default name.',
        type: 'text',
        default: 'AzerothCore Dashboard',
        placeholder: 'AzerothCore Dashboard',
      },
      {
        key: 'discord.webhook_avatar_url',
        label: 'Avatar URL',
        description: 'Direct link to an image (.png / .jpg) used as the bot avatar. Leave blank to use the dashboard icon.',
        type: 'text',
        default: 'https://raw.githubusercontent.com/Kitzunu/Dashboard/master/frontend/img/icon.png',
        placeholder: 'https://example.com/avatar.png',
      },
      {
        key: 'discord.alert_server_crash',
        label: 'Server offline alert',
        description: 'Send an alert when worldserver or authserver goes offline unexpectedly.',
        type: 'boolean',
        default: 'true',
      },
      {
        key: 'discord.message_server_crash',
        label: 'Server offline message',
        description: 'Available variables: {server}',
        type: 'textarea',
        default: '**{server}** has gone offline.',
      },
      {
        key: 'discord.alert_server_stop',
        label: 'Server stopped alert',
        description: 'Send an alert when worldserver or authserver is stopped manually.',
        type: 'boolean',
        default: 'true',
      },
      {
        key: 'discord.message_server_stop',
        label: 'Server stopped message',
        description: 'Available variables: {server}',
        type: 'textarea',
        default: '**{server}** was stopped manually.',
      },
      {
        key: 'discord.alert_server_online',
        label: 'Server online alert',
        description: 'Send an alert when worldserver or authserver comes back online.',
        type: 'boolean',
        default: 'true',
      },
      {
        key: 'discord.message_server_online',
        label: 'Server online message',
        description: 'Available variables: {server}',
        type: 'textarea',
        default: '**{server}** is online.',
      },
      {
        key: 'discord.alert_threshold',
        label: 'Resource threshold alert',
        description: 'Send an alert when CPU or memory usage exceeds the configured threshold. Repeats at most once every 5 minutes.',
        type: 'boolean',
        default: 'true',
      },
      {
        key: 'discord.message_threshold',
        label: 'Resource threshold message',
        description: 'Available variables: {resource}, {pct}, {threshold}',
        type: 'textarea',
        default: '**{resource}** usage is at **{pct}%** (threshold: {threshold}%).',
      },
      {
        key: 'discord.alert_agent_disconnect',
        label: 'Agent disconnect alert',
        description: 'Send an alert when the server agent loses its connection to the dashboard.',
        type: 'boolean',
        default: 'true',
      },
      {
        key: 'discord.message_agent_disconnect',
        label: 'Agent disconnect message',
        description: 'No variables available.',
        type: 'textarea',
        default: 'The server agent has disconnected. Game servers may be unmanaged.',
      },
    ],
  },
];

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      className={`settings-toggle${checked ? ' settings-toggle-on' : ''}`}
      onClick={() => onChange(!checked)}
      aria-checked={checked}
      role="switch"
    >
      <span className="settings-toggle-thumb" />
    </button>
  );
}

export default function SettingsPage() {
  const [values, setValues]     = useState({});
  const [loading, setLoading]   = useState(true);
  const [dirty, setDirty]       = useState({});
  const [saving, setSaving]     = useState(false);
  const [testing, setTesting]   = useState(false);

  const [envValues, setEnvValues]     = useState({});
  const [envDirty, setEnvDirty]       = useState({});
  const [envSaving, setEnvSaving]     = useState(false);
  const [envRestart, setEnvRestart]   = useState(false);
  const [restarting, setRestarting]   = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => Object.fromEntries(SETTING_DEFS.map((s) => [s.section, true]))
  );
  // All env groups start collapsed
  const [envCollapsed, setEnvCollapsed] = useState(
    () => Object.fromEntries(ENV_SETTING_DEFS.map((s) => [s.section, true]))
  );

  useEffect(() => {
    Promise.all([api.getSettings(), api.getEnvSettings()])
      .then(([s, e]) => { setValues(s); setEnvValues(e); setLoading(false); })
      .catch((err)  => { toast(err.message, 'error'); setLoading(false); });
  }, []);

  const getValue = (key, def) => {
    if (key in values) return values[key];
    return def;
  };

  const handleChange = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: String(value) }));
    setDirty((prev) => ({ ...prev, [key]: true }));
  };

  const handleSave = async () => {
    const changed = Object.fromEntries(
      Object.entries(dirty).filter(([, v]) => v).map(([k]) => [k, values[k]])
    );
    if (Object.keys(changed).length === 0) return;
    setSaving(true);
    try {
      const saved = await api.saveSettings(changed);
      setValues(saved);
      setDirty({});
      toast('Settings saved');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const hasDirty = Object.values(dirty).some(Boolean);

  const handleEnvChange = (key, value) => {
    setEnvValues((prev) => ({ ...prev, [key]: value }));
    setEnvDirty((prev)  => ({ ...prev, [key]: true  }));
  };

  const handleEnvSave = async () => {
    const changed = Object.fromEntries(
      Object.entries(envDirty).filter(([, v]) => v).map(([k]) => [k, envValues[k]])
    );
    if (Object.keys(changed).length === 0) return;
    setEnvSaving(true);
    try {
      await api.saveEnvSettings(changed);
      setEnvDirty({});
      setEnvRestart(true);
      toast('Environment settings saved — restart required to apply changes');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setEnvSaving(false);
    }
  };

  const hasEnvDirty = Object.values(envDirty).some(Boolean);

  const handleRestartBackend = async () => {
    setRestarting(true);
    try {
      await api.restartBackend();
      toast('Backend is restarting…');
      setEnvRestart(false);
    } catch {
      // Expected — connection drops as backend exits
      toast('Backend is restarting…');
      setEnvRestart(false);
    } finally {
      setRestarting(false);
    }
  };

  const handleTestWebhook = async () => {
    setTesting(true);
    try {
      await api.testDiscordWebhook();
      toast('Test message sent to Discord');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className="page"><div className="loading-text">Loading settings…</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Settings</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleEnvSave}
            disabled={!hasEnvDirty || envSaving}
          >
            {envSaving ? 'Saving…' : 'Save Environment'}
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={!hasDirty || saving}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {envRestart && (
        <div className="alert alert-warning" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ flex: 1 }}>
            ⚠ Environment settings were saved. <strong>Restart the backend</strong> to apply them.
            {' '}Settings affecting server executables (<code>WORLDSERVER_PATH</code>, <code>AUTHSERVER_PATH</code>, <code>*_DIR</code>) also require restarting the <strong>server agent</strong>.
          </span>
          <button className="btn btn-warning btn-sm" onClick={handleRestartBackend} disabled={restarting}>
            {restarting ? 'Restarting…' : 'Restart Backend'}
          </button>
          <button className="btn btn-ghost btn-xs" onClick={() => setEnvRestart(false)}>Dismiss</button>
        </div>
      )}

      {SETTING_DEFS.map((section) => {
        const isCollapsed = collapsed[section.section];
        const hasDirtyInSection = section.settings.some((d) => dirty[d.key]);
        return (
          <div key={section.section} className="settings-section" style={{ marginBottom: 10 }}>
            <button
              onClick={() => setCollapsed((prev) => ({ ...prev, [section.section]: !prev[section.section] }))}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: isCollapsed ? 'var(--radius)' : 'var(--radius) var(--radius) 0 0',
                padding: '10px 16px', cursor: 'pointer', color: 'var(--text)',
                textAlign: 'left',
              }}
            >
              <span className={`action-multiselect-chevron${isCollapsed ? '' : ' open'}`}>›</span>
              <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{section.section}</span>
              {hasDirtyInSection && (
                <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 500 }}>unsaved changes</span>
              )}
            </button>

            {!isCollapsed && (
              <>
                <div className="settings-card" style={{ borderTop: 'none', borderRadius: '0 0 var(--radius) var(--radius)' }}>
                  {section.settings.map((def, i) => (
                    <div key={def.key} className={`settings-row${i > 0 ? ' settings-row-divider' : ''}`}>
                      <div className="settings-row-info">
                        <span className="settings-row-label">{def.label}</span>
                        <span className="settings-row-description">{def.description}</span>
                      </div>
                      <div className="settings-row-control">
                        {def.type === 'boolean' && (
                          <Toggle
                            checked={getValue(def.key, def.default) === 'true'}
                            onChange={(val) => handleChange(def.key, val)}
                          />
                        )}
                        {def.type === 'text' && (
                          <input
                            className="filter-input"
                            type="text"
                            value={getValue(def.key, def.default)}
                            placeholder={def.placeholder ?? ''}
                            onChange={(e) => handleChange(def.key, e.target.value)}
                            style={{ width: 300 }}
                          />
                        )}
                        {def.type === 'textarea' && (
                          <textarea
                            className="filter-input"
                            value={getValue(def.key, def.default)}
                            onChange={(e) => handleChange(def.key, e.target.value)}
                            rows={2}
                            style={{ width: 300, resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 12 }}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {section.section === 'Discord Alerts' && (
                  <div style={{ marginTop: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={handleTestWebhook} disabled={testing}>
                      {testing ? 'Sending…' : 'Send Test Message'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      <div className="settings-section-title" style={{ marginTop: 24, marginBottom: 12 }}>
        Environment (.env) — <span style={{ color: 'var(--gold)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>restart required to apply changes</span>
      </div>

      {ENV_SETTING_DEFS.map((section) => {
        const collapsed = envCollapsed[section.section];
        const hasDirtyInSection = section.settings.some((d) => envDirty[d.key]);
        return (
          <div key={section.section} className="settings-section" style={{ marginBottom: 10 }}>
            <button
              onClick={() => setEnvCollapsed((prev) => ({ ...prev, [section.section]: !prev[section.section] }))}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: collapsed ? 'var(--radius)' : 'var(--radius) var(--radius) 0 0',
                padding: '10px 16px', cursor: 'pointer', color: 'var(--text)',
                textAlign: 'left',
              }}
            >
              <span className={`action-multiselect-chevron${collapsed ? '' : ' open'}`}>›</span>
              <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{section.section}</span>
              {hasDirtyInSection && (
                <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 500 }}>unsaved changes</span>
              )}
            </button>

            {!collapsed && (
              <div className="settings-card" style={{ borderTop: 'none', borderRadius: '0 0 var(--radius) var(--radius)' }}>
                {section.settings.map((def, i) => (
                  <div key={def.key} className={`settings-row${i > 0 ? ' settings-row-divider' : ''}`}>
                    <div className="settings-row-info">
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span className="settings-row-label">{def.label}</span>
                        <code style={{ fontSize: 10, color: 'var(--text-dim)', background: 'var(--surface2)', padding: '1px 5px', borderRadius: 3 }}>{def.key}</code>
                      </div>
                      <span className="settings-row-description">{def.description}</span>
                    </div>
                    <div className="settings-row-control">
                      <input
                        className={`filter-input${envDirty[def.key] ? ' input-dirty' : ''}`}
                        type="text"
                        value={envValues[def.key] ?? ''}
                        placeholder={def.placeholder ?? ''}
                        onChange={(e) => handleEnvChange(def.key, e.target.value)}
                        style={{ width: 320, fontFamily: 'var(--font-mono)', fontSize: 12 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
