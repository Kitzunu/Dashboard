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
  const [values, setValues]   = useState({});
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty]     = useState({});
  const [saving, setSaving]   = useState(false);

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
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
