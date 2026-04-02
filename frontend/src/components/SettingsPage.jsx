import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';

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
        default: '',
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

  useEffect(() => {
    api.getSettings()
      .then((data) => { setValues(data); setLoading(false); })
      .catch((err) => { toast(err.message, 'error'); setLoading(false); });
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
        <button
          className="btn btn-primary btn-sm"
          onClick={handleSave}
          disabled={!hasDirty || saving}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {SETTING_DEFS.map((section) => (
        <div key={section.section} className="settings-section">
          <div className="settings-section-title">{section.section}</div>
          <div className="settings-card">
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
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleTestWebhook}
                disabled={testing}
              >
                {testing ? 'Sending…' : 'Send Test Message'}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
