import React, { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';
import { FALLBACK_RACES, FALLBACK_CLASSES } from '../constants.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMoney(copper) {
  if (!copper) return '0g';
  const g = Math.floor(copper / 10000);
  const s = Math.floor((copper % 10000) / 100);
  const c = copper % 100;
  const parts = [];
  if (g) parts.push(<span key="g" style={{ color: '#e6cc80' }}>{g}<span className="char-coin">g</span></span>);
  if (s) parts.push(<span key="s" style={{ color: '#c0c0c0' }}>{s}<span className="char-coin">s</span></span>);
  if (c || !g && !s) parts.push(<span key="c" style={{ color: '#cd7f32' }}>{c}<span className="char-coin">c</span></span>);
  return <span style={{ display: 'inline-flex', gap: 4 }}>{parts}</span>;
}

function fmtTime(secs) {
  if (!secs) return '—';
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  return parts.join(' ') || '< 1m';
}

const QUALITY_COLORS = {
  0: '#9d9d9d', 1: '#ffffff', 2: '#1eff00',
  3: '#0070dd', 4: '#a335ee', 5: '#ff8000',
  6: '#e6cc80', 7: '#e6cc80',
};

function ItemLink({ item }) {
  if (!item) return <span className="td-muted">—</span>;
  return (
    <a
      data-wowhead={`item=${item.itemEntry}&domain=wotlk`}
      href={`https://www.wowhead.com/wotlk/item=${item.itemEntry}`}
      target="_blank"
      rel="noreferrer"
      style={{ color: QUALITY_COLORS[item.quality] ?? '#fff', fontWeight: 500, textDecoration: 'none' }}
    >
      {item.count > 1 && <span className="td-muted" style={{ marginRight: 4 }}>{item.count}×</span>}
      {item.name}
    </a>
  );
}

// class → primary power slot (1-indexed) and label
const CLASS_POWER = {
   1: { key: 'power2', label: 'Rage'        },  // Warrior
   2: { key: 'power1', label: 'Mana'        },  // Paladin
   3: { key: 'power1', label: 'Mana'        },  // Hunter
   4: { key: 'power4', label: 'Energy'      },  // Rogue
   5: { key: 'power1', label: 'Mana'        },  // Priest
   6: { key: 'power7', label: 'Runic Power' },  // Death Knight
   7: { key: 'power1', label: 'Mana'        },  // Shaman
   8: { key: 'power1', label: 'Mana'        },  // Mage
   9: { key: 'power1', label: 'Mana'        },  // Warlock
  11: { key: 'power1', label: 'Mana'        },  // Druid
};

function fmt1(n) { return n != null ? n.toFixed(1) + '%' : '—'; }
function fmtNum(n) { return n != null ? n.toLocaleString() : '—'; }

const STANDING_COLORS = {
  Exalted:    '#e6cc80',
  Revered:    '#0070dd',
  Honored:    '#1eff00',
  Friendly:   '#1eff00',
  Neutral:    '#9d9d9d',
  Unfriendly: '#ff8000',
  Hostile:    '#e05c5c',
  Hated:      '#e05c5c',
};

// ── PDump Modal ───────────────────────────────────────────────────────────────

