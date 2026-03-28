import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';
import { parseAnsi } from '../ansi.js';

function AnsiLine({ text }) {
  const segments = parseAnsi(text);
  return (
    <span className="console-line">
      {segments.map((seg, i) => {
        if (!seg.color && !seg.bold) return seg.text;
        const style = {};
        if (seg.color) style.color = seg.color;
        if (seg.bold)  style.fontWeight = 'bold';
        return <span key={i} style={style}>{seg.text}</span>;
      })}
    </span>
  );
}

function ConsolePanel({ title, serverName, socket, canSendCommands }) {
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [command, setCommand] = useState('');
  const [cmdHistory, setCmdHistory] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(`cmd-history-${serverName}`)) || [];
    } catch {
      return [];
    }
  });
  const [histIdx, setHistIdx] = useState(-1);
  const [autoScroll, setAutoScroll] = useState(
    () => localStorage.getItem(`console-autoscroll-${serverName}`) !== 'false'
  );
  const [sending, setSending] = useState(false);
  const outputRef = useRef(null);
  const endRef = useRef(null);

  // Load buffered logs on mount
  useEffect(() => {
    api.getServerLogs(serverName)
      .then((data) => setLines(data.logs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [serverName]);

  // Subscribe to live output
  useEffect(() => {
    if (!socket) return;
    socket.emit('subscribe', serverName);

    const handler = ({ server, line }) => {
      if (server !== serverName) return;
      setLines((prev) => {
        const next = [...prev, line];
        return next.length > 2000 ? next.slice(-2000) : next;
      });
    };

    socket.on('console-line', handler);
    return () => {
      socket.off('console-line', handler);
      socket.emit('unsubscribe', serverName);
    };
  }, [socket, serverName]);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [lines, autoScroll]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cmd = command.trim();
    if (!cmd) return;
    setCmdHistory((prev) => {
      const next = [cmd, ...prev.slice(0, 49)];
      sessionStorage.setItem(`cmd-history-${serverName}`, JSON.stringify(next));
      return next;
    });
    setHistIdx(-1);
    setCommand('');
    setSending(true);
    try {
      const result = await api.sendCommand(cmd);
      if (!result.success) {
        setLines((prev) => [...prev, `[Dashboard] Error: ${result.error}\n`]);
      }
    } catch (err) {
      setLines((prev) => [...prev, `[Dashboard] Error: ${err.message}\n`]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(histIdx + 1, cmdHistory.length - 1);
      setHistIdx(next);
      if (cmdHistory[next] !== undefined) setCommand(cmdHistory[next]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = histIdx - 1;
      if (next < 0) {
        setHistIdx(-1);
        setCommand('');
      } else {
        setHistIdx(next);
        setCommand(cmdHistory[next]);
      }
    }
  };

  return (
    <div className="console-panel">
      <div className="console-header">
        <span className="console-title">{title}</span>
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => {
              setAutoScroll(e.target.checked);
              localStorage.setItem(`console-autoscroll-${serverName}`, e.target.checked);
            }}
          />
          Auto-scroll
        </label>
      </div>
      <div className="console-output" ref={outputRef}>
        {loading ? (
          <span className="console-loading">Loading logs…</span>
        ) : (
          lines.map((line, i) => <AnsiLine key={i} text={line} />)
        )}
        <div ref={endRef} />
      </div>
      {canSendCommands && (
        <form onSubmit={handleSubmit} className="console-input-row">
          <span className="prompt">&gt;</span>
          <input
            className="console-input"
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter GM command… (↑↓ for history)"
            disabled={sending}
            spellCheck={false}
            autoComplete="off"
          />
          <button type="submit" className="btn btn-primary btn-sm" disabled={sending}>
            Send
          </button>
        </form>
      )}
    </div>
  );
}

export default function ConsolePage({ socket, auth }) {
  const canSendCommands = auth.gmlevel >= 2;
  return (
    <div className="page console-page">
      <h2 className="page-title">Console</h2>
      <div className="console-grid">
        <ConsolePanel
          title="World Server"
          serverName="worldserver"
          socket={socket}
          canSendCommands={canSendCommands}
        />
        <ConsolePanel
          title="Auth Server"
          serverName="authserver"
          socket={socket}
          canSendCommands={false}
        />
      </div>
    </div>
  );
}
