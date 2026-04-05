const ipAllowlist = require('../../middleware/ipAllowlist');

function mockReq(ip) {
  return { ip, socket: { remoteAddress: ip } };
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

afterEach(() => {
  delete process.env.ALLOWED_IPS;
});

describe('ipAllowlist middleware', () => {
  describe('default behaviour (ALLOWED_IPS not set)', () => {
    it('allows localhost IPv4', () => {
      const req = mockReq('127.0.0.1');
      const res = mockRes();
      const next = jest.fn();

      ipAllowlist(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('allows localhost IPv6', () => {
      const req = mockReq('::1');
      const res = mockRes();
      const next = jest.fn();

      ipAllowlist(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('allows IPv4-mapped localhost', () => {
      const req = mockReq('::ffff:127.0.0.1');
      const res = mockRes();
      const next = jest.fn();

      ipAllowlist(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('allows private LAN addresses (192.168.x.x)', () => {
      const req = mockReq('192.168.1.50');
      const res = mockRes();
      const next = jest.fn();

      ipAllowlist(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('allows private LAN addresses (10.x.x.x)', () => {
      const req = mockReq('10.0.0.5');
      const res = mockRes();
      const next = jest.fn();

      ipAllowlist(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('blocks public IPs when ALLOWED_IPS is unset', () => {
      const req = mockReq('8.8.8.8');
      const res = mockRes();
      const next = jest.fn();

      // Suppress the console.warn
      jest.spyOn(console, 'warn').mockImplementation(() => {});

      ipAllowlist(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      console.warn.mockRestore();
    });
  });

  describe('custom ALLOWED_IPS set', () => {
    it('allows an explicitly listed IP', () => {
      process.env.ALLOWED_IPS = '192.168.1.100,10.0.0.1';
      const req = mockReq('192.168.1.100');
      const res = mockRes();
      const next = jest.fn();

      ipAllowlist(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('allows the IPv6-mapped version of an allowed IPv4', () => {
      process.env.ALLOWED_IPS = '192.168.1.100';
      const req = mockReq('::ffff:192.168.1.100');
      const res = mockRes();
      const next = jest.fn();

      ipAllowlist(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('blocks IPs not in the allowlist', () => {
      process.env.ALLOWED_IPS = '192.168.1.100';
      const req = mockReq('192.168.1.200');
      const res = mockRes();
      const next = jest.fn();

      jest.spyOn(console, 'warn').mockImplementation(() => {});

      ipAllowlist(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      console.warn.mockRestore();
    });
  });

  it('uses socket remoteAddress as fallback when req.ip is falsy', () => {
    const req = { ip: undefined, socket: { remoteAddress: '127.0.0.1' } };
    const res = mockRes();
    const next = jest.fn();

    ipAllowlist(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
