const express = require('express');
const router  = express.Router();
const { Product, Stream } = require('../models/index');
const { protect, requireRole } = require('../middleware/authMiddleware');

// ─── GET PRODUCTS FOR A STREAM ───────────────────────────────
// GET /api/products/stream/:streamId
router.get('/stream/:streamId', async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { stream_id: req.params.streamId },
      order: [['createdAt', 'ASC']],
    });
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── ADD PRODUCT TO STREAM ───────────────────────────────────
// Seller only
// POST /api/products
router.post('/', protect, requireRole('seller'), async (req, res) => {
  try {
    const { name, description, price, stock_quantity, stream_id } = req.body;

    if (!name || !price || !stream_id) {
      return res.status(400).json({ error: 'Name, price and stream_id are required' });
    }

    // Verify the stream belongs to this seller
    const stream = await Stream.findByPk(stream_id);
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    if (stream.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only add products to your own stream' });
    }

    const product = await Product.create({
      name,
      description:    description || '',
      price,
      stock_quantity: stock_quantity || 0,
      stream_id,
    });

    res.status(201).json({ message: 'Product added', product });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── SET FLASH DEAL ──────────────────────────────────────────
// Seller marks a product as a flash deal with a special price + expiry
// PATCH /api/products/:id/flash
router.patch('/:id/flash', protect, requireRole('seller'), async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{ model: Stream, as: 'stream' }],
    });

    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.stream.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not your product' });
    }

    const { flash_price, flash_ends_at } = req.body;

    if (!flash_price || !flash_ends_at) {
      return res.status(400).json({ error: 'flash_price and flash_ends_at are required' });
    }

    await product.update({
      is_flash_deal: true,
      flash_price,
      flash_ends_at: new Date(flash_ends_at),
    });

    res.json({ message: 'Flash deal activated', product });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── UPDATE STOCK ────────────────────────────────────────────
// PATCH /api/products/:id/stock
router.patch('/:id/stock', protect, requireRole('seller'), async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{ model: Stream, as: 'stream' }],
    });

    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.stream.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not your product' });
    }

    await product.update({ stock_quantity: req.body.stock_quantity });
    res.json({ message: 'Stock updated', product });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── DELETE PRODUCT ──────────────────────────────────────────
// DELETE /api/products/:id
router.delete('/:id', protect, requireRole('seller'), async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{ model: Stream, as: 'stream' }],
    });

    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.stream.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not your product' });
    }

    await product.destroy();
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;