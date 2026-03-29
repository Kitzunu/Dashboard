import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../App.jsx';
import { api } from '../api.js';
import { toast } from '../toast.js';

// ── Money helpers ─────────────────────────────────────────────────────────────
function copperToGSC(copper) {
  const c = Math.max(0, parseInt(copper) || 0);
  return { g: Math.floor(c / 10000), s: Math.floor((c % 10000) / 100), c: c % 100 };
}
function gscToCopper(g, s, c) {
  return (parseInt(g) || 0) * 10000 + (parseInt(s) || 0) * 100 + (parseInt(c) || 0);
}
function formatMoney(copper) {
  if (!copper) return <span className="td-muted">—</span>;
  const { g, s, c } = copperToGSC(copper);
  return (
    <span className="money-display">
      {g > 0 && <><span className="money-gold">{g}g</span>{' '}</>}
      {s > 0 && <><span className="money-silver">{s}s</span>{' '}</>}
      {(c > 0 || (!g && !s)) && <span className="money-copper">{c}c</span>}
    </span>
  );
}

// ── Money input row component ─────────────────────────────────────────────────
function MoneyInput({ label, value, onChange }) {
  const { g, s, c } = copperToGSC(value);
  const update = (field, v) => {
    const parsed = { g, s, c, [field]: parseInt(v) || 0 };
    onChange(gscToCopper(parsed.g, parsed.s, parsed.c));
  };
  return (
    <div className="ms-money-row">
      <span className="ms-money-label">{label}</span>
      <div className="money-input-row">
        <div className="money-field">
          <input type="number" min="0" value={g} onChange={(e) => update('g', e.target.value)} />
          <span className="money-label money-gold">Gold</span>
        </div>
        <div className="money-field">
          <input type="number" min="0" max="99" value={s} onChange={(e) => update('s', e.target.value)} />
          <span className="money-label money-silver">Silver</span>
        </div>
        <div className="money-field">
          <input type="number" min="0" max="99" value={c} onChange={(e) => update('c', e.target.value)} />
          <span className="money-label money-copper">Copper</span>
        </div>
      </div>
    </div>
  );
}

// ── Condition type hints ──────────────────────────────────────────────────────
const CONDITION_TYPES = ['Level','PlayTime','Quest','Achievement','Reputation','Faction','Race','Class','AccountFlags'];
const CONDITION_HINTS = {
  Level:        { valueLabel: 'Required level',            stateLabel: 'Operator (0 = ≥, 1 = ≤)' },
  PlayTime:     { valueLabel: 'Minutes played',            stateLabel: 'State' },
  Quest:        { valueLabel: 'Quest ID',                  stateLabel: '0 = completed, 1 = rewarded' },
  Achievement:  { valueLabel: 'Achievement ID',            stateLabel: 'State' },
  Reputation:   { valueLabel: 'Faction ID',                stateLabel: 'Min standing (0–7)' },
  Faction:      { valueLabel: '0 = Alliance, 1 = Horde',   stateLabel: 'State' },
  Race:         { valueLabel: 'Race ID or bitmask',        stateLabel: 'State' },
  Class:        { valueLabel: 'Class ID or bitmask',       stateLabel: 'State' },
  AccountFlags: { valueLabel: 'Flag bitmask',              stateLabel: 'State' },
};

