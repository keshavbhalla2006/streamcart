import jwt from 'jsonwebtoken';
import { protect, requireRole } from '../../middleware/authMiddleware';

// ── MOCKING ────────────────────────────────────────────────────
// jest.mock() replaces a module with a fake version
// We mock the models so the middleware doesn't need a real database
jest.mock('../../../models/index', () => ({
  User: {
    findByPk: jest.fn(),
  },
}));

// ── HELPER: build fake Express req/res/next ───────────────────
// In unit tests we don't have a real Express server
// We create lightweight mock objects that mimic req, res, next

function mockRequest(headers: Record<string, string> = {}) {
  return {
    headers,
    user: undefined,
  } as any;
}

function mockResponse() {
  const res: any = {};
  // jest.fn() creates a mock function that records calls
  // .mockReturnValue(res) makes chaining work: res.status(401).json(...)
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

function mockNext() {
  return jest.fn(); // records whether next() was called
}

// ── TESTS ─────────────────────────────────────────────────────

describe('protect middleware', () => {

  const validPayload = { id: 1, role: 'seller' as const, name: 'Test Seller' };

  // Helper to create a valid token for tests
  function makeToken(payload = validPayload, secret = process.env.JWT_SECRET!) {
    return jwt.sign(payload, secret, { expiresIn: '1h' });
  }

  it('should call next() when a valid token is provided', () => {
    const token = makeToken();
    const req   = mockRequest({ authorization: `Bearer ${token}` });
    const res   = mockResponse();
    const next  = mockNext();

    // Import protect after mocking
    const { protect } = require('../../middleware/authMiddleware');
    protect(req, res, next);

    // next() should have been called — request passes through
    expect(next).toHaveBeenCalledTimes(1);
    // res.status should NOT have been called — no error response
    expect(res.status).not.toHaveBeenCalled();
    // req.user should be populated with the decoded token
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe(1);
    expect(req.user.role).toBe('seller');
  });

  it('should return 401 when no Authorization header is provided', () => {
    const req  = mockRequest(); // no headers
    const res  = mockResponse();
    const next = mockNext();

    const { protect } = require('../../middleware/authMiddleware');
    protect(req, res, next);

    // next() should NOT be called — request is blocked
    expect(next).not.toHaveBeenCalled();
    // Should respond with 401
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
      // expect.objectContaining() — the object must contain these keys
      // expect.any(String) — the value must be a string, any string
    );
  });

  it('should return 401 when token does not start with Bearer', () => {
    const token = makeToken();
    const req   = mockRequest({ authorization: `Token ${token}` }); // wrong prefix
    const res   = mockResponse();
    const next  = mockNext();

    const { protect } = require('../../middleware/authMiddleware');
    protect(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should return 401 when token is signed with wrong secret', () => {
    const token = makeToken(validPayload, 'wrong_secret_nobody_knows');
    const req   = mockRequest({ authorization: `Bearer ${token}` });
    const res   = mockResponse();
    const next  = mockNext();

    const { protect } = require('../../middleware/authMiddleware');
    protect(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should return 401 when token is expired', () => {
    // Sign a token that expired 1 second ago
    const token = jwt.sign(validPayload, process.env.JWT_SECRET!, { expiresIn: '-1s' });
    const req   = mockRequest({ authorization: `Bearer ${token}` });
    const res   = mockResponse();
    const next  = mockNext();

    const { protect } = require('../../middleware/authMiddleware');
    protect(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('expired') })
    );
  });
});

describe('requireRole middleware', () => {

  it('should call next() when user has the required role', () => {
    const req  = { user: { id: 1, role: 'seller', name: 'Sam' } } as any;
    const res  = mockResponse();
    const next = mockNext();

    const { requireRole } = require('../../middleware/authMiddleware');
    requireRole('seller')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 403 when user has wrong role', () => {
    const req  = { user: { id: 2, role: 'buyer', name: 'Priya' } } as any;
    const res  = mockResponse();
    const next = mockNext();

    const { requireRole } = require('../../middleware/authMiddleware');
    requireRole('seller')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should accept multiple allowed roles', () => {
    const req  = { user: { id: 3, role: 'buyer', name: 'Raj' } } as any;
    const res  = mockResponse();
    const next = mockNext();

    const { requireRole } = require('../../middleware/authMiddleware');
    // Both buyer and seller are allowed
    requireRole('buyer', 'seller')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});