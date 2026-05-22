const express = require('express');
const router = express.Router();

const { CartItem, Product, User } = require('../models');
const { protect } = require('../middleware/authMiddleware');


// ─────────────────────────────────────────────
// ADD ITEM TO CART
// POST /api/cart/add
// ─────────────────────────────────────────────
router.post('/add', protect, async (req, res) => {
  try {
    const buyerId = req.user.id;

    const {
      product_id,
      quantity,
    } = req.body;

    // Check product exists
    const product = await Product.findByPk(product_id);

    if (!product) {
      return res.status(404).json({
        error: 'Product not found',
      });
    }

    // Check if already in cart
    let cartItem = await CartItem.findOne({
      where: {
        buyer_id: buyerId,
        product_id,
      },
    });

    if (cartItem) {
      cartItem.quantity += quantity || 1;
      await cartItem.save();
    } else {
      cartItem = await CartItem.create({
        buyer_id: buyerId,
        product_id,
        quantity: quantity || 1,
      });
    }

    res.status(201).json({
      message: 'Item added to cart',
      cartItem,
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: 'Failed to add item to cart',
    });
  }
});


// ─────────────────────────────────────────────
// GET CART
// GET /api/cart
// ─────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const buyerId = req.user.id;

    const cartItems = await CartItem.findAll({
      where: {
        buyer_id: buyerId,
      },

      include: [
        {
          model: Product,
          as: 'product',
        },
      ],
    });

    let total = 0;

    cartItems.forEach(item => {
      total += item.quantity * item.product.price;
    });

    res.json({
      cartItems,
      total,
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: 'Failed to fetch cart',
    });
  }
});


// ─────────────────────────────────────────────
// REMOVE ITEM
// DELETE /api/cart/:id
// ─────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const buyerId = req.user.id;

    const item = await CartItem.findOne({
      where: {
        id: req.params.id,
        buyer_id: buyerId,
      },
    });

    if (!item) {
      return res.status(404).json({
        error: 'Cart item not found',
      });
    }

    await item.destroy();

    res.json({
      message: 'Item removed from cart',
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: 'Failed to remove item',
    });
  }
});

module.exports = router;