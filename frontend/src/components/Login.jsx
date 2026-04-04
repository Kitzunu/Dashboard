import React, { useState } from 'react';
import { useAuth } from '../App.jsx';
import { api, BASE_URL } from '../api.js';

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
      // fetch() throws TypeError for all network / CORS failures regardless of
      // browser (Safari: "Load failed", Chrome: "Failed to fetch", Firefox:
      // "NetworkError …").  Server-side errors arrive as plain Error instances
      // thrown by our request() wrapper, so this check is reliable.
      if (err instanceof TypeError) {
        setError(`Unable to reach the server at ${BASE_URL}. Check that the backend is running and reachable from this device.`);
      } else {
        setError(err.message);
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
