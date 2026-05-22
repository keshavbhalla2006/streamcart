import request from 'supertest';
import express from 'express';

// ── BUILD A TEST APP ──────────────────────────────────────────
// We don't import the full server.ts (that starts the real server)
// We build a minimal Express app with just the routes we need

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', require('../../../routes/auth'));
  app.use(require('../../../middleware/errorHandler'));
  return app;
}

const app = buildTestApp();

// ── DATABASE SETUP ────────────────────────────────────────────
// Import models to run setup/teardown against the test database

const { User, sequelize } = require('../../../models/index');

// beforeAll runs once before all tests in this file
beforeAll(async () => {
  // Sync test database — create tables if not exist
  await sequelize.authenticate();
});

// afterEach runs after every individual test
afterEach(async () => {
  // Clean up test data between tests
  // so tests don't affect each other
  await User.destroy({ where: {} });
});

// afterAll runs once after all tests finish
afterAll(async () => {
  // Close the database connection
  await sequelize.close();
});

// ── TEST DATA ─────────────────────────────────────────────────
const testSeller = {
  name: 'Test Seller',
  email: `seller${Date.now()}@test.com`,
  password: 'password123',
  role: 'seller',
};

const testBuyer = {
  name: 'Test Buyer',
  email: `buyer${Date.now()}@test.com`,
  password: 'password123',
  role: 'buyer',
};

// ── REGISTER TESTS ────────────────────────────────────────────
describe('POST /api/auth/register', () => {

  it('should register a new user and return 201', async () => {
    // request(app) creates a Supertest instance
    // .post('/api/auth/register') sets the method and URL
    // .send({...}) sets the request body
    // .expect(201) asserts the status code

    const res = await request(app)
      .post('/api/auth/register')
      .send(testSeller)
      .expect(201);

    // Also assert the response body shape
    expect(res.body.message).toBe('Registration successful');
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testSeller.email);
    expect(res.body.user.role).toBe('seller');

    // Password hash must NEVER be in the response
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it('should return 409 when email is already registered', async () => {
    // Register once
    await request(app)
      .post('/api/auth/register')
      .send(testSeller);

    // Register again with same email
    const res = await request(app)
      .post('/api/auth/register')
      .send(testSeller)
      .expect(409);

    expect(res.body.error).toBe('Email already registered');
  });

  it('should return 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@test.com' }) // missing name and password
      .expect(400);

    expect(res.body.error).toBeDefined();
  });

  it('should default role to buyer when no role provided', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Default User', email: `default${Date.now()}@test.com`, password: 'pass123' })
      .expect(201);

    expect(res.body.user.role).toBe('buyer');
  });

  it('should prevent role escalation — only buyer or seller allowed', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Admin Attempt',
        email: 'adminattempt@test.com', // unique email — no conflict
        password: 'password123',
        role: 'admin',
      })
      .expect(201);

    expect(res.body.user.role).not.toBe('admin');
  });
});

// ── LOGIN TESTS ───────────────────────────────────────────────
describe('POST /api/auth/login', () => {

  // Register a user before login tests
  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send(testSeller);
  });

  it('should return a JWT token on successful login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testSeller.email, password: testSeller.password })
      .expect(200);

    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe('string');

    // A JWT has exactly 3 parts separated by dots
    const parts = res.body.token.split('.');
    expect(parts).toHaveLength(3);
  });

  it('should return user info without password hash', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testSeller.email, password: testSeller.password })
      .expect(200);

    expect(res.body.user.email).toBe(testSeller.email);
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it('should return 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testSeller.email, password: 'wrongpassword' })
      .expect(401);

    expect(res.body.error).toBe('Invalid email or password');
  });

  it('should return 401 for non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'password123' })
      .expect(401);

    // Same error message — prevents user enumeration attack
    expect(res.body.error).toBe('Invalid email or password');
  });
});

// ── GET ME TESTS ──────────────────────────────────────────────
describe('GET /api/auth/me', () => {

  it('should return current user when valid token provided', async () => {
    // Register and login to get token
    await request(app).post('/api/auth/register').send(testBuyer);
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testBuyer.email, password: testBuyer.password });

    const token = loginRes.body.token;

    // Use token in Authorization header
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.user.email).toBe(testBuyer.email);
    expect(res.body.user.role).toBe('buyer');
  });

  it('should return 401 when no token provided', async () => {
    await request(app)
      .get('/api/auth/me')
      .expect(401);
  });

  it('should return 401 when token is invalid', async () => {
    await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer this.is.not.a.valid.token')
      .expect(401);
  });
});