import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';
import { FALLBACK_RACES, FALLBACK_CLASSES } from '../constants.js';

export default function CharacterTransferPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedChar, setSelectedChar] = useState(null);
  const [charDetail, setCharDetail] = useState(null);
  const [targetAccountId, setTargetAccountId] = useState('');
  const [targetAccountName, setTargetAccountName] = useState('');
  const [accountQuery, setAccountQuery] = useState('');
  const [accountResults, setAccountResults] = useState([]);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const acDropdownRef = useRef(null);

  // Close account dropdown on outside click
  useEffect(() => {
    if (!showAccountDropdown) return;
    const handleClick = (e) => {
      if (acDropdownRef.current && !acDropdownRef.current.contains(e.target)) {
        setShowAccountDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showAccountDropdown]);

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    try {
      const results = await api.searchCharacters(searchQuery);
      setSearchResults(results);
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const handleSelect = async (char) => {
    setSelectedChar(char);
    try {
      const detail = await api.validateTransfer(char.guid);
      setCharDetail(detail);
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const handleAccountSearch = async (q) => {
    setAccountQuery(q);
    if (q.length < 2) {
      setAccountResults([]);
      setShowAccountDropdown(false);
      return;
    }
    try {
      const results = await api.searchTransferAccounts(q);
      setAccountResults(results);
      setShowAccountDropdown(results.length > 0);
    } catch {
      setAccountResults([]);
    }
  };

  const selectAccount = (account) => {
    setTargetAccountId(String(account.id));
    setTargetAccountName(account.username);
    setAccountQuery(account.username);
    setShowAccountDropdown(false);
  };

  const handleTransfer = async () => {
    setShowConfirm(false);
    setBusy(true);
    try {
      const result = await api.transferCharacter(selectedChar.guid, parseInt(targetAccountId, 10));
      toast(`${result.character} transferred successfully to account ${result.toAccount}`);
      setSelectedChar(null);
      setCharDetail(null);
      setTargetAccountId('');
      setTargetAccountName('');
      setAccountQuery('');
      setSearchResults([]);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Character Transfer</h2>
          <p className="page-sub">Transfer characters between accounts</p>
        </div>
      </div>

      {/* Search */}
      <div className="form-group">
        <label>Search Character</label>
        <div className="char-transfer-search-row">
          <input type="text" value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Character name (min 2 chars)" />
          <button className="btn btn-secondary" onClick={handleSearch}>Search</button>
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && !selectedChar && (
        <div className="table-wrap char-transfer-results">
          <table className="data-table">
            <thead>
              <tr>
                <th>GUID</th>
                <th>Name</th>
                <th>Race</th>
                <th>Class</th>
                <th>Level</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {searchResults.map((c) => (
                <tr key={c.guid}>
                  <td className="td-muted mono">{c.guid}</td>
                  <td className="td-name">{c.name}</td>
                  <td className="td-muted">{FALLBACK_RACES[c.race] || c.race}</td>
                  <td className="td-muted">{FALLBACK_CLASSES[c.class] || c.class}</td>
                  <td className="td-muted">{c.level}</td>
                  <td>
                    <span className={`badge ${c.online ? 'badge-green' : 'badge-dim'}`}>
                      {c.online ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-primary btn-xs"
                      onClick={() => handleSelect(c)}
                      disabled={c.online}>
                      Select
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Selected Character Details */}
      {charDetail && (
        <div className="char-transfer-detail">
          <h3>Selected Character</h3>
          <div className="char-transfer-grid">
            <div className="form-group">
              <label>Character</label>
              <span className="td-name">{charDetail.character.name}</span>
            </div>
            <div className="form-group">
              <label>GUID</label>
              <span className="td-muted mono">{charDetail.character.guid}</span>
            </div>
            <div className="form-group">
              <label>Level</label>
              <span className="td-muted">{charDetail.character.level}</span>
            </div>
            <div className="form-group">
              <label>Race / Class</label>
              <span className="td-muted">
                {FALLBACK_RACES[charDetail.character.race] || charDetail.character.race} / {FALLBACK_CLASSES[charDetail.character.class] || charDetail.character.class}
              </span>
            </div>
            <div className="form-group">
              <label>Current Account</label>
              <span className="td-muted">{charDetail.account ? `${charDetail.account.username} (#${charDetail.account.id})` : '—'}</span>
            </div>
            <div className="form-group">
              <label>Status</label>
              <span className={`badge ${charDetail.character.canTransfer ? 'badge-green' : 'badge-red'}`}>
                {charDetail.character.canTransfer ? 'Ready to transfer' : 'Online — Cannot Transfer'}
              </span>
            </div>
          </div>

          {charDetail.character.canTransfer && (
            <div className="char-transfer-target">
              <div className="form-group" ref={acDropdownRef} style={{ position: 'relative' }}>
                <label>Target Account</label>
                <input type="text" value={accountQuery}
                  onChange={(e) => handleAccountSearch(e.target.value)}
                  onFocus={() => { if (accountResults.length) setShowAccountDropdown(true); }}
                  placeholder="Search by account name or enter ID" />
                {showAccountDropdown && (
                  <div className="char-transfer-ac-dropdown">
                    {accountResults.map((a) => (
                      <div key={a.id} className="char-transfer-ac-option" onClick={() => selectAccount(a)}>
                        <span className="td-name">{a.username}</span>
                        <span className="td-muted">#{a.id}</span>
                      </div>
                    ))}
                  </div>
                )}
                {targetAccountName && (
                  <span className="td-muted" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                    Selected: {targetAccountName} (#{targetAccountId})
                  </span>
                )}
              </div>
              <div className="form-group">
                <label>Or enter Account ID directly</label>
                <input type="number" value={targetAccountId}
                  onChange={(e) => { setTargetAccountId(e.target.value); setTargetAccountName(''); setAccountQuery(''); }}
                  placeholder="Account ID" style={{ width: 180 }} />
              </div>
              <div className="char-transfer-actions">
                <button className="btn btn-primary"
                  onClick={() => setShowConfirm(true)}
                  disabled={!targetAccountId || busy}>
                  Transfer Character
                </button>
                <button className="btn btn-ghost" onClick={() => { setSelectedChar(null); setCharDetail(null); setTargetAccountId(''); setTargetAccountName(''); setAccountQuery(''); }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal modal-structured" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Confirm Transfer</h3></div>
            <div className="modal-body">
              <p>Transfer <strong>{charDetail.character.name}</strong> (GUID {charDetail.character.guid})
                from account <strong>{charDetail.account?.username}</strong> to account <strong>{targetAccountName || `#${targetAccountId}`}</strong>?</p>
              <p className="td-muted" style={{ fontSize: 13, marginTop: 8 }}>This action will be audit-logged.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={handleTransfer} disabled={busy}>
                {busy ? 'Transferring…' : 'Confirm Transfer'}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
