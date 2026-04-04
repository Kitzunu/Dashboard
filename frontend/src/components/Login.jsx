import React, { useState } from 'react';
import { useAuth } from '../App.jsx';
import { api } from '../api.js';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login(username, password);
      login(data);
    } catch (err) {
      // Safari/WebKit reports "Load failed" and Chrome reports "Failed to fetch"
      // when CORS or network issues prevent the request from completing.
      const msg = err.message;
      if (msg === 'Load failed' || msg === 'Failed to fetch' || msg === 'NetworkError when attempting to fetch resource.') {
        setError('Unable to reach the server. If connecting remotely, ensure the backend FRONTEND_URL and ALLOWED_IPS settings include this device.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-logo">
          <div className="login-emblem">
            <img src="../../img/icon.png" alt="image" width="64" height="auto"></img>
          </div>
          <h1>AzerothCore</h1>
          <p>Server Dashboard</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group">
            <label>GM Account</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              autoFocus
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary btn-full">
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <p className="login-note">Requires GM level ≥ 1</p>
      </div>
    </div>
  );
}
