const { User, Stream, Product, Order } = require('../models/index');
const sequelize = require('../config/sequelize');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');

// Helper — extract user from context (set by Apollo's context function)
const getUser = (context) => {
  if (!context.user) throw new Error('Not authenticated. Please login.');
  return context.user;
};

const resolvers = {

  // ── QUERIES ───────────────────────────────────────────────

  Query: {

    // Get all streams, optional status filter
    streams: async (_, { status }) => {
      const where = status ? { status } : {};
      return await Stream.findAll({
        where,
        include: [{ model: User,    as: 'seller'   }],
        order:   [['createdAt', 'DESC']],
      });
    },

    // Get single stream with products and seller
    stream: async (_, { id }) => {
      const stream = await Stream.findByPk(id, {
        include: [
          { model: User,    as: 'seller'   },
          { model: Product, as: 'products' },
        ],
      });
      if (!stream) throw new Error('Stream not found');
      return stream;
    },

    // Get products for a stream
    products: async (_, { streamId }) => {
      return await Product.findAll({
        where: { stream_id: streamId },
        order: [['createdAt', 'ASC']],
      });
    },

    // Get single product
    product: async (_, { id }) => {
      const product = await Product.findByPk(id, {
        include: [{ model: Stream, as: 'stream' }],
      });
      if (!product) throw new Error('Product not found');
      return product;
    },

    // Get logged-in buyer's orders
    myOrders: async (_, __, context) => {
      const user = getUser(context);
      return await Order.findAll({
        where:   { buyer_id: user.id },
        include: [
          { model: Product, as: 'product' },
          { model: Stream,  as: 'stream', attributes: ['id', 'title'] },
        ],
        order: [['createdAt', 'DESC']],
      });
    },

    // Get orders for a stream (seller only)
    streamOrders: async (_, { streamId }, context) => {
      const user = getUser(context);
      const stream = await Stream.findByPk(streamId);
      if (!stream) throw new Error('Stream not found');
      if (stream.seller_id !== user.id) throw new Error('Not your stream');

      return await Order.findAll({
        where:   { stream_id: streamId },
        include: [
          { model: Product, as: 'product' },
          { model: User,    as: 'buyer', attributes: ['id', 'name', 'email'] },
        ],
        order: [['createdAt', 'DESC']],
      });
    },

    // Get current user
    me: async (_, __, context) => {
      const user = getUser(context);
      return await User.findByPk(user.id, {
        attributes: ['id', 'name', 'email', 'role', 'createdAt'],
      });
    },
  },

  // ── MUTATIONS ─────────────────────────────────────────────

  Mutation: {

    // Register
    register: async (_, { name, email, password, role }) => {
      const existing = await User.findOne({ where: { email } });
      if (existing) throw new Error('Email already registered');

      const password_hash = await bcrypt.hash(password, 10);
      const user = await User.create({
        name, email, password_hash,
        role: role === 'seller' ? 'seller' : 'buyer',
      });

      const token = jwt.sign(
        { id: user.id, role: user.role, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return { message: 'Registration successful', token, user };
    },

    // Login
    login: async (_, { email, password }) => {
      const user = await User.findOne({ where: { email } });
      if (!user) throw new Error('Invalid email or password');

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) throw new Error('Invalid email or password');

      const token = jwt.sign(
        { id: user.id, role: user.role, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return { message: 'Login successful', token, user };
    },

    // Create stream (seller only)
    createStream: async (_, { title, description }, context) => {
      const user = getUser(context);
      if (user.role !== 'seller') throw new Error('Only sellers can create streams');

      return await Stream.create({
        title,
        description: description || '',
        seller_id:   user.id,
        status:      'scheduled',
      });
    },

    // Update stream status
    updateStreamStatus: async (_, { id, status }, context) => {
      const user   = getUser(context);
      const stream = await Stream.findByPk(id);
      if (!stream) throw new Error('Stream not found');
      if (stream.seller_id !== user.id) throw new Error('Not your stream');

      const valid = ['scheduled', 'live', 'ended'];
      if (!valid.includes(status)) throw new Error('Invalid status');

      await stream.update({ status });
      return stream;
    },

    // Delete stream
    deleteStream: async (_, { id }, context) => {
      const user   = getUser(context);
      const stream = await Stream.findByPk(id);
      if (!stream) throw new Error('Stream not found');
      if (stream.seller_id !== user.id) throw new Error('Not your stream');

      await stream.destroy();
      return stream;
    },

    // Add product to stream (seller only)
    addProduct: async (_, args, context) => {
      const user = getUser(context);
      if (user.role !== 'seller') throw new Error('Only sellers can add products');

      const stream = await Stream.findByPk(args.stream_id);
      if (!stream) throw new Error('Stream not found');
      if (stream.seller_id !== user.id) throw new Error('Not your stream');

      return await Product.create({
        name:           args.name,
        description:    args.description || '',
        price:          args.price,
        stock_quantity: args.stock_quantity || 0,
        stream_id:      args.stream_id,
      });
    },

    // Set flash deal
    setFlashDeal: async (_, { productId, flash_price, flash_ends_at }, context) => {
      const user    = getUser(context);
      const product = await Product.findByPk(productId, {
        include: [{ model: Stream, as: 'stream' }],
      });
      if (!product) throw new Error('Product not found');
      if (product.stream.seller_id !== user.id) throw new Error('Not your product');

      await product.update({
        is_flash_deal: true,
        flash_price,
        flash_ends_at: new Date(flash_ends_at),
      });
      return product;
    },

    // Place order with MySQL transaction
    placeOrder: async (_, { product_id, quantity = 1 }, context) => {
      const user = getUser(context);
      if (user.role !== 'buyer') throw new Error('Only buyers can place orders');

      const t = await sequelize.transaction();

      try {
        const product = await Product.findOne({
          where:       { id: product_id },
          lock:        t.LOCK.UPDATE,
          transaction: t,
        });

        if (!product) { await t.rollback(); throw new Error('Product not found'); }
        if (product.stock_quantity < quantity) {
          await t.rollback();
          throw new Error(`Not enough stock. Available: ${product.stock_quantity}`);
        }

        const stream = await Stream.findByPk(product.stream_id, { transaction: t });
        if (stream.status !== 'live') {
          await t.rollback();
          throw new Error('Stream is not live');
        }

        const now        = new Date();
        const isFlash    = product.is_flash_deal && product.flash_ends_at > now;
        const unitPrice  = isFlash ? product.flash_price : product.price;
        const totalPrice = unitPrice * quantity;

        await product.update(
          { stock_quantity: product.stock_quantity - quantity },
          { transaction: t }
        );

        const order = await Order.create(
          {
            buyer_id:    user.id,
            product_id,
            stream_id:   product.stream_id,
            quantity,
            total_price: totalPrice,
            status:      'confirmed',
          },
          { transaction: t }
        );

        await t.commit();

        return { message: 'Order placed', order, used_flash_deal: isFlash };

      } catch (err) {
        await t.rollback();
        throw err;
      }
    },
  },

  // ── FIELD RESOLVERS ───────────────────────────────────────
  // These resolve nested fields when a query asks for them
  // e.g. query { stream(id:1) { seller { name } } }
  // GraphQL calls Stream.seller resolver automatically

  Stream: {
    seller:   (parent) => User.findByPk(parent.seller_id),
    products: (parent) => Product.findAll({ where: { stream_id: parent.id } }),
    orders:   (parent) => Order.findAll({ where: { stream_id: parent.id } }),
  },

  Product: {
    stream: (parent) => Stream.findByPk(parent.stream_id),
  },

  Order: {
    product: (parent) => Product.findByPk(parent.product_id),
    stream:  (parent) => Stream.findByPk(parent.stream_id),
    buyer:   (parent) => User.findByPk(parent.buyer_id),
  },
};

module.exports = resolvers;