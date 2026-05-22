const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/authMiddleware');
// const { sendStreamStartedEmail } = require('../src/services/emailService.ts');
const { Stream, Product, User, Order } = require('../models/index');
// ─── GET ALL STREAMS ─────────────────────────────────────────
// Public — anyone can browse streams
// GET /api/streams
router.get('/', async (req, res) => {
  try {
    const streams = await Stream.findAll({
      include: [
        {
          model: User,
          as: 'seller',
          attributes: ['id', 'name', 'email'], // never expose password_hash
        },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json({ streams });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET SINGLE STREAM ───────────────────────────────────────
// GET /api/streams/:id
router.get('/:id', async (req, res) => {
  try {
    const stream = await Stream.findByPk(req.params.id, {
      include: [
        { model: User, as: 'seller', attributes: ['id', 'name'] },
        { model: Product, as: 'products' },
      ],
    });

    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }

    res.json({ stream });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── CREATE STREAM ───────────────────────────────────────────
// Seller only
// POST /api/streams
router.post('/', protect, requireRole('seller'), async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const stream = await Stream.create({
      title,
      description: description || '',
      seller_id: req.user.id,  // comes from authMiddleware
      status: 'scheduled',
    });

    res.status(201).json({ message: 'Stream created', stream });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── UPDATE STREAM STATUS ────────────────────────────────────
// Seller changes status: scheduled → live → ended
// PATCH /api/streams/:id/status
router.patch('/:id/status', protect, requireRole('seller'), async (req, res) => {
  try {
    const stream = await Stream.findByPk(req.params.id);

    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }

    // Only the stream's own seller can update it
    if (stream.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not your stream' });
    }

    const { status } = req.body;
    const validStatuses = ['scheduled', 'live', 'ended'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await stream.update({ status });

    // When stream goes live, notify previous buyers of this seller
    if (status === 'live') {
      // Find all users who previously ordered from this seller's streams
      const previousOrders = await Order.findAll({
        where: { stream_id: stream.id },
        include: [{ model: User, as: 'buyer', attributes: ['id', 'name', 'email'] }],
      });

      // Deduplicate by user ID
      const seen = new Set();
      const recipients = previousOrders
        .map(o => o.buyer)
        .filter(buyer => {
          if (seen.has(buyer.id)) return false;
          seen.add(buyer.id);
          return true;
        });

      sendStreamStartedEmail({
        sellerName: req.user.name,
        streamTitle: stream.title,
        streamId: stream.id,
        recipients,
      }).catch(err => console.error('Stream-started email failed:', err));
    }

    res.json({ message: 'Stream status updated', stream });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── DELETE STREAM ───────────────────────────────────────────
// DELETE /api/streams/:id
router.delete('/:id', protect, requireRole('seller'), async (req, res) => {
  try {
    const stream = await Stream.findByPk(req.params.id);

    if (!stream) return res.status(404).json({ error: 'Stream not found' });
    if (stream.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not your stream' });
    }

    await stream.destroy(); // CASCADE in migration deletes products + messages too
    res.json({ message: 'Stream deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;