// ── Tab bar ───────────────────────────────────────────────────────────────────
function TabBar({ tabs, active, onChange }) {
  return (
    <div className="ms-tab-bar">
      {tabs.map((t) => (
        <button
          key={t.id}
          className={`ms-tab${active === t.id ? ' active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── General tab ───────────────────────────────────────────────────────────────
function GeneralTab({ form, onChange, canEdit }) {
  return (
    <div className="ms-tab-content">
      <div className="form-row">
        <label className="form-label">Subject</label>
        <input
          className="input"
          value={form.subject}
          onChange={(e) => onChange({ ...form, subject: e.target.value })}
          disabled={!canEdit}
          placeholder="Mail subject"
        />
      </div>
      <div className="form-row">
        <label className="form-label">Body</label>
        <textarea
          className="input ms-body-textarea"
          value={form.body}
          onChange={(e) => onChange({ ...form, body: e.target.value })}
          disabled={!canEdit}
          placeholder="Mail body text"
          rows={6}
        />
      </div>
      <MoneyInput
        label="Alliance Money"
        value={form.moneyA}
        onChange={(v) => onChange({ ...form, moneyA: v })}
        disabled={!canEdit}
      />
      <MoneyInput
        label="Horde Money"
        value={form.moneyH}
        onChange={(v) => onChange({ ...form, moneyH: v })}
        disabled={!canEdit}
      />
      <div className="form-row">
        <label className="form-label">Active</label>
        <label className="ms-toggle">
          <input
            type="checkbox"
            checked={!!form.active}
            onChange={(e) => onChange({ ...form, active: e.target.checked })}
            disabled={!canEdit}
          />
          <span className={`ms-toggle-label ${form.active ? 'text-green' : 'td-muted'}`}>
            {form.active ? 'Enabled — will be sent to eligible characters' : 'Disabled — inactive'}
          </span>
        </label>
      </div>
    </div>
  );
}

// ── Items tab ─────────────────────────────────────────────────────────────────
function ItemsTab({ templateId, items, onItemAdded, onItemDeleted, canEdit }) {
  const [faction,   setFaction]   = useState('Alliance');
  const [itemId,    setItemId]    = useState('');
  const [itemCount, setItemCount] = useState(1);
  const [adding,    setAdding]    = useState(false);

  const handleAdd = async () => {
    if (!itemId || parseInt(itemId) <= 0) { toast('Enter a valid item ID', 'error'); return; }
    setAdding(true);
    try {
      const res = await api.addMailServerItem(templateId, { faction, item: parseInt(itemId), itemCount: parseInt(itemCount) || 1 });
      onItemAdded({ id: res.id, templateID: templateId, faction, item: parseInt(itemId), itemCount: parseInt(itemCount) || 1 });
      setItemId('');
      setItemCount(1);
      toast('Item added');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (itemEntry) => {
    try {
      await api.deleteMailServerItem(templateId, itemEntry.id);
      onItemDeleted(itemEntry.id);
      toast('Item removed');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <div className="ms-tab-content">
      {items.length === 0 ? (
        <p className="td-muted" style={{ marginBottom: 16 }}>No items attached to this template.</p>
      ) : (
        <table className="data-table" style={{ marginBottom: 20 }}>
          <thead>
            <tr>
              <th>Faction</th>
              <th>Item ID</th>
              <th>Count</th>
              {canEdit && <th style={{ width: 80 }}></th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="data-row">
                <td>
                  <span className={`badge ${item.faction === 'Alliance' ? 'badge-info' : 'badge-danger'}`}>
                    {item.faction}
                  </span>
                </td>
                <td className="mono">{item.item}</td>
                <td>{item.itemCount}</td>
                {canEdit && (
                  <td>
                    <button className="btn btn-ghost btn-xs" onClick={() => handleDelete(item)}>
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {canEdit && (
        <div className="ms-add-row">
          <span className="ms-add-label">Add Item</span>
          <select className="input input-sm" value={faction} onChange={(e) => setFaction(e.target.value)}>
            <option value="Alliance">Alliance</option>
            <option value="Horde">Horde</option>
          </select>
          <input
            className="input input-sm"
            type="number"
            min="1"
            placeholder="Item ID"
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            style={{ width: 110 }}
          />
          <input
            className="input input-sm"
            type="number"
            min="1"
            placeholder="Count"
            value={itemCount}
            onChange={(e) => setItemCount(e.target.value)}
            style={{ width: 80 }}
          />
          <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={adding}>
            {adding ? '…' : '+ Add'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Conditions tab ────────────────────────────────────────────────────────────
function ConditionsTab({ templateId, conditions, onConditionAdded, onConditionDeleted, canEdit }) {
  const [condType,  setCondType]  = useState('Level');
  const [condValue, setCondValue] = useState(0);
  const [condState, setCondState] = useState(0);
  const [adding,    setAdding]    = useState(false);

  const hint = CONDITION_HINTS[condType] || { valueLabel: 'Value', stateLabel: 'State' };

  const handleAdd = async () => {
    setAdding(true);
    try {
      const res = await api.addMailServerCondition(templateId, {
        conditionType: condType,
        conditionValue: parseInt(condValue) || 0,
        conditionState: parseInt(condState) || 0,
      });
      onConditionAdded({ id: res.id, templateID: templateId, conditionType: condType, conditionValue: parseInt(condValue) || 0, conditionState: parseInt(condState) || 0 });
      setCondValue(0);
      setCondState(0);
      toast('Condition added');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (cond) => {
    try {
      await api.deleteMailServerCondition(templateId, cond.id);
      onConditionDeleted(cond.id);
      toast('Condition removed');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <div className="ms-tab-content">
      {conditions.length === 0 ? (
        <p className="td-muted" style={{ marginBottom: 16 }}>
          No conditions — mail will be sent to all characters.
        </p>
      ) : (
        <table className="data-table" style={{ marginBottom: 20 }}>
          <thead>
            <tr>
              <th>Type</th>
              <th>Value</th>
              <th>State</th>
              {canEdit && <th style={{ width: 80 }}></th>}
            </tr>
          </thead>
          <tbody>
            {conditions.map((cond) => {
              const h = CONDITION_HINTS[cond.conditionType] || {};
              return (
                <tr key={cond.id} className="data-row">
                  <td><span className="badge badge-dim">{cond.conditionType}</span></td>
                  <td title={h.valueLabel}>{cond.conditionValue}</td>
                  <td title={h.stateLabel}>{cond.conditionState}</td>
                  {canEdit && (
                    <td>
                      <button className="btn btn-ghost btn-xs" onClick={() => handleDelete(cond)}>
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {canEdit && (
        <div className="ms-condition-add">
          <div className="ms-add-row">
            <span className="ms-add-label">Add Condition</span>
            <select className="input input-sm" value={condType} onChange={(e) => setCondType(e.target.value)}>
              {CONDITION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="ms-condition-fields">
            <div className="form-row form-row-sm">
              <label className="form-label">{hint.valueLabel}</label>
              <input
                className="input input-sm"
                type="number"
                min="0"
                value={condValue}
                onChange={(e) => setCondValue(e.target.value)}
                style={{ width: 120 }}
              />
            </div>
            <div className="form-row form-row-sm">
              <label className="form-label">{hint.stateLabel}</label>
              <input
                className="input input-sm"
                type="number"
                min="0"
                value={condState}
                onChange={(e) => setCondState(e.target.value)}
                style={{ width: 120 }}
              />
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={adding}>
              {adding ? '…' : '+ Add'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Recipients tab ────────────────────────────────────────────────────────────
function RecipientsTab({ templateId }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMailServerRecipients(templateId)
      .then(setData)
      .catch((err) => toast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [templateId]);

  if (loading) return <div className="ms-tab-content"><div className="loading-text">Loading…</div></div>;

  const { recipients = [], total = 0 } = data || {};

  return (
    <div className="ms-tab-content">
      <p className="td-muted" style={{ marginBottom: 12, fontSize: 13 }}>
        {total === 0
          ? 'No characters have received this mail yet.'
          : `${total} character${total !== 1 ? 's' : ''} have received this mail.`}
      </p>
      {recipients.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Character</th>
              <th>Level</th>
              <th>GUID</th>
            </tr>
          </thead>
          <tbody>
            {recipients.map((r) => (
              <tr key={r.guid} className="data-row">
                <td>{r.charName || <span className="td-muted">Unknown</span>}</td>
                <td className="td-muted">{r.level ?? '—'}</td>
                <td className="td-muted mono">{r.guid}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Template modal (create or edit) ──────────────────────────────────────────
function TemplateModal({ templateId, onClose, onSaved, canEdit }) {
  const isNew = templateId == null;

  const [tab,     setTab]     = useState('general');
  const [form,    setForm]    = useState({ subject: '', body: '', moneyA: 0, moneyH: 0, active: true });
  const [items,   setItems]   = useState([]);
  const [conditions, setConds]= useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    if (isNew) return;
    api.getMailServerTemplate(templateId)
      .then((data) => {
        setForm({ subject: data.subject, body: data.body, moneyA: data.moneyA, moneyH: data.moneyH, active: data.active });
        setItems(data.items || []);
        setConds(data.conditions || []);
      })
      .catch((err) => toast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [templateId, isNew]);

  const handleSave = async () => {
    if (!form.subject.trim()) { toast('Subject is required', 'error'); return; }
    if (!form.body.trim())    { toast('Body is required',    'error'); return; }
    setSaving(true);
    try {
      if (isNew) {
        const res = await api.createMailServerTemplate(form);
        toast('Template created');
        onSaved({ id: res.id, ...form, itemCount: 0, conditionCount: 0, recipientCount: 0 });
      } else {
        await api.updateMailServerTemplate(templateId, form);
        toast('Template saved');
        onSaved({ id: templateId, ...form });
      }
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'general',    label: 'General' },
    ...(!isNew ? [
      { id: 'items',      label: `Items (${items.length})` },
      { id: 'conditions', label: `Conditions (${conditions.length})` },
      { id: 'recipients', label: 'Recipients' },
    ] : []),
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal ms-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{isNew ? 'New Mail Template' : `Edit Template #${templateId}`}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <TabBar tabs={tabs} active={tab} onChange={setTab} />

        {loading ? (
          <div className="loading-text" style={{ padding: 24 }}>Loading…</div>
        ) : (
          <>
            {tab === 'general'    && <GeneralTab    form={form} onChange={setForm} canEdit={canEdit} />}
            {tab === 'items'      && <ItemsTab      templateId={templateId} items={items} onItemAdded={(i) => setItems((p) => [...p, i])} onItemDeleted={(id) => setItems((p) => p.filter((x) => x.id !== id))} canEdit={canEdit} />}
            {tab === 'conditions' && <ConditionsTab templateId={templateId} conditions={conditions} onConditionAdded={(c) => setConds((p) => [...p, c])} onConditionDeleted={(id) => setConds((p) => p.filter((x) => x.id !== id))} canEdit={canEdit} />}
            {tab === 'recipients' && <RecipientsTab templateId={templateId} />}
          </>
        )}

        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            {canEdit ? 'Cancel' : 'Close'}
          </button>
          {canEdit && (tab === 'general') && (
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : isNew ? 'Create Template' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Delete confirmation modal ─────────────────────────────────────────────────
function DeleteModal({ template, onConfirm, onClose, busy }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Delete Template</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <p style={{ marginBottom: 8 }}>
            Delete template <strong>#{template.id}</strong>: <em>{template.subject}</em>?
          </p>
          <p style={{ fontSize: 13, color: 'var(--warn)' }}>
            All attached items, conditions, and recipient records will also be deleted.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm} disabled={busy}>
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MailServerPage() {
  const { auth } = useAuth();
  const canEdit = auth.gmlevel >= 3;

  const [templates, setTemplates] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [editId,    setEditId]    = useState(undefined); // undefined=closed, null=new, number=edit
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,  setDeleting]  = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getMailServerTemplates();
      setTemplates(data);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleSaved = (updated) => {
    setTemplates((prev) => {
      const idx = prev.findIndex((t) => t.id === updated.id);
      if (idx === -1) return [updated, ...prev];
      const next = [...prev];
      next[idx] = { ...next[idx], ...updated };
      return next;
    });
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteMailServerTemplate(deleteTarget.id);
      setTemplates((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      toast('Template deleted');
      setDeleteTarget(null);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Mail Server Templates</h2>
        {canEdit && (
          <button className="btn btn-primary btn-sm" onClick={() => setEditId(null)}>
            + New Template
          </button>
        )}
      </div>

      <p className="td-muted" style={{ marginBottom: 16, fontSize: 13 }}>
        Templates are automatically sent to eligible characters based on configured conditions.
        Items and money can be faction-specific (Alliance / Horde).
      </p>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 60 }}>ID</th>
              <th style={{ width: 90 }}>Status</th>
              <th>Subject</th>
              <th>Alliance Money</th>
              <th>Horde Money</th>
              <th style={{ width: 70, textAlign: 'center' }}>Items</th>
              <th style={{ width: 90, textAlign: 'center' }}>Conditions</th>
              <th style={{ width: 90, textAlign: 'center' }}>Recipients</th>
              <th style={{ width: 110 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="table-empty">Loading…</td></tr>
            ) : templates.length === 0 ? (
              <tr><td colSpan={9} className="table-empty">No mail templates yet.{canEdit && ' Click "+ New Template" to create one.'}</td></tr>
            ) : (
              templates.map((t) => (
                <tr key={t.id} className="data-row">
                  <td className="td-muted mono">{t.id}</td>
                  <td>
                    <span className={`badge ${t.active ? 'badge-success' : 'badge-dim'}`}>
                      {t.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.subject}
                  </td>
                  <td>{formatMoney(t.moneyA)}</td>
                  <td>{formatMoney(t.moneyH)}</td>
                  <td style={{ textAlign: 'center' }} className="td-muted">{t.itemCount}</td>
                  <td style={{ textAlign: 'center' }} className="td-muted">{t.conditionCount}</td>
                  <td style={{ textAlign: 'center' }} className="td-muted">{t.recipientCount}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-xs" onClick={() => setEditId(t.id)}>
                        {canEdit ? 'Edit' : 'View'}
                      </button>
                      {canEdit && (
                        <button className="btn btn-ghost btn-xs" onClick={() => setDeleteTarget(t)}>
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editId !== undefined && (
        <TemplateModal
          templateId={editId}
          onClose={() => setEditId(undefined)}
          onSaved={handleSaved}
          canEdit={canEdit}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          template={deleteTarget}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          busy={deleting}
        />
      )}
    </div>
  );
}