function PDumpModal({ guid, name, onClose }) {
  const [mode, setMode]         = useState('download'); // 'download' | 'server'
  const [filePath, setFilePath] = useState('');
  const [busy, setBusy]         = useState(false);
  const [result, setResult]     = useState(null); // { ok, path } | null

  // Pre-fill path from server config: <defaultDir>/<CharName>_<guid>.sql
  useEffect(() => {
    api.pdumpDefaultPath().then(({ path: dir }) => {
      if (dir) setFilePath(`${dir}/${name}_${guid}.sql`);
    }).catch(() => {});
  }, [guid, name]);

  async function handleExport() {
    setBusy(true);
    setResult(null);
    try {
      if (mode === 'download') {
        const { blob, filename } = await api.pdumpDownload(guid);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        toast(`Downloaded ${filename}`, 'success');
        onClose();
      } else {
        if (!filePath.trim()) {
          toast('Please enter a file path', 'error');
          setBusy(false);
          return;
        }
        const data = await api.pdumpSave(guid, filePath.trim());
        setResult(data);
        toast(`Dump saved to ${data.path}`, 'success');
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-structured" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>Export Character Dump</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div style={{ padding: '0 24px 8px' }}>
          <p className="td-muted" style={{ marginBottom: 12 }}>
            Generating a pdump for <strong style={{ color: 'var(--text)' }}>{name}</strong>.
            The output is compatible with the AzerothCore <code>.pdump load</code> command.
          </p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button
              className={`btn ${mode === 'download' ? '' : 'btn-secondary'}`}
              onClick={() => { setMode('download'); setResult(null); }}
            >
              Download to browser
            </button>
            <button
              className={`btn ${mode === 'server' ? '' : 'btn-secondary'}`}
              onClick={() => { setMode('server'); setResult(null); }}
            >
              Save on server
            </button>
          </div>

          {mode === 'server' && (
            <div style={{ marginBottom: 12 }}>
              <label className="form-label">Server file path</label>
              <input
                className="input"
                placeholder="e.g. C:\backups\character_dump.sql"
                value={filePath}
                onChange={e => setFilePath(e.target.value)}
                disabled={busy || !!result}
              />
              <div className="td-muted" style={{ fontSize: 11, marginTop: 4 }}>
                The path is resolved on the backend machine. The directory is created automatically if missing.
              </div>
            </div>
          )}

          {result && (
            <div className="badge badge-green" style={{ display: 'block', wordBreak: 'break-all', padding: '6px 10px', marginBottom: 12 }}>
              Saved to: {result.path}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          {!result && (
            <button className="btn" onClick={handleExport} disabled={busy}>
              {busy ? 'Generating…' : mode === 'download' ? 'Download' : 'Save to server'}
            </button>
          )}
          {result && (
            <button className="btn" onClick={onClose}>Done</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── PDump Load Modal ──────────────────────────────────────────────────────────

function PDumpLoadModal({ onClose }) {
  const [mode, setMode]               = useState('upload');   // 'upload' | 'server'
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName]       = useState('');
  const [filePath, setFilePath]       = useState('');
  const [serverFiles, setServerFiles] = useState([]);
  const [accountQuery, setAccountQuery] = useState('');
  const [accountResults, setAccountResults] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [charName, setCharName]       = useState('');
  const [charGuid, setCharGuid]       = useState('');
  const [busy, setBusy]               = useState(false);
  const [result, setResult]           = useState(null);
  const accountDebounce               = useRef(null);

  // Pre-fill path with the configured default dump directory
  useEffect(() => {
    api.pdumpDefaultPath().then(({ path: dir }) => {
      if (dir) setFilePath(dir);
    }).catch(() => {});
    api.pdumpListFiles().then(({ files }) => {
      setServerFiles(Array.isArray(files) ? files : []);
    }).catch(() => {});
  }, []);

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setFileContent(ev.target.result);
    reader.readAsText(file, 'utf-8');
  }

  function handleAccountSearch(value) {
    setAccountQuery(value);
    setSelectedAccount(null);
    clearTimeout(accountDebounce.current);
    if (value.length < 2) { setAccountResults([]); return; }
    accountDebounce.current = setTimeout(async () => {
      try {
        const data = await api.searchAccounts(value);
        setAccountResults(Array.isArray(data) ? data : (data.rows ?? []));
      } catch { setAccountResults([]); }
    }, 300);
  }

  async function handleLoad() {
    if (!selectedAccount) { toast('Select a target account first', 'error'); return; }
    if (mode === 'upload' && !fileContent) { toast('Select a dump file first', 'error'); return; }
    if (mode === 'server' && !filePath.trim()) { toast('Enter a server file path', 'error'); return; }

    setBusy(true);
    setResult(null);
    try {
      const guidStr = charGuid.trim();
      const body = {
        accountId: selectedAccount.id,
        characterName: charName.trim(),
        characterGuid: guidStr ? parseInt(guidStr, 10) : 0,
      };
      if (mode === 'upload') body.content  = fileContent;
      else                   body.filePath = filePath.trim();

      const data = await api.pdumpLoad(body);
      setResult(data);
      toast(`Character ${data.characterName} loaded (GUID ${data.characterGuid})`, 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-structured" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>Import Character Dump</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div style={{ padding: '0 24px 8px' }}>

          {/* Source mode */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button className={`btn ${mode === 'upload' ? '' : 'btn-secondary'}`} onClick={() => { setMode('upload'); setResult(null); }}>
              Upload file
            </button>
            <button className={`btn ${mode === 'server' ? '' : 'btn-secondary'}`} onClick={() => { setMode('server'); setResult(null); }}>
              Server path
            </button>
          </div>

          {mode === 'upload' && (
            <div style={{ marginBottom: 14 }}>
              <label className="form-label">Dump file (.sql)</label>
              <input type="file" accept=".sql,.txt" className="input" onChange={handleFileSelect} disabled={busy || !!result} />
              {fileName && <div className="td-muted" style={{ fontSize: 11, marginTop: 4 }}>Selected: {fileName}</div>}
            </div>
          )}

          {mode === 'server' && (
            <div style={{ marginBottom: 14 }}>
              <label className="form-label">Server file path</label>
              <input
                className="input"
                placeholder="e.g. C:\backups\character_dump.sql"
                value={filePath}
                onChange={e => setFilePath(e.target.value)}
                disabled={busy || !!result}
              />
              {serverFiles.length > 0 && (
                <div style={{ border: '1px solid var(--border)', borderRadius: 4, marginTop: 6, maxHeight: 150, overflowY: 'auto' }}>
                  {serverFiles.map(f => (
                    <div
                      key={f.path}
                      style={{ padding: '5px 10px', cursor: 'pointer', fontSize: 13, background: filePath === f.path ? 'var(--surface-hover)' : '' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = filePath === f.path ? 'var(--surface-hover)' : ''}
                      onClick={() => !busy && !result && setFilePath(f.path)}
                    >
                      {f.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Account selector */}
          <div style={{ marginBottom: 14, position: 'relative' }}>
            <label className="form-label">Target account</label>
            {selectedAccount ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="badge badge-green">{selectedAccount.username} (#{selectedAccount.id})</span>
                <button className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => { setSelectedAccount(null); setAccountQuery(''); }} disabled={busy || !!result}>
                  Change
                </button>
              </div>
            ) : (
              <>
                <input
                  className="input"
                  placeholder="Search account by username…"
                  value={accountQuery}
                  onChange={e => handleAccountSearch(e.target.value)}
                  disabled={busy || !!result}
                />
                {accountResults.length > 0 && (
                  <div style={{
                    position: 'absolute', zIndex: 10, background: 'var(--surface)',
                    border: '1px solid var(--border)', borderRadius: 4,
                    width: '100%', maxHeight: 180, overflowY: 'auto',
                  }}>
                    {accountResults.map(a => (
                      <div
                        key={a.id}
                        style={{ padding: '6px 10px', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}
                        onClick={() => { setSelectedAccount(a); setAccountQuery(a.username); setAccountResults([]); }}
                      >
                        {a.username} <span className="td-muted">#{a.id}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Optional character name */}
          <div style={{ marginBottom: 14 }}>
            <label className="form-label">New character name <span className="td-muted" style={{ textTransform: 'none', fontWeight: 400 }}>(optional — leave blank to keep original)</span></label>
            <input
              className="input"
              placeholder="Leave blank to use name from dump"
              value={charName}
              onChange={e => setCharName(e.target.value)}
              disabled={busy || !!result}
            />
          </div>

          {/* Optional GUID */}
          <div style={{ marginBottom: 14 }}>
            <label className="form-label">New GUID <span className="td-muted" style={{ textTransform: 'none', fontWeight: 400 }}>(optional — leave blank to auto-assign)</span></label>
            <input
              className="input"
              type="number"
              min="1"
              step="1"
              placeholder="Leave blank to auto-assign a GUID"
              value={charGuid}
              onChange={e => setCharGuid(e.target.value)}
              disabled={busy || !!result}
            />
          </div>

          {/* Result */}
          {result && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '10px 12px', marginBottom: 8, fontSize: 13 }}>
              <div style={{ color: 'var(--green)', fontWeight: 600, marginBottom: 6 }}>Character imported successfully</div>
              <div><span className="td-muted">Name:</span> {result.characterName}{result.forceRename ? <span className="badge badge-warn" style={{ marginLeft: 6, fontSize: 10 }}>rename on login</span> : null}</div>
              <div><span className="td-muted">GUID:</span> {result.characterGuid}</div>
              <div><span className="td-muted">Statements executed:</span> {result.tablesLoaded}</div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Close</button>
          {!result && (
            <button className="btn" onClick={handleLoad} disabled={busy}>
              {busy ? 'Importing…' : 'Import'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tab components ────────────────────────────────────────────────────────────

function StatsTab({ stats, charClass }) {
  if (!stats) return <div className="empty-state">Stats unavailable — character has not been online yet.</div>;

  const power    = CLASS_POWER[charClass] ?? { key: 'power1', label: 'Mana' };
  const maxPower = stats.powers[power.key.replace('power', 'maxpower')];
  const curPower = stats.powers.current[power.key];

  return (
    <div className="char-stats-wrap">

      {/* Base stats */}
      <div className="char-section-title">Base Stats</div>
      <div className="char-stat-grid">
        {[
          ['Strength',  stats.base.strength],
          ['Agility',   stats.base.agility],
          ['Stamina',   stats.base.stamina],
          ['Intellect', stats.base.intellect],
          ['Spirit',    stats.base.spirit],
        ].map(([label, val]) => (
          <div className="char-stat" key={label}>
            <span className="char-stat-label">{label}</span>
            <span>{fmtNum(val)}</span>
          </div>
        ))}
      </div>

      {/* Health & Power */}
      <div className="char-section-title">Health &amp; Power</div>
      <div className="char-stat-grid">
        <div className="char-stat">
          <span className="char-stat-label">Health</span>
          <span>{fmtNum(stats.health.current)} / {fmtNum(stats.health.max)}</span>
        </div>
        <div className="char-stat">
          <span className="char-stat-label">{power.label}</span>
          <span>{fmtNum(curPower)} / {fmtNum(maxPower)}</span>
        </div>
      </div>

      {/* Combat */}
      <div className="char-section-title">Combat</div>
      <div className="char-stat-grid">
        {[
          ['Attack Power',        fmtNum(stats.combat.attackPower)],
          ['Ranged Attack Power', fmtNum(stats.combat.rangedAttackPower)],
          ['Spell Power',         fmtNum(stats.combat.spellPower)],
          ['Melee Crit',          fmt1(stats.combat.critPct)],
          ['Ranged Crit',         fmt1(stats.combat.rangedCritPct)],
          ['Spell Crit',          fmt1(stats.combat.spellCritPct)],
          ['Dodge',               fmt1(stats.combat.dodgePct)],
          ['Parry',               fmt1(stats.combat.parryPct)],
          ['Block',               fmt1(stats.combat.blockPct)],
          ['Armor',               fmtNum(stats.combat.armor)],
          ['Resilience',          fmtNum(stats.combat.resilience)],
        ].map(([label, val]) => (
          <div className="char-stat" key={label}>
            <span className="char-stat-label">{label}</span>
            <span>{val}</span>
          </div>
        ))}
      </div>

      {/* Resistances */}
      <div className="char-section-title">Resistances</div>
      <div className="char-stat-grid">
        {Object.entries(stats.resistances).map(([school, val]) => (
          <div className="char-stat" key={school}>
            <span className="char-stat-label" style={{ textTransform: 'capitalize' }}>{school}</span>
            <span>{fmtNum(val)}</span>
          </div>
        ))}
      </div>

    </div>
  );
}

function OverviewTab({ char }) {
  const [races, setRaces]     = useState(FALLBACK_RACES);
  const [classes, setClasses] = useState(FALLBACK_CLASSES);
  useEffect(() => {
    api.getDBCRaces().then(({ races: r }) => {
      if (r && Object.keys(r).length > 0) setRaces(r);
    }).catch(() => {});
    api.getDBCClasses().then(({ classes: c }) => {
      if (c && Object.keys(c).length > 0) setClasses(c);
    }).catch(() => {});
  }, []);

  return (
    <div className="char-overview">
      <div className="char-stat-grid">
        <div className="char-stat">
          <span className="char-stat-label">Race</span>
          <span>{races[char.race] ?? char.race}</span>
        </div>
        <div className="char-stat">
          <span className="char-stat-label">Class</span>
          <span>{classes[char.class] ?? char.class}</span>
        </div>
        <div className="char-stat">
          <span className="char-stat-label">Level</span>
          <span>{char.level}</span>
        </div>
        <div className="char-stat">
          <span className="char-stat-label">Status</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: char.online ? 'var(--green)' : 'var(--text-dim)', flexShrink: 0 }} />
            {char.online ? 'Online' : 'Offline'}
          </span>
        </div>
        <div className="char-stat">
          <span className="char-stat-label">Money</span>
          <span>{formatMoney(char.money)}</span>
        </div>
        <div className="char-stat">
          <span className="char-stat-label">Honor Points</span>
          <span>{(char.totalHonorPoints ?? 0).toLocaleString()}</span>
        </div>
        <div className="char-stat">
          <span className="char-stat-label">Arena Points</span>
          <span>{(char.arenaPoints ?? 0).toLocaleString()}</span>
        </div>
        <div className="char-stat">
          <span className="char-stat-label">Total Kills</span>
          <span>{(char.totalKills ?? 0).toLocaleString()}</span>
        </div>
        <div className="char-stat">
          <span className="char-stat-label">Played Time</span>
          <span>{fmtTime(char.totaltime)}</span>
        </div>
      </div>

      {char.currency?.length > 0 && (
        <>
          <div className="char-section-title">Currency</div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Currency</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'right' }}>This Week</th>
                </tr>
              </thead>
              <tbody>
                {char.currency.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td style={{ textAlign: 'right' }}>{c.total.toLocaleString()}</td>
                    <td style={{ textAlign: 'right' }} className="td-muted">{c.thisWeek.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function EquipmentTab({ equipment }) {
  const equipped = equipment.filter((s) => s.item);
  if (equipped.length === 0) return <div className="empty-state">No items equipped.</div>;
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr><th>Slot</th><th>Item</th></tr>
        </thead>
        <tbody>
          {equipment.map((s) => (
            <tr key={s.slot}>
              <td className="td-muted" style={{ width: 110, whiteSpace: 'nowrap' }}>{s.label}</td>
              <td><ItemLink item={s.item} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ItemListTab({ bags, label = 'bag' }) {
  const [activeBag, setActiveBag] = useState(0);
  const bag = bags[activeBag];

  return (
    <div className="char-bags">
      <div className="guild-bank-tabs">
        {bags.map((b, i) => (
          <button
            key={i}
            className={`guild-bank-tab${activeBag === i ? ' guild-bank-tab-active' : ''}`}
            onClick={() => setActiveBag(i)}
          >
            {b.label}
            {!b.empty && <span className="guild-tab-count">{b.items.length}</span>}
            {b.empty && <span className="guild-tab-count td-muted">—</span>}
          </button>
        ))}
      </div>

      {bag.empty ? (
        <div className="empty-state">No {label} in this slot.</div>
      ) : bag.items.length === 0 ? (
        <div className="empty-state">This {label} is empty.</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Item</th><th style={{ textAlign: 'center' }}>Qty</th></tr>
            </thead>
            <tbody>
              {bag.items.map((item, i) => (
                <tr key={i}>
                  <td><ItemLink item={item} /></td>
                  <td style={{ textAlign: 'center' }}>{item.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function fmtDuration(ms) {
  if (ms === -1) return 'Permanent';
  if (ms <= 0)   return 'Expired';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

function AurasTab({ auras }) {
  if (!auras || auras.length === 0)
    return <div className="empty-state">No auras recorded.</div>;

  return (
    <div className="table-wrap">
      <table className="data-table">
        <colgroup>
          <col />
          <col style={{ width: 60 }} />
          <col style={{ width: 110 }} />
          <col style={{ width: 60 }} />
        </colgroup>
        <thead>
          <tr>
            <th>Spell</th>
            <th style={{ textAlign: 'center' }}>Stacks</th>
            <th style={{ textAlign: 'right' }}>Duration</th>
            <th style={{ textAlign: 'center' }}>Charges</th>
          </tr>
        </thead>
        <tbody>
          {auras.map((a) => (
            <tr key={a.spellId}>
              <td>
                <a
                  href={`https://www.wowhead.com/wotlk/spell=${a.spellId}`}
                  data-wowhead={`spell=${a.spellId}&domain=wotlk`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 500 }}
                >
                  {a.name}
                </a>
              </td>
              <td style={{ textAlign: 'center' }} className="td-muted">
                {a.stackCount > 1 ? a.stackCount : '—'}
              </td>
              <td style={{ textAlign: 'right' }} className="td-muted">
                {fmtDuration(a.remainTime)}
              </td>
              <td style={{ textAlign: 'center' }} className="td-muted">
                {a.remainCharges > 0 ? a.remainCharges : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BankTab({ bank }) {
  const [section, setSection] = useState('0');

  const allBags = [
    { label: 'Main', items: bank.main, empty: false },
    ...bank.bags.filter((b) => !b.empty),
  ];

  return (
    <div className="char-bags">
      <div className="guild-bank-tabs">
        {allBags.map((b, i) => (
          <button
            key={i}
            className={`guild-bank-tab${section === String(i) ? ' guild-bank-tab-active' : ''}`}
            onClick={() => setSection(String(i))}
          >
            {b.label}
            {!b.empty && <span className="guild-tab-count">{b.items.length}</span>}
            {b.empty && <span className="guild-tab-count td-muted">—</span>}
          </button>
        ))}
      </div>

      {(() => {
        const bag = allBags[parseInt(section)];
        if (bag.empty) return <div className="empty-state">No bag in this bank slot.</div>;
        if (bag.items.length === 0) return <div className="empty-state">This slot is empty.</div>;
        return (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Item</th><th style={{ textAlign: 'center' }}>Qty</th></tr>
              </thead>
              <tbody>
                {bag.items.map((item, i) => (
                  <tr key={i}>
                    <td><ItemLink item={item} /></td>
                    <td style={{ textAlign: 'center' }}>{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}
    </div>
  );
}

function AchievementsTab({ achievements }) {
  const [search, setSearch]       = useState('');
  const [expanded, setExpanded]   = useState({});

  if (!achievements || achievements.count === 0)
    return <div className="empty-state">No achievements earned{achievements ? '' : ' (DBC not configured)'}.</div>;

  const toggleCat = (label) => setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));

  const filtered = search
    ? achievements.categories.map((cat) => ({
        ...cat,
        achievements: cat.achievements.filter((a) =>
          a.name.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter((cat) => cat.achievements.length > 0)
    : achievements.categories;

  return (
    <div className="char-achievements">
      <div className="char-ach-header">
        <span className="td-muted">
          {achievements.count} achievements · {achievements.totalPoints.toLocaleString()} points
        </span>
        <input
          className="filter-input"
          placeholder="Search achievements…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 220 }}
        />
      </div>

      {filtered.map((cat) => {
        const isOpen = expanded[cat.label] !== false; // default open
        return (
          <div key={cat.label} className="char-ach-category">
            <button className="char-ach-cat-header" onClick={() => toggleCat(cat.label)}>
              <span className="char-ach-cat-name">{cat.label}</span>
              <span className="guild-tab-count">{cat.achievements.length}</span>
              <span className="char-ach-chevron">{isOpen ? '▲' : '▼'}</span>
            </button>
            {isOpen && (
              <div className="table-wrap">
                <table className="data-table">
                  <colgroup>
                    <col />
                    <col style={{ width: 80 }} />
                    <col style={{ width: 120 }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Achievement</th>
                      <th style={{ textAlign: 'center' }}>Points</th>
                      <th style={{ textAlign: 'right' }}>Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cat.achievements.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <a
                            href={`https://www.wowhead.com/wotlk/achievement=${a.id}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: '#e6cc80', textDecoration: 'none', fontWeight: 500 }}
                          >
                            {a.name}
                          </a>
                        </td>
                        <td style={{ textAlign: 'center' }} className="td-muted">{a.points}</td>
                        <td className="td-muted" style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                          {a.date ? new Date(a.date * 1000).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ReputationTab({ reputation }) {
  const [filter, setFilter]       = useState('all');
  const [sortDir, setSortDir]     = useState(null); // null | 'desc' | 'asc'

  const cycleSort = () => setSortDir((d) => d === null ? 'desc' : d === 'desc' ? 'asc' : null);

  const STANDING_FILTERS = ['Exalted', 'Revered', 'Honored', 'Friendly', 'Neutral', 'Unfriendly', 'Hostile', 'Hated'];

  let filtered = reputation.filter((r) => {
    if (filter === 'atwar') return r.atWar;
    if (STANDING_FILTERS.includes(filter)) return r.label === filter;
    return true;
  });

  if (sortDir === 'desc') filtered = [...filtered].sort((a, b) => b.standing - a.standing);
  else if (sortDir === 'asc') filtered = [...filtered].sort((a, b) => a.standing - b.standing);

  if (reputation.length === 0) return <div className="empty-state">No reputation data.</div>;

  const sortIcon = sortDir === 'desc' ? ' ▼' : sortDir === 'asc' ? ' ▲' : ' ⇅';

  return (
    <div className="char-rep">
      <div className="char-rep-filters">
        {['all', 'atwar', ...STANDING_FILTERS].map((f) => (
          <button
            key={f}
            className={`guild-bank-tab${filter === f ? ' guild-bank-tab-active' : ''}`}
            onClick={() => setFilter(f)}
            style={STANDING_FILTERS.includes(f) && filter === f ? { color: STANDING_COLORS[f] } : undefined}
          >
            {f === 'all' ? 'All' : f === 'atwar' ? 'At War' : f}
          </button>
        ))}
        <span className="td-muted" style={{ fontSize: 12, marginLeft: 4 }}>{filtered.length} factions</span>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Faction</th>
              <th
                style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                onClick={cycleSort}
              >
                Standing{sortIcon}
              </th>
              <th style={{ width: 160 }}>Progress</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.faction}>
                <td>
                  {r.atWar && <span className="badge badge-red" style={{ marginRight: 6, fontSize: 10 }}>WAR</span>}
                  {r.factionName}
                </td>
                <td style={{ color: STANDING_COLORS[r.label] ?? 'var(--text)', whiteSpace: 'nowrap' }}>
                  {r.label}
                </td>
                <td>
                  <div className="char-rep-bar-wrap">
                    <div
                      className="char-rep-bar"
                      style={{
                        width: `${Math.round((r.progress.current / r.progress.max) * 100)}%`,
                        background: STANDING_COLORS[r.label] ?? 'var(--accent)',
                      }}
                    />
                  </div>
                  <span className="td-muted" style={{ fontSize: 11 }}>
                    {r.progress.current.toLocaleString()} / {r.progress.max.toLocaleString()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS = ['Overview', 'Stats', 'Equipment', 'Bags', 'Bank', 'Auras', 'Reputation', 'Achievements'];

export default function CharacterPage({ initialGuid = null }) {
  const [query, setQuery]           = useState('');
  const [results, setResults]       = useState([]);
  const [searching, setSearching]   = useState(false);
  const [selected, setSelected]     = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab]   = useState('Overview');
  const [showDump, setShowDump]     = useState(false);
  const [showLoad, setShowLoad]     = useState(false);
  const debounceRef = useRef(null);

  // Auto-load a character when navigated here from another page (e.g. Players list)
  useEffect(() => {
    if (initialGuid) openDetail(initialGuid);
  // openDetail is defined below but stable — intentionally omitting from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialGuid]);

  const handleSearch = useCallback((value) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    if (value.length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await api.searchCharacters(value);
        setResults(data);
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  const openDetail = async (guid) => {
    setDetailLoading(true);
    setActiveTab('Overview');
    try {
      const data = await api.getCharacter(guid);
      setSelected(data);
      // Trigger WoWHead tooltip init after render
      setTimeout(() => window.$WowheadPower?.refreshLinks(), 100);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  // Re-init tooltips on tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setTimeout(() => window.$WowheadPower?.refreshLinks(), 100);
  };

  const [races, setRaces]     = useState(FALLBACK_RACES);
  const [classes, setClasses] = useState(FALLBACK_CLASSES);
  useEffect(() => {
    api.getDBCRaces().then(({ races: r }) => {
      if (r && Object.keys(r).length > 0) setRaces(r);
    }).catch(() => {});
    api.getDBCClasses().then(({ classes: c }) => {
      if (c && Object.keys(c).length > 0) setClasses(c);
    }).catch(() => {});
  }, []);

  return (
    <div className="page-wrap">
      {showLoad && <PDumpLoadModal onClose={() => setShowLoad(false)} />}

      <div className="page-header">
        <h1 className="page-title">Characters</h1>
        <button className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => setShowLoad(true)}>
          Import Dump
        </button>
      </div>

      <div className="channels-layout">
        {/* Search panel */}
        <div className="guilds-list-panel">
          <div className="channels-search-bar">
            <input
              className="input"
              placeholder="Search by name…"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
            />
          </div>

          {query.length < 2 ? (
            <div className="empty-state">Type at least 2 characters to search.</div>
          ) : searching ? (
            <div className="empty-state">Searching…</div>
          ) : results.length === 0 ? (
            <div className="empty-state">No characters found.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Race</th>
                    <th>Class</th>
                    <th style={{ textAlign: 'center' }}>Level</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((c) => (
                    <tr
                      key={c.guid}
                      className={`clickable-row ${selected?.guid === c.guid ? 'row-selected' : ''}`}
                      onClick={() => openDetail(c.guid)}
                    >
                      <td className="td-name">
                        {c.online ? <span style={{ color: 'var(--green)', marginRight: 4 }}>●</span> : null}
                        {c.name}
                      </td>
                      <td className="td-muted">{races[c.race] ?? c.race}</td>
                      <td className="td-muted">{classes[c.class] ?? c.class}</td>
                      <td style={{ textAlign: 'center' }}>{c.level}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="channels-detail-panel">
          {detailLoading && <div className="empty-state">Loading…</div>}

          {!detailLoading && !selected && (
            <div className="empty-state">Search and select a character to view details.</div>
          )}

          {!detailLoading && selected && (
            <>
              {showDump && (
                <PDumpModal
                  guid={selected.guid}
                  name={selected.name}
                  onClose={() => setShowDump(false)}
                />
              )}

              <div className="channels-detail-header">
                <div>
                  <div className="channels-detail-title">
                    {!!selected.online && <span style={{ color: 'var(--green)', marginRight: 8, fontSize: 12 }}>● Online</span>}
                    {selected.name}
                  </div>
                  <div className="channels-detail-meta">
                    <span className="td-muted">
                      {races[selected.race] ?? selected.race}
                    </span>
                    <span className="td-muted">·</span>
                    <span className="td-muted">
                      {classes[selected.class] ?? selected.class}
                    </span>
                    <span className="td-muted">·</span>
                    <span className="td-muted">Level {selected.level}</span>
                  </div>
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: 12, padding: '4px 10px' }}
                  onClick={() => setShowDump(true)}
                  title="Export character dump (.pdump write)"
                >
                  Export Dump
                </button>
              </div>

              <div className="guild-tabs">
                {TABS.map((t) => (
                  <button
                    key={t}
                    className={`guild-tab${activeTab === t ? ' guild-tab-active' : ''}`}
                    onClick={() => handleTabChange(t)}
                  >
                    {t}
                    {t === 'Achievements' && selected.achievements?.count > 0 && (
                      <span className="guild-tab-count">{selected.achievements.count}</span>
                    )}
                    {t === 'Auras' && selected.auras?.length > 0 && (
                      <span className="guild-tab-count">{selected.auras.length}</span>
                    )}
                  </button>
                ))}
              </div>

              {activeTab === 'Overview'   && <OverviewTab   char={selected} />}
              {activeTab === 'Stats'      && <StatsTab      stats={selected.stats} charClass={selected.class} />}
              {activeTab === 'Equipment'  && <EquipmentTab  equipment={selected.equipment} />}
              {activeTab === 'Bags'       && <ItemListTab   bags={selected.bags} label="bag" />}
              {activeTab === 'Bank'       && <BankTab       bank={selected.bank} />}
              {activeTab === 'Auras'        && <AurasTab        auras={selected.auras} />}
              {activeTab === 'Reputation'   && <ReputationTab   reputation={selected.reputation} />}
              {activeTab === 'Achievements' && <AchievementsTab achievements={selected.achievements} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
