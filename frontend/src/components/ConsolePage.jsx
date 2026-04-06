import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { api } from '../api.js';
import { parseAnsi } from '../ansi.js';
import { useAuth } from '../App.jsx';
import { useSocket, useServerStatus } from '../context/ServerContext.jsx';
import { useLocalStorage } from '../hooks/useLocalStorage.js';

// Memoized — only re-renders when `text` actually changes (i.e. new lines only)
const AnsiLine = memo(function AnsiLine({ text }) {
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
});

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
  const [autoScroll, setAutoScroll] = useLocalStorage(`console-autoscroll-${serverName}`, true);
  const [sending, setSending] = useState(false);
  const outputRef   = useRef(null);
  const pendingRef  = useRef([]);   // buffer for incoming lines between RAF flushes
  const rafRef      = useRef(null); // pending requestAnimationFrame id
  const autoScrollRef = useRef(autoScroll); // mirror for use inside RAF callback

  // Keep autoScrollRef in sync
  useEffect(() => { autoScrollRef.current = autoScroll; }, [autoScroll]);

  // Flush buffered lines in one state update per animation frame
  const flush = useCallback(() => {
    rafRef.current = null;
    const batch = pendingRef.current;
    if (!batch.length) return;
    pendingRef.current = [];
    setLines((prev) => {
      const next = prev.concat(batch);
      return next.length > 2000 ? next.slice(-2000) : next;
    });
  }, []);

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
      pendingRef.current.push(line);
      // Schedule a flush if one isn't already pending
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(flush);
      }
    };

    socket.on('console-line', handler);
    return () => {
      socket.off('console-line', handler);
      socket.emit('unsubscribe', serverName);
      // Cancel any pending flush on unmount
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [socket, serverName, flush]);

  // Auto-scroll — direct scrollTop assignment avoids scrollIntoView layout thrashing
  useEffect(() => {
    if (autoScroll && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
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
      const result = await api.sendCommand(cmd, serverName);
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
            onChange={(e) => setAutoScroll(e.target.checked)}
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

export default function ConsolePage() {
  const { auth } = useAuth();
  const socket = useSocket();
  const { worldservers } = useServerStatus();
  const canSendCommands = auth.gmlevel >= 2;
  const wsIds = worldservers.length > 0
    ? worldservers
    : [{ id: 'worldserver', name: 'World Server' }];

  return (
    <div className="page console-page">
      <h2 className="page-title">Console</h2>
      <div className="console-grid">
        {wsIds.map((ws) => (
          <ConsolePanel
            key={ws.id}
            title={ws.name}
            serverName={ws.id}
            socket={socket}
            canSendCommands={canSendCommands}
          />
        ))}
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
