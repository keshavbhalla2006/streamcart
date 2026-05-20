import { Response, Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendWelcomeEmail } from '../services/emailService';
import { AuthRequest, RegisterBody, LoginBody } from '../types/index';
import { protect } from '../middleware/authMiddleware';

// We import the JS model for now — will migrate models later
// TypeScript can use JS files — this is gradual migration
const { User } = require('../../models/index');

const router = Router();

// ── REGISTER ──────────────────────────────────────────────────
router.post(
  '/register',
  async (req: AuthRequest, res: Response): Promise<void> => {

    // TypeScript now knows exactly what fields req.body should have
    const { name, email, password, role }: RegisterBody = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email and password are required' });
      return; // explicit return needed — TypeScript notices missing returns
    }

    try {
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        res.status(409).json({ error: 'Email already registered' });
        return;
      }

      const password_hash = await bcrypt.hash(password, 10);

      const user = await User.create({
        name,
        email,
        password_hash,
        role: role === 'seller' ? 'seller' : 'buyer',
      });

      res.status(201).json({
        message: 'Registration successful',
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      });

      // Fire welcome email in background
      // Do NOT await this
      sendWelcomeEmail({
        name: user.name,
        email: user.email,
        role: user.role,
      }).catch((err) => {
        console.error('Welcome email failed:', err);
      });

    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ── LOGIN ─────────────────────────────────────────────────────
router.post(
  '/login',
  async (req: AuthRequest, res: Response): Promise<void> => {

    const { email, password }: LoginBody = req.body;

    try {
      const user = await User.findOne({ where: { email } });
      if (!user) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const token = jwt.sign(
        { id: user.id, role: user.role, name: user.name },
        process.env.JWT_SECRET as string,
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      });

    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ── GET CURRENT USER ──────────────────────────────────────────
router.get(
  '/me',
  protect,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = await User.findByPk(req.user!.id, {
        attributes: ['id', 'name', 'email', 'role', 'createdAt'],
      });
      res.json({ user });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

export default router;