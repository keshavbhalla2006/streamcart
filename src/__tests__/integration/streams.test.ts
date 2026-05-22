import request from 'supertest';
import express from 'express';
import jwt     from 'jsonwebtoken';

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth',    require('../../../routes/auth'));
  app.use('/api/streams', require('../../../routes/streams'));
  return app;
}

const app = buildTestApp();
const { User, Stream, sequelize } = require('../../../models/index');

// ── TOKEN HELPERS ─────────────────────────────────────────────
// In integration tests we often need tokens without going through login
// We can generate them directly — faster than HTTP round trips

function makeSellerToken(id = 1) {
  return jwt.sign(
    { id, role: 'seller', name: 'Test Seller' },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
}

function makeBuyerToken(id = 2) {
  return jwt.sign(
    { id, role: 'buyer', name: 'Test Buyer' },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
}

beforeAll(async () => {
  await sequelize.authenticate();
});

afterEach(async () => {
  await Stream.destroy({ where: {}, truncate: false });
  await User.destroy({   where: {}, truncate: false });
});

afterAll(async () => {
  await sequelize.close();
});

// ── CREATE STREAM TESTS ───────────────────────────────────────
describe('POST /api/streams', () => {

  let sellerToken: string;
  let sellerId:    number;

  beforeEach(async () => {
    // Create a real seller in the test database
    const seller = await User.create({
      name:          'Test Seller',
      email:         `seller${Date.now()}@test.com`,
      password_hash: 'fakehash',
      role:          'seller',
    });
    sellerId    = seller.id;
    sellerToken = makeSellerToken(sellerId);
  });

  it('should create a stream for a seller', async () => {
    const res = await request(app)
      .post('/api/streams')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ title: 'Electronics Sale', description: 'Best deals' })
      .expect(201);

    expect(res.body.stream.title).toBe('Electronics Sale');
    expect(res.body.stream.status).toBe('scheduled');
    expect(res.body.stream.seller_id).toBe(sellerId);
  });

  it('should return 400 when title is missing', async () => {
    await request(app)
      .post('/api/streams')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ description: 'No title' })
      .expect(400);
  });

  it('should return 403 when buyer tries to create a stream', async () => {
    const buyer = await User.create({
      name: 'Buyer', email: 'buyer@test.com',
      password_hash: 'hash', role: 'buyer',
    });
    const buyerToken = makeBuyerToken(buyer.id);

    await request(app)
      .post('/api/streams')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ title: 'Buyer stream attempt' })
      .expect(403);
  });

  it('should return 401 when no token provided', async () => {
    await request(app)
      .post('/api/streams')
      .send({ title: 'Unauthorized stream' })
      .expect(401);
  });
});

// ── GET STREAMS TESTS ─────────────────────────────────────────
describe('GET /api/streams', () => {

  it('should return empty array when no streams exist', async () => {
    const res = await request(app)
      .get('/api/streams')
      .expect(200);

    expect(res.body.streams).toEqual([]);
  });

  it('should return all streams publicly without auth', async () => {
    const seller = await User.create({
      name: 'Seller', email: 's@test.com',
      password_hash: 'hash', role: 'seller',
    });

    await Stream.bulkCreate([
      { title: 'Stream 1', seller_id: seller.id, status: 'live' },
      { title: 'Stream 2', seller_id: seller.id, status: 'ended' },
    ]);

    const res = await request(app)
      .get('/api/streams')
      .expect(200); // no auth header — public route

    expect(res.body.streams).toHaveLength(2);
  });
});

// ── UPDATE STATUS TESTS ───────────────────────────────────────
describe('PATCH /api/streams/:id/status', () => {

  it('should update stream status from scheduled to live', async () => {
    const seller = await User.create({
      name: 'Seller', email: 's@test.com',
      password_hash: 'hash', role: 'seller',
    });
    const token  = makeSellerToken(seller.id);
    const stream = await Stream.create({
      title: 'Test', seller_id: seller.id, status: 'scheduled',
    });

    const res = await request(app)
      .patch(`/api/streams/${stream.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'live' })
      .expect(200);

    expect(res.body.stream.status).toBe('live');
  });

  it('should return 403 when seller tries to update another seller\'s stream', async () => {
    const seller1 = await User.create({
      name: 'S1', email: 's1@test.com', password_hash: 'h', role: 'seller',
    });
    const seller2 = await User.create({
      name: 'S2', email: 's2@test.com', password_hash: 'h', role: 'seller',
    });

    const stream      = await Stream.create({ title: 'S1 stream', seller_id: seller1.id });
    const seller2Token = makeSellerToken(seller2.id);

    // Seller 2 tries to modify Seller 1's stream
    await request(app)
      .patch(`/api/streams/${stream.id}/status`)
      .set('Authorization', `Bearer ${seller2Token}`)
      .send({ status: 'live' })
      .expect(403);
  });

  it('should return 400 for invalid status value', async () => {
    const seller = await User.create({
      name: 'S', email: 's@test.com', password_hash: 'h', role: 'seller',
    });
    const stream = await Stream.create({ title: 'T', seller_id: seller.id });
    const token  = makeSellerToken(seller.id);

    await request(app)
      .patch(`/api/streams/${stream.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'broadcasting' }) // invalid status
      .expect(400);
  });
});