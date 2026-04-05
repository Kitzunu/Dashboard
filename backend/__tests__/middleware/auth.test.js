const jwt = require('jsonwebtoken');
const { authenticateToken, requireGMLevel } = require('../../middleware/auth');

// Mock the sessions module used inside authenticateToken
jest.mock('../../routes/sessions', () => ({
  isRevoked: jest.fn().mockResolvedValue(false),
  touchSession: jest.fn(),
}));

function mockReq(overrides = {}) {
  return { headers: {}, ...overrides };
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const SECRET = 'test-secret';

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
});

afterAll(() => {
  delete process.env.JWT_SECRET;
});

describe('authenticateToken', () => {
  it('returns 401 when no token is provided', () => {
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 for an invalid token', () => {
    const req = mockReq({ headers: { authorization: 'Bearer invalid.token.here' } });
    const res = mockRes();
    const next = jest.fn();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() for a valid, non-revoked token', async () => {
    const token = jwt.sign({ id: 1, username: 'admin', gmlevel: 3 }, SECRET, { expiresIn: '1h' });
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = mockRes();
    const next = jest.fn();

    authenticateToken(req, res, next);

    // isRevoked is async — wait for the promise to settle
    await new Promise((r) => setTimeout(r, 50));

    expect(req.user).toBeDefined();
    expect(req.user.username).toBe('admin');
    expect(next).toHaveBeenCalled();
  });

  it('returns 401 when the session is revoked', async () => {
    const { isRevoked } = require('../../routes/sessions');
    isRevoked.mockResolvedValueOnce(true);

    const token = jwt.sign({ id: 1, username: 'admin', gmlevel: 3 }, SECRET, { expiresIn: '1h' });
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = mockRes();
    const next = jest.fn();

    authenticateToken(req, res, next);

    await new Promise((r) => setTimeout(r, 50));

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Session has been revoked' });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireGMLevel', () => {
  it('calls next() when user meets the required GM level', () => {
    const middleware = requireGMLevel(2);
    const req = mockReq({ user: { gmlevel: 3 } });
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('calls next() when user matches the exact GM level', () => {
    const middleware = requireGMLevel(2);
    const req = mockReq({ user: { gmlevel: 2 } });
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('returns 403 when user has insufficient GM level', () => {
    const middleware = requireGMLevel(3);
    const req = mockReq({ user: { gmlevel: 1 } });
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when user is not present on the request', () => {
    const middleware = requireGMLevel(1);
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
