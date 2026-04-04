import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';

// ── Helpers ─────────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_HEADERS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function pad2(n) { return String(n).padStart(2, '0'); }

function toLocalISO(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function toDateKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function fmtTime(d) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function fmtDateTime(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${fmtTime(d)}`;
}

// Build the 6-week grid for a month view
function getMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  // Monday=0 … Sunday=6
  let startDay = first.getDay() - 1;
  if (startDay < 0) startDay = 6;

  const cells = [];
  const start = new Date(year, month, 1 - startDay);
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    cells.push(d);
  }
  return cells;
}

const MAX_OCCURRENCE_ITERATIONS = 200;
const DEFAULT_EVENT_DURATION_SECONDS = 3600;

// Compute game event occurrences in a window
function expandGameEvent(ev, from, to) {
  const occurrences = [];
  const startTime = new Date(ev.start_time);
  const endTime   = new Date(ev.end_time);
  const occurMs   = (ev.occurence || 0) * 60 * 1000;
  const lengthMs  = (ev.length || 0) * 60 * 1000;

  if (!occurMs || !lengthMs) return occurrences;
  // Zero end_time means event is always active
  const isUnbounded = isNaN(endTime.getTime()) || endTime.getTime() <= 0;

  // Jump ahead: calculate how many full occurrences fit before the window starts,
  // then begin iteration from just before the window.
  const msFromStart = from.getTime() - startTime.getTime();
  let eventStart;
  if (msFromStart > 0) {
    // Subtract 1 to avoid skipping an occurrence that may partially overlap the window start
    const skipCount = Math.max(0, Math.floor(msFromStart / occurMs) - 1);
    eventStart = new Date(startTime.getTime() + skipCount * occurMs);
  } else {
    eventStart = new Date(startTime);
  }

  const limit = isUnbounded ? new Date(to.getTime() + 365 * 24 * 60 * 60 * 1000) : endTime;
  let iterationCount = 0;

  while (eventStart <= limit && iterationCount < MAX_OCCURRENCE_ITERATIONS) {
    iterationCount++;
    const eventEnd = new Date(eventStart.getTime() + lengthMs);
    // Check if this occurrence overlaps with our window
    if (eventEnd >= from && eventStart <= to) {
      occurrences.push({
        id: `game-${ev.eventEntry}-${iterationCount}`,
        title: ev.description || `Game Event #${ev.eventEntry}`,
        start: new Date(Math.max(eventStart.getTime(), from.getTime())),
        end:   new Date(Math.min(eventEnd.getTime(), to.getTime())),
        source: 'game',
        holiday: ev.holiday,
        eventEntry: ev.eventEntry,
      });
    }
    if (eventStart > to) break;
    eventStart = new Date(eventStart.getTime() + occurMs);
  }
  return occurrences;
}

// ── Event type colors ───────────────────────────────────────────────────────
const TYPE_COLORS = {
  custom: { bg: 'var(--blue)',  text: '#fff'  },
  note:   { bg: 'var(--gold)',  text: '#000'  },
  game:   { bg: 'var(--green)', text: '#000'  },
  ingame: { bg: '#9b59b6',      text: '#fff'  },
  raid:   { bg: 'var(--red)',   text: '#fff'  },
};

