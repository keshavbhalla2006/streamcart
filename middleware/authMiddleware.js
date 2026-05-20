const jwt = require('jsonwebtoken');
const { User } = require('../models/index');

// ─── PROTECT MIDDLEWARE ──────────────────────────────────────
// Attach this to any route that requires login
// Usage: router.get('/dashboard', protect, handler)

const protect = async (req, res, next) => {
  try {
    // 1. Read token from Authorization header
    // Client sends:  Authorization: Bearer <token>
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided. Please log in.' });
    }

    const token = authHeader.split(' ')[1]; // extract just the token part

    // 2. Verify the token — this throws if expired or tampered
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded = { id, role, name, iat, exp }

    // 3. Attach user info to the request object
    // Every protected route can now access req.user
    req.user = { id: decoded.id, role: decoded.role, name: decoded.name };

    next(); // pass control to the actual route handler

  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

// ─── ROLE GUARD MIDDLEWARE ───────────────────────────────────
// Usage: router.post('/stream', protect, requireRole('seller'), handler)
// Always use AFTER protect — needs req.user to exist first

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(' or ')}`,
      });
    }
    next();
  };
};

module.exports = { protect, requireRole };