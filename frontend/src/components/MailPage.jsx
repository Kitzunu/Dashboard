import React, { useState } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';

const TYPES = ['text', 'items', 'money'];
const TYPE_LABELS = { text: 'Mail', items: 'Items', money: 'Money' };

// ── Gold / Silver / Copper → total copper ────────────────────────────────────
function MoneyInput({ value, onChange }) {
  const gold   = Math.floor(value / 10000);
  const silver = Math.floor((value % 10000) / 100);
  const copper = value % 100;

  const update = (g, s, c) => {
    const g2 = Math.max(0, parseInt(g, 10) || 0);
    const s2 = Math.max(0, Math.min(99, parseInt(s, 10) || 0));
    const c2 = Math.max(0, Math.min(99, parseInt(c, 10) || 0));
    onChange(g2 * 10000 + s2 * 100 + c2);
  };

  return (
    <div className="money-input-row">
      <div className="money-field">
        <input
          type="number"
          min="0"
          value={gold}
          onChange={(e) => update(e.target.value, silver, copper)}
        />
        <span className="money-label money-gold">Gold</span>
      </div>
      <div className="money-field">
        <input
          type="number"
          min="0"
          max="99"
          value={silver}
          onChange={(e) => update(gold, e.target.value, copper)}
        />
        <span className="money-label money-silver">Silver</span>
      </div>
      <div className="money-field">
        <input
          type="number"
          min="0"
          max="99"
          value={copper}
          onChange={(e) => update(gold, silver, e.target.value)}
        />
        <span className="money-label money-copper">Copper</span>
      </div>
      <span className="money-total">{value.toLocaleString()} copper total</span>
    </div>
  );
}

// ── Item list row ─────────────────────────────────────────────────────────────
function ItemRow({ item, index, onChange, onRemove }) {
  return (
    <div className="item-row">
      <span className="item-row-num">#{index + 1}</span>
      <input
        type="number"
        min="1"
        className="item-id-input"
        placeholder="Item ID"
        value={item.id}
        onChange={(e) => onChange(index, 'id', e.target.value)}
      />
      <input
        type="number"
        min="1"
        max="255"
        className="item-count-input"
        placeholder="Count"
        value={item.count}
        onChange={(e) => onChange(index, 'count', e.target.value)}
      />
      <button
        type="button"
        className="btn btn-danger btn-xs"
        onClick={() => onRemove(index)}
      >
        ✕
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MailPage() {
  const [type, setType]       = useState('text');
  const [player, setPlayer]   = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody]       = useState('');
  const [money, setMoney]     = useState(0);
  const [items, setItems]     = useState([{ id: '', count: 1 }]);
  const [sending, setSending] = useState(false);

  const addItem = () => {
    if (items.length >= 12) return; // mailbox cap
    setItems((prev) => [...prev, { id: '', count: 1 }]);
  };

  const updateItem = (index, field, value) => {
    setItems((prev) => prev.map((it, i) => i === index ? { ...it, [field]: value } : it));
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const isValid = () => {
    if (!player.trim() || !subject.trim() || !body.trim()) return false;
    if (type === 'money' && money < 1) return false;
    if (type === 'items') {
      if (items.length === 0) return false;
      return items.every((it) => parseInt(it.id, 10) > 0 && parseInt(it.count, 10) >= 1);
    }
    return true;
  };

  const handleSend = async () => {
    if (!isValid()) return;
    setSending(true);
    try {
      if (type === 'money') {
        await api.sendMailMoney(player.trim(), subject.trim(), body.trim(), money);
      } else if (type === 'items') {
        await api.sendMailItems(
          player.trim(),
          subject.trim(),
          body.trim(),
          items.map((it) => ({ id: parseInt(it.id, 10), count: parseInt(it.count, 10) }))
        );
      } else {
        await api.sendMail(player.trim(), subject.trim(), body.trim());
      }
      toast(`Mail sent to ${player.trim()}`);
      // Reset form but keep player/subject for convenience
      setBody('');
      setMoney(0);
      setItems([{ id: '', count: 1 }]);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Send In-Game Mail</h2>
          <p className="page-sub">Send mail, items, or money directly to a player's mailbox</p>
        </div>
      </div>

      <div className="mail-compose">
        {/* Mail type tabs */}
        <div className="form-group">
          <label>Mail type</label>
          <div className="ban-type-tabs">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                className={`ban-type-tab ${type === t ? 'active' : ''}`}
                onClick={() => setType(t)}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          <small className="type-hint">
            {type === 'text'  && 'Send a plain mail message — uses the send mail command'}
            {type === 'items' && 'Attach up to 12 items by entry ID — uses send items command'}
            {type === 'money' && 'Send gold, silver, and/or copper — uses send money command'}
          </small>
        </div>

        {/* Recipient */}
        <div className="form-group">
          <label>Player name</label>
          <input
            type="text"
            value={player}
            onChange={(e) => setPlayer(e.target.value)}
            placeholder="Exact character name"
            style={{ maxWidth: 280 }}
          />
        </div>

        {/* Subject */}
        <div className="form-group">
          <label>Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Mail subject"
          />
        </div>

        {/* Body */}
        <div className="form-group">
          <label>Message</label>
          <textarea
            className="announce-textarea"
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Mail body…"
          />
        </div>

        {/* Money fields */}
        {type === 'money' && (
          <div className="form-group">
            <label>Amount</label>
            <MoneyInput value={money} onChange={setMoney} />
          </div>
        )}

        {/* Items list */}
        {type === 'items' && (
          <div className="form-group">
            <label>Items ({items.length} / 12)</label>
            <div className="item-list">
              {items.map((item, i) => (
                <ItemRow
                  key={i}
                  item={item}
                  index={i}
                  onChange={updateItem}
                  onRemove={removeItem}
                />
              ))}
            </div>
            {items.length < 12 && (
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                style={{ marginTop: 8 }}
                onClick={addItem}
              >
                + Add Item
              </button>
            )}
          </div>
        )}

        {/* Send */}
        <div className="announce-send-row">
          <button
            className="btn btn-primary"
            onClick={handleSend}
            disabled={!isValid() || sending}
          >
            {sending ? 'Sending…' : `Send ${TYPE_LABELS[type]}`}
          </button>
        </div>
      </div>
    </div>
  );
}