// ── Event Modal (Create/Edit) ───────────────────────────────────────────────
function EventModal({ event, defaultStart, onSave, onClose }) {
  const isNew = !event;
  const [title, setTitle]   = useState(event?.title || '');
  const [desc, setDesc]     = useState(event?.description || '');
  const [type, setType]     = useState(event?.type || 'custom');
  const [start, setStart]   = useState(() => {
    if (event?.start) return toLocalISO(new Date(event.start));
    if (defaultStart) return toLocalISO(defaultStart);
    return toLocalISO(new Date());
  });
  const [end, setEnd]       = useState(() => {
    if (event?.end) return toLocalISO(new Date(event.end));
    if (defaultStart) {
      const e = new Date(defaultStart);
      e.setHours(e.getHours() + 1);
      return toLocalISO(e);
    }
    const e = new Date();
    e.setHours(e.getHours() + 1);
    return toLocalISO(e);
  });
  const [saving, setSaving] = useState(false);

  const valid = title.trim() && start && end && new Date(end) > new Date(start);

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await onSave({ title: title.trim(), description: desc.trim(), start, end, type });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <h3>{isNew ? 'Create Event' : 'Edit Event'}</h3>

        <div className="form-group">
          <label>Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title…" autoFocus />
        </div>

        <div className="form-group">
          <label>Description (optional)</label>
          <textarea className="ticket-textarea" rows={3} value={desc}
            onChange={(e) => setDesc(e.target.value)} placeholder="Event details…" />
        </div>

        <div className="form-group">
          <label>Type</label>
          <div className="ban-type-tabs">
            <button type="button" className={`ban-type-tab ${type === 'custom' ? 'active' : ''}`}
              onClick={() => setType('custom')}>Event</button>
            <button type="button" className={`ban-type-tab ${type === 'note' ? 'active' : ''}`}
              onClick={() => setType('note')}>Note</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Start</label>
            <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>End</label>
            <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={handleSave} disabled={!valid || saving}>
            {saving ? 'Saving…' : isNew ? 'Create' : 'Save'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirmation ─────────────────────────────────────────────────────
function DeleteModal({ event, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  const handleConfirm = async () => {
    setBusy(true);
    try { await onConfirm(); } finally { setBusy(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Delete Event</h3>
        <p style={{ color: 'var(--text-dim)', marginBottom: 16 }}>
          Delete <strong style={{ color: 'var(--text)' }}>{event.title}</strong>? This cannot be undone.
        </p>
        <div className="modal-actions">
          <button className="btn btn-danger" onClick={handleConfirm} disabled={busy}>
            {busy ? 'Deleting…' : 'Delete'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Day Detail Panel ────────────────────────────────────────────────────────
function DayDetail({ date, events, canModerate, onEdit, onDelete, onClose }) {
  return (
    <div className="cal-day-detail">
      <div className="cal-day-detail-header">
        <h3>{MONTH_NAMES[date.getMonth()]} {date.getDate()}, {date.getFullYear()}</h3>
        <button className="btn btn-ghost btn-xs" onClick={onClose}>✕</button>
      </div>
      {events.length === 0 ? (
        <p className="td-muted" style={{ padding: '12px 0' }}>No events on this day</p>
      ) : (
        <div className="cal-day-events-list">
          {events.map((ev) => {
            const color = TYPE_COLORS[ev.source || ev.type] || TYPE_COLORS.custom;
            return (
              <div key={ev.id} className="cal-day-event-item">
                <div className="cal-event-dot" style={{ background: color.bg }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cal-event-title">{ev.title}</div>
                  <div className="cal-event-time">
                    {fmtTime(new Date(ev.start))} – {fmtTime(new Date(ev.end))}
                  </div>
                  {ev.description && (
                    <div className="cal-event-desc">{ev.description}</div>
                  )}
                  <div className="cal-event-meta">
                    <span className="badge" style={{ background: color.bg, color: color.text, fontSize: 10 }}>
                      {ev.source === 'game' ? 'Game Holiday' : ev.source === 'ingame' ? 'In-Game' : ev.source === 'raid' ? 'Raid Reset' : ev.type === 'note' ? 'Note' : 'Custom'}
                    </span>
                    {ev.created_by && <span className="td-muted" style={{ fontSize: 11 }}>by {ev.created_by}</span>}
                    {ev.creator_name && <span className="td-muted" style={{ fontSize: 11 }}>by {ev.creator_name}</span>}
                  </div>
                </div>
                {canModerate && ev.source !== 'game' && ev.source !== 'raid' && ev.source !== 'ingame' && (
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button className="btn btn-secondary btn-xs" onClick={() => onEdit(ev)}>Edit</button>
                    <button className="btn btn-danger btn-xs" onClick={() => onDelete(ev)}>Delete</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Legend ───────────────────────────────────────────────────────────────────
function CalendarLegend({ filters, onToggle }) {
  const items = [
    { key: 'custom', label: 'Custom Events', color: TYPE_COLORS.custom.bg },
    { key: 'note',   label: 'Notes',         color: TYPE_COLORS.note.bg },
    { key: 'game',   label: 'Game Holidays', color: TYPE_COLORS.game.bg },
    { key: 'ingame', label: 'In-Game Calendar', color: TYPE_COLORS.ingame.bg },
    { key: 'raid',   label: 'Raid Resets',   color: TYPE_COLORS.raid.bg },
  ];
  return (
    <div className="cal-legend">
      {items.map(({ key, label, color }) => (
        <button key={key}
          className={`cal-legend-item ${filters[key] ? '' : 'cal-legend-off'}`}
          onClick={() => onToggle(key)}>
          <span className="cal-legend-dot" style={{ background: color }} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function CalendarPage({ auth }) {
  const today = new Date();
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [customEvents, setCustomEvents] = useState([]);
  const [gameEvents, setGameEvents]     = useState([]);
  const [ingameEvents, setIngameEvents] = useState([]);
  const [raidData, setRaidData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [editEvent, setEditEvent]     = useState(undefined); // undefined=closed, null=new, obj=edit
  const [deleteEvent, setDeleteEvent] = useState(null);
  const [defaultStart, setDefaultStart] = useState(null);
  const [filters, setFilters] = useState({ custom: true, note: true, game: true, ingame: true, raid: true });

  const canModerate = auth.gmlevel >= 2;

  // Compute date window for the current view
  const { from, to } = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    let startDay = first.getDay() - 1;
    if (startDay < 0) startDay = 6;
    const f = new Date(viewYear, viewMonth, 1 - startDay);
    f.setHours(0, 0, 0, 0);
    const t = new Date(f);
    t.setDate(t.getDate() + 42);
    t.setHours(23, 59, 59, 999);
    return { from: f, to: t };
  }, [viewYear, viewMonth]);

  // Load all data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const fromISO = from.toISOString();
      const toISO   = to.toISOString();

      const [customRes, gameRes, ingameRes, raidRes] = await Promise.allSettled([
        api.getCalendarEvents(fromISO, toISO),
        api.getGameEvents(),
        api.getIngameCalendarEvents(fromISO, toISO),
        api.getRaidResets(),
      ]);

      if (customRes.status === 'fulfilled') setCustomEvents(customRes.value.events || []);
      if (gameRes.status === 'fulfilled')   setGameEvents(gameRes.value.events || []);
      if (ingameRes.status === 'fulfilled') setIngameEvents(ingameRes.value.events || []);
      if (raidRes.status === 'fulfilled')   setRaidData(raidRes.value);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { loadData(); }, [loadData]);

  // Build unified event list
  const allEvents = useMemo(() => {
    const events = [];

    // Custom dashboard events
    if (filters.custom) {
      customEvents.filter((e) => e.type === 'custom').forEach((e) => {
        events.push({ ...e, start: new Date(e.start), end: new Date(e.end), source: 'custom' });
      });
    }
    if (filters.note) {
      customEvents.filter((e) => e.type === 'note').forEach((e) => {
        events.push({ ...e, start: new Date(e.start), end: new Date(e.end), source: 'note' });
      });
    }

    // Game events
    if (filters.game) {
      gameEvents.forEach((ev) => {
        expandGameEvent(ev, from, to).forEach((occ) => events.push(occ));
      });
    }

    // In-game calendar events
    if (filters.ingame) {
      ingameEvents.forEach((ev) => {
        events.push({
          id: `ingame-${ev.id}`,
          title: ev.title || 'Untitled Event',
          description: ev.description,
          start: new Date(ev.eventtime * 1000),
          end: new Date((ev.eventtime + DEFAULT_EVENT_DURATION_SECONDS) * 1000),
          source: 'ingame',
          creator_name: ev.creator_name,
        });
      });
    }

    // Raid resets
    if (filters.raid && raidData) {
      raidData.resets.forEach((resetISO, i) => {
        const resetDate = new Date(resetISO);
        raidData.raids.forEach((raid) => {
          events.push({
            id: `raid-${raid.mapId}-${i}`,
            title: `${raid.name} Reset`,
            description: `Weekly raid lockout reset`,
            start: resetDate,
            end: new Date(resetDate.getTime() + 60 * 60 * 1000),
            source: 'raid',
            mapId: raid.mapId,
          });
        });
      });
    }

    return events;
  }, [customEvents, gameEvents, ingameEvents, raidData, filters, from, to]);

  // Group events by day key
  const eventsByDay = useMemo(() => {
    const map = {};
    allEvents.forEach((ev) => {
      // An event can span multiple days
      const start = new Date(ev.start);
      const end   = new Date(ev.end);
      const d = new Date(start);
      d.setHours(0, 0, 0, 0);
      while (d <= end) {
        const key = toDateKey(d);
        if (!map[key]) map[key] = [];
        map[key].push(ev);
        d.setDate(d.getDate() + 1);
      }
    });
    return map;
  }, [allEvents]);

  // Navigation
  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
    setSelectedDate(null);
  };
  const goToday = () => {
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    setSelectedDate(null);
  };

  const toggleFilter = (key) => setFilters((f) => ({ ...f, [key]: !f[key] }));

  // CRUD handlers
  const handleCreate = async (data) => {
    try {
      await api.createCalendarEvent(data);
      toast('Event created');
      setEditEvent(undefined);
      await loadData();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleUpdate = async (id, data) => {
    try {
      await api.updateCalendarEvent(id, data);
      toast('Event updated');
      setEditEvent(undefined);
      await loadData();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteCalendarEvent(id);
      toast('Event deleted');
      setDeleteEvent(null);
      await loadData();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleDayClick = (date) => {
    setSelectedDate((prev) => prev && sameDay(prev, date) ? null : date);
  };

  const handleDayDoubleClick = (date) => {
    if (!canModerate) return;
    const d = new Date(date);
    d.setHours(12, 0, 0, 0);
    setDefaultStart(d);
    setEditEvent(null);
  };

  const grid = getMonthGrid(viewYear, viewMonth);
  const todayKey = toDateKey(today);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Calendar</h2>
          <p className="page-sub">Events, raid resets, and game events</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canModerate && (
            <button className="btn btn-primary" onClick={() => { setDefaultStart(null); setEditEvent(null); }}>
              New Event
            </button>
          )}
          <button className="btn btn-secondary" onClick={loadData} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <CalendarLegend filters={filters} onToggle={toggleFilter} />

      {/* Month navigation */}
      <div className="cal-nav">
        <button className="btn btn-ghost btn-xs" onClick={prevMonth}>◀</button>
        <h3 className="cal-nav-title">{MONTH_NAMES[viewMonth]} {viewYear}</h3>
        <button className="btn btn-ghost btn-xs" onClick={nextMonth}>▶</button>
        <button className="btn btn-ghost btn-xs" onClick={goToday} style={{ marginLeft: 8 }}>Today</button>
      </div>

      {loading ? (
        <div className="loading-text">Loading calendar…</div>
      ) : (
        <div className="cal-layout">
          {/* Calendar grid */}
          <div className="cal-grid-wrap">
            <div className="cal-grid">
              {/* Day headers */}
              {DAY_HEADERS.map((d) => (
                <div key={d} className="cal-header">{d}</div>
              ))}

              {/* Day cells */}
              {grid.map((date, i) => {
                const key = toDateKey(date);
                const isCurrentMonth = date.getMonth() === viewMonth;
                const isToday = key === todayKey;
                const isSelected = selectedDate && sameDay(selectedDate, date);
                const dayEvents = eventsByDay[key] || [];
                const maxShow = 3;
                const shown = dayEvents.slice(0, maxShow);
                const overflow = dayEvents.length - maxShow;

                return (
                  <div
                    key={i}
                    className={`cal-cell${!isCurrentMonth ? ' cal-cell-other' : ''}${isToday ? ' cal-cell-today' : ''}${isSelected ? ' cal-cell-selected' : ''}`}
                    onClick={() => handleDayClick(date)}
                    onDoubleClick={() => handleDayDoubleClick(date)}
                  >
                    <div className="cal-cell-day">{date.getDate()}</div>
                    <div className="cal-cell-events">
                      {shown.map((ev) => {
                        const color = TYPE_COLORS[ev.source || ev.type] || TYPE_COLORS.custom;
                        return (
                          <div key={ev.id} className="cal-cell-event"
                            style={{ background: color.bg, color: color.text }}
                            title={`${ev.title} (${fmtTime(new Date(ev.start))})`}>
                            {ev.title}
                          </div>
                        );
                      })}
                      {overflow > 0 && (
                        <div className="cal-cell-more">+{overflow} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day detail panel */}
          {selectedDate && (
            <DayDetail
              date={selectedDate}
              events={eventsByDay[toDateKey(selectedDate)] || []}
              canModerate={canModerate}
              onEdit={(ev) => setEditEvent(ev)}
              onDelete={(ev) => setDeleteEvent(ev)}
              onClose={() => setSelectedDate(null)}
            />
          )}
        </div>
      )}

      {/* Create modal */}
      {editEvent === null && (
        <EventModal
          event={null}
          defaultStart={defaultStart}
          onSave={handleCreate}
          onClose={() => setEditEvent(undefined)}
        />
      )}

      {/* Edit modal */}
      {editEvent && typeof editEvent === 'object' && (
        <EventModal
          event={editEvent}
          defaultStart={null}
          onSave={(data) => handleUpdate(editEvent.id, data)}
          onClose={() => setEditEvent(undefined)}
        />
      )}

      {/* Delete modal */}
      {deleteEvent && (
        <DeleteModal
          event={deleteEvent}
          onConfirm={() => handleDelete(deleteEvent.id)}
          onClose={() => setDeleteEvent(null)}
        />
      )}
    </div>
  );
}
