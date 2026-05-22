const express = require('express');
const router = express.Router();
const { Order, Product, Stream, User } = require('../models/index');
const { protect, requireRole } = require('../middleware/authMiddleware');
const sequelize = require('../config/sequelize');
// const { sendOrderConfirmationEmail } = require('../src/services/emailService');

// ─── PLACE AN ORDER (CHECKOUT) ───────────────────────────────
// Buyer only
// POST /api/orders
router.post('/', protect, requireRole('buyer'), async (req, res) => {
  const { product_id, quantity = 1 } = req.body;

  if (!product_id) {
    return res.status(400).json({ error: 'product_id is required' });
  }

  // ── THE TRANSACTION ──────────────────────────────────────
  // A transaction groups multiple DB operations into one atomic unit.
  // ATOMIC means: either ALL of them succeed, or NONE of them happen.
  //
  // Without a transaction — the problem:
  //   1. Buyer A reads stock = 1
  //   2. Buyer B reads stock = 1  (same time)
  //   3. Buyer A places order, stock → 0
  //   4. Buyer B places order, stock → -1  ← OVERSOLD
  //
  // With a transaction + row-level lock (LOCK IN SHARE MODE):
  //   1. Buyer A locks the product row
  //   2. Buyer B tries to lock — WAITS
  //   3. Buyer A completes, commits, stock → 0
  //   4. Buyer B gets the row — sees stock = 0 → error
  //   ← Safe. No overselling.

  const t = await sequelize.transaction(); // start transaction

  try {
    // 1. Lock the product row so no other request can read/write it
    //    until this transaction commits or rolls back
    const product = await Product.findOne({
      where: { id: product_id },
      lock: t.LOCK.UPDATE, // "SELECT ... FOR UPDATE" in SQL
      transaction: t,
    });

    if (!product) {
      await t.rollback();
      return res.status(404).json({ error: 'Product not found' });
    }

    // 2. Check stock
    if (product.stock_quantity < quantity) {
      await t.rollback();
      return res.status(400).json({
        error: `Not enough stock. Available: ${product.stock_quantity}`,
      });
    }

    // 3. Check if stream is live (can only buy during a live stream)
    const stream = await Stream.findByPk(product.stream_id, { transaction: t });
    if (stream.status !== 'live') {
      await t.rollback();
      return res.status(400).json({ error: 'Stream is not live. Cannot purchase.' });
    }

    // 4. Check flash deal — use flash_price if active and not expired
    const now = new Date();
    const isFlash = product.is_flash_deal && product.flash_ends_at > now;
    const unitPrice = isFlash ? product.flash_price : product.price;
    const totalPrice = unitPrice * quantity;

    // 5. Decrement stock
    await product.update(
      { stock_quantity: product.stock_quantity - quantity },
      { transaction: t }
    );

    // 6. Create the order record
    const order = await Order.create(
      {
        buyer_id: req.user.id,
        product_id,
        stream_id: product.stream_id,
        quantity,
        total_price: totalPrice,
        status: 'confirmed',
      },
      { transaction: t }
    );

    // 7. ALL steps succeeded — commit the transaction
    await t.commit();

    // Fire order confirmation email in background
    const buyer = await User.findByPk(req.user.id);
    const streamRecord = await Stream.findByPk(product.stream_id);

    sendOrderConfirmationEmail({
      buyerName: buyer.name,
      buyerEmail: buyer.email,
      orderId: order.id,
      productName: product.name,
      quantity,
      totalPrice: order.total_price,
      streamTitle: streamRecord.title,
      usedFlashDeal: isFlash,
    }).catch(err => console.error('Order email failed:', err));

    // Broadcast inventory update to all viewers in the stream room
    const io = req.app.get('io');
    const updatedProduct = await Product.findByPk(product_id);

    io.to(`stream-${product.stream_id}`).emit('inventory-update', {
      productId: product_id,
      stock_quantity: updatedProduct.stock_quantity,
      product_name: updatedProduct.name,
    });

    res.status(201).json({
      message: 'Order placed successfully',
      order,
      used_flash_deal: isFlash,
    });

  } catch (err) {
    // If ANYTHING throws — rollback ALL changes
    await t.rollback();
    console.error('Order error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET MY ORDERS (BUYER) ───────────────────────────────────
// GET /api/orders/my
router.get('/my', protect, async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { buyer_id: req.user.id },
      include: [
        { model: Product, as: 'product' },
        { model: Stream, as: 'stream', attributes: ['id', 'title'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET ORDERS FOR A STREAM (SELLER) ───────────────────────
// Seller sees all orders placed during their stream
// GET /api/orders/stream/:streamId
router.get('/stream/:streamId', protect, requireRole('seller'), async (req, res) => {
  try {
    const stream = await Stream.findByPk(req.params.streamId);
    if (!stream) return res.status(404).json({ error: 'Stream not found' });
    if (stream.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not your stream' });
    }

    const orders = await Order.findAll({
      where: { stream_id: req.params.streamId },
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'price'] },
        { model: User, as: 'buyer', attributes: ['id', 'name', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Quick revenue summary
    const revenue = orders.reduce((sum, o) => sum + o.total_price, 0);

    res.json({ orders, total_orders: orders.length, total_revenue: revenue });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;