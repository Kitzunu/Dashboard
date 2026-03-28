import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';

// ── Save confirmation modal ───────────────────────────────────────────────────
function SaveConfirmModal({ fileName, filePath, linesChanged, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Save <span className="player-name-em">{fileName}</span>?</h3>
        <p className="modal-detail">
          This will overwrite the file on disk:
        </p>
        <p className="modal-detail" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, wordBreak: 'break-all' }}>
          {filePath}
        </p>
        <p className="modal-detail">
          A <code>.bak</code> backup of the current file will be created automatically before saving.
        </p>
        {linesChanged !== null && (
          <p className="modal-detail">
            <strong style={{ color: 'var(--warn)' }}>{linesChanged} line{linesChanged !== 1 ? 's' : ''} changed</strong> from the last saved version.
          </p>
        )}
        <div className="modal-actions">
          <button className="btn btn-success" onClick={onConfirm}>Save file</button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Discard confirmation modal ────────────────────────────────────────────────
function DiscardConfirmModal({ fileName, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Discard changes to <span className="player-name-em">{fileName}</span>?</h3>
        <p className="modal-detail">
          All unsaved edits will be lost and the editor will revert to the last saved version.
        </p>
        <div className="modal-actions">
          <button className="btn btn-danger" onClick={onConfirm}>Discard changes</button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// Count how many lines differ between two strings
function countChangedLines(a, b) {
  const al = a.split('\n');
  const bl = b.split('\n');
  const maxLen = Math.max(al.length, bl.length);
  let changed = 0;
  for (let i = 0; i < maxLen; i++) {
    if (al[i] !== bl[i]) changed++;
  }
  return changed;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ConfigPage() {
  const [configs, setConfigs]           = useState([]);
  const [active, setActive]             = useState(null);
  const [content, setContent]           = useState('');
  const [saved, setSaved]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');
  const [search, setSearch]             = useState('');
  const [searchMatch, setSearchMatch]   = useState(null);
  const [showSaveModal, setShowSaveModal]       = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  // pending tab switch target when user has unsaved changes
  const [pendingTab, setPendingTab]     = useState(null);
  const textareaRef = useRef(null);

  const isDirty  = content !== saved;
  const filePath = configs.find((c) => c.name === active)?.filePath || '';

  // Load config list on mount
  useEffect(() => {
    api.getConfigs()
      .then((list) => {
        setConfigs(list);
        const first = list.find((c) => c.exists);
        if (first) setActive(first.name);
      })
      .catch((err) => setError(err.message));
  }, []);

  // Load file whenever active tab changes
  useEffect(() => {
    if (!active) return;
    setLoading(true);
    setError('');
    setSearch('');
    setSearchMatch(null);
    api.getConfig(active)
      .then(({ content: c }) => { setContent(c); setSaved(c); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [active]);

  // Tab switch: if dirty show discard modal, otherwise switch immediately
  const switchTab = (name) => {
    if (name === active) return;
    if (isDirty) {
      setPendingTab(name);
      setShowDiscardModal(true);
    } else {
      setActive(name);
    }
  };

  // Confirmed discard — also handles tab-switch discard
  const confirmDiscard = () => {
    setShowDiscardModal(false);
    if (pendingTab) {
      setActive(pendingTab);
      setPendingTab(null);
    } else {
      setContent(saved);
    }
  };

  // Confirmed save
  const confirmSave = async () => {
    setShowSaveModal(false);
    setSaving(true);
    try {
      await api.saveConfig(active, content);
      setSaved(content);
      toast(`${active}.conf saved — backup written to .bak`);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Jump to first matching line
  const handleSearch = useCallback(() => {
    if (!search.trim() || !textareaRef.current) return;
    const term  = search.toLowerCase();
    const lines = content.split('\n');
    const idx   = lines.findIndex((l) => l.toLowerCase().includes(term));
    if (idx === -1) { setSearchMatch({ line: -1, count: 0 }); return; }

    const count = lines.filter((l) => l.toLowerCase().includes(term)).length;
    setSearchMatch({ line: idx + 1, count });

    const ta = textareaRef.current;
    const linesBefore = lines.slice(0, idx).join('\n');
    const charPos = linesBefore.length + (idx > 0 ? 1 : 0);
    ta.focus();
    ta.setSelectionRange(charPos, charPos + lines[idx].length);
    ta.scrollTop = Math.max(0, (idx - 5) * 19);
  }, [search, content]);

  const lineCount    = content.split('\n').length;
  const linesChanged = isDirty ? countChangedLines(saved, content) : 0;

  return (
    <div className="page config-page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Config Files</h2>
          <p className="page-sub config-filepath" title={filePath}>
            {filePath || 'Select a config file'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isDirty && (
            <span className="config-dirty-badge">
              {linesChanged} line{linesChanged !== 1 ? 's' : ''} changed
            </span>
          )}
          <button
            className="btn btn-ghost"
            onClick={() => setShowDiscardModal(true)}
            disabled={!isDirty || saving}
          >
            Discard
          </button>
          <button
            className="btn btn-success"
            onClick={() => setShowSaveModal(true)}
            disabled={!isDirty || saving || loading}
          >
            {saving ? 'Saving…' : 'Save…'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* File tabs */}
      <div className="config-tabs">
        {configs.map((c) => (
          <button
            key={c.name}
            className={`config-tab ${active === c.name ? 'active' : ''} ${!c.exists ? 'config-tab-missing' : ''}`}
            onClick={() => switchTab(c.name)}
            title={c.exists ? c.filePath : `File not found: ${c.filePath}`}
          >
            {c.name}.conf
            {active === c.name && isDirty && <span className="config-tab-dot" />}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="config-search-bar">
        <input
          className="config-search-input"
          type="text"
          placeholder="Find setting… (e.g. MaxPlayerLevel)"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setSearchMatch(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
        />
        <button className="btn btn-secondary btn-sm" onClick={handleSearch} disabled={!search.trim()}>
          Find
        </button>
        {searchMatch && (
          <span className={`config-search-result ${searchMatch.line === -1 ? 'config-search-none' : ''}`}>
            {searchMatch.line === -1
              ? 'No match'
              : `${searchMatch.count} match${searchMatch.count !== 1 ? 'es' : ''} — jumped to line ${searchMatch.line}`}
          </span>
        )}
      </div>

      {/* Editor */}
      {loading ? (
        <div className="loading-text">Loading config…</div>
      ) : (
        <div className="config-editor-wrap">
          <div className="config-line-numbers" aria-hidden="true">
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i + 1}>{i + 1}</div>
            ))}
          </div>
          <textarea
            ref={textareaRef}
            className="config-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />
        </div>
      )}

      <div className="config-footer">
        <span>{lineCount.toLocaleString()} lines</span>
        <span>{content.length.toLocaleString()} characters</span>
        {isDirty && <span className="config-dirty-badge">● {linesChanged} unsaved change{linesChanged !== 1 ? 's' : ''}</span>}
      </div>

      {/* Modals */}
      {showSaveModal && (
        <SaveConfirmModal
          fileName={`${active}.conf`}
          filePath={filePath}
          linesChanged={linesChanged}
          onConfirm={confirmSave}
          onClose={() => setShowSaveModal(false)}
        />
      )}

      {showDiscardModal && (
        <DiscardConfirmModal
          fileName={`${active}.conf`}
          onConfirm={confirmDiscard}
          onClose={() => { setShowDiscardModal(false); setPendingTab(null); }}
        />
      )}
    </div>
  );
}
