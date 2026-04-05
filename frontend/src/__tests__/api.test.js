import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch globally before importing api module
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock localStorage
const store = {};
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key) => store[key] || null),
  setItem: vi.fn((key, val) => { store[key] = val; }),
  removeItem: vi.fn((key) => { delete store[key]; }),
});

// Dynamic import so stubs are in place
const { api, BASE_URL } = await import('../api');

beforeEach(() => {
  mockFetch.mockReset();
  Object.keys(store).forEach((k) => delete store[k]);
});

function jsonResponse(data, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    json: () => Promise.resolve(data),
  });
}

describe('api module', () => {
  describe('BASE_URL', () => {
    it('falls back to localhost:3001 when VITE_API_URL is not set', () => {
      expect(BASE_URL).toMatch(/localhost:3001/);
    });
  });

  describe('unauthenticated requests', () => {
    it('login sends POST to /api/auth/login', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ token: 'abc' }));

      const result = await api.login('admin', 'pass123');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/api/auth/login`);
      expect(opts.method).toBe('POST');
      expect(JSON.parse(opts.body)).toEqual({ username: 'admin', password: 'pass123' });
      expect(result).toEqual({ token: 'abc' });
    });
  });

  describe('authenticated requests', () => {
    beforeEach(() => {
      store.ac_auth = JSON.stringify({ token: 'my-jwt-token' });
    });

    it('includes Authorization header when token exists', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ status: 'online' }));

      await api.getServerStatus();

      const [, opts] = mockFetch.mock.calls[0];
      expect(opts.headers.Authorization).toBe('Bearer my-jwt-token');
    });

    it('getServerStatus calls GET /api/servers/status', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ servers: [] }));

      const result = await api.getServerStatus();

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/api/servers/status`);
      expect(opts.method).toBe('GET');
      expect(result).toEqual({ servers: [] });
    });

    it('sendCommand calls POST /api/console/command', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ output: 'done' }));

      await api.sendCommand('.server info', 'worldserver');

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/api/console/command`);
      expect(opts.method).toBe('POST');
      expect(JSON.parse(opts.body)).toEqual({ command: '.server info', server: 'worldserver' });
    });
  });

  describe('error handling', () => {
    it('throws on non-ok responses', async () => {
      mockFetch.mockReturnValueOnce(Promise.resolve({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ error: 'Invalid query' }),
      }));

      await expect(api.getServerStatus()).rejects.toThrow('Invalid query');
    });

    it('dispatches auth-expired event on 401', async () => {
      const handler = vi.fn();
      window.addEventListener('auth-expired', handler);

      mockFetch.mockReturnValueOnce(Promise.resolve({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: 'Token expired' }),
      }));

      await expect(api.getServerStatus()).rejects.toThrow('Token expired');
      expect(handler).toHaveBeenCalledTimes(1);

      window.removeEventListener('auth-expired', handler);
    });
  });
});
