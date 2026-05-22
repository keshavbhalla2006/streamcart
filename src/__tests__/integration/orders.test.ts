import request from 'supertest';
import express from 'express';
import jwt     from 'jsonwebtoken';

function buildTestApp() {
  const app = express();
  app.use(express.json());
  // Mock io for tests — orders route uses req.app.get('io')
  app.set('io', { to: () => ({ emit: () => {} }) });
  app.use('/api/orders', require('../../../routes/orders'));
  return app;
}

const app = buildTestApp();
const { User, Stream, Product, Order, ChatMessage, sequelize } = require('../../../models/index');

function makeBuyerToken(id: number) {
  return jwt.sign({ id, role: 'buyer', name: 'Test Buyer' }, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

let seller:  any;
let buyer:   any;
let stream:  any;
let product: any;

beforeAll(async () => {
  await sequelize.authenticate();
});

beforeEach(async () => {
  // Create fresh test data before each test
  seller  = await User.create({ name: 'Seller', email: 's@t.com', password_hash: 'h', role: 'seller' });
  buyer   = await User.create({ name: 'Buyer',  email: 'b@t.com', password_hash: 'h', role: 'buyer'  });
  stream  = await Stream.create({ title: 'Live Stream', seller_id: seller.id, status: 'live' });
  product = await Product.create({
    name: 'Earbuds', price: 999, stock_quantity: 5, stream_id: stream.id,
  });
});

afterEach(async () => {
  // Delete in correct order — children before parents
  // to avoid foreign key constraint violations
  await Order.destroy({   where: {}, truncate: false });
  await Product.destroy({ where: {}, truncate: false });
  await ChatMessage?.destroy({ where: {}, truncate: false }).catch(() => {});
  await Stream.destroy({  where: {}, truncate: false });
  await User.destroy({    where: {}, truncate: false });
});

afterAll(async () => {
  await sequelize.close();
});

describe('POST /api/orders', () => {

  it('should place an order and decrement stock', async () => {
    const token = makeBuyerToken(buyer.id);

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: product.id, quantity: 2 })
      .expect(201);

    expect(res.body.order.status).toBe('confirmed');
    expect(res.body.order.quantity).toBe(2);
    expect(res.body.order.total_price).toBe(1998); // 999 * 2

    // Verify stock actually decreased in the database
    const updatedProduct = await Product.findByPk(product.id);
    expect(updatedProduct.stock_quantity).toBe(3); // 5 - 2
  });

  it('should return 400 when quantity exceeds stock', async () => {
    const token = makeBuyerToken(buyer.id);

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: product.id, quantity: 10 }) // only 5 in stock
      .expect(400);

    expect(res.body.error).toContain('Not enough stock');

    // Stock must NOT have changed — transaction rolled back
    const unchanged = await Product.findByPk(product.id);
    expect(unchanged.stock_quantity).toBe(5);
  });

  it('should return 400 when stream is not live', async () => {
    // Change stream to ended
    await stream.update({ status: 'ended' });

    const token = makeBuyerToken(buyer.id);

    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: product.id, quantity: 1 })
      .expect(400);
  });

  it('should apply flash deal price when active', async () => {
    // Activate flash deal
    const flashEndsAt = new Date(Date.now() + 60000);
    await product.update({ is_flash_deal: true, flash_price: 499, flash_ends_at: flashEndsAt });

    const token = makeBuyerToken(buyer.id);

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: product.id, quantity: 1 })
      .expect(201);

    // Flash price should be used
    expect(res.body.order.total_price).toBe(499);
    expect(res.body.used_flash_deal).toBe(true);
  });

  it('should NOT apply expired flash deal price', async () => {
    // Flash deal that ended 1 second ago
    const flashEndsAt = new Date(Date.now() - 1000);
    await product.update({ is_flash_deal: true, flash_price: 499, flash_ends_at: flashEndsAt });

    const token = makeBuyerToken(buyer.id);

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: product.id, quantity: 1 })
      .expect(201);

    // Regular price should be used
    expect(res.body.order.total_price).toBe(999);
    expect(res.body.used_flash_deal).toBe(false);
  });

  it('should return 401 when no token provided', async () => {
    await request(app)
      .post('/api/orders')
      .send({ product_id: product.id, quantity: 1 })
      .expect(401);
  });

  // ── THE CONCURRENCY TEST ─────────────────────────────────────
  // This is the most impressive test — proves the transaction works
  it('should prevent overselling under concurrent requests', async () => {

    // Set stock to exactly 1
    await product.update({ stock_quantity: 1 });

    const buyer1Token = makeBuyerToken(buyer.id);

    // Create second buyer
    const buyer2 = await User.create({
      name: 'Buyer2', email: 'b2@t.com', password_hash: 'h', role: 'buyer',
    });
    const buyer2Token = makeBuyerToken(buyer2.id);

    // Fire both requests simultaneously — Promise.all sends them at the same time
    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({ product_id: product.id, quantity: 1 }),
      request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyer2Token}`)
        .send({ product_id: product.id, quantity: 1 }),
    ]);

    // One should succeed, one should fail
    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([201, 400]); // one created, one not enough stock

    // Stock must be exactly 0 — only one purchase went through
    const finalProduct = await Product.findByPk(product.id);
    expect(finalProduct.stock_quantity).toBe(0);

    // Only one order should exist in the database
    const orders = await Order.findAll({ where: { product_id: product.id } });
    expect(orders).toHaveLength(1);
  });
});