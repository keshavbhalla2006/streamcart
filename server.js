const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');

// Apollo
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@as-integrations/express5');

// GraphQL
const typeDefs = require('./graphql/typeDefs');
const resolvers = require('./graphql/resolvers');

// Models
const { sequelize } = require('./models/index');

dotenv.config();

const app = express();
const server = http.createServer(app);

// ── SOCKET.IO ────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Pass io to socket handler
require('./sockets/streamSocket')(io);

// Make io available in routes/resolvers
app.set('io', io);

// ── MIDDLEWARE ───────────────────────────────────────────────
app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

// ── REST ROUTES ──────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/streams', require('./routes/streams'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));

app.get('/api/ping', (req, res) => {
  res.json({
    message: 'StreamCart alive!',
    timestamp: new Date(),
  });
});

// ── APOLLO GRAPHQL ───────────────────────────────────────────
async function startApollo() {

  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await apolloServer.start();

  app.use(
    '/graphql',
    expressMiddleware(apolloServer, {

      // Runs on every GraphQL request
      context: async ({ req }) => {

        let user = null;

        const authHeader = req.headers.authorization || '';

        if (authHeader.startsWith('Bearer ')) {

          const token = authHeader.split(' ')[1];

          try {
            user = jwt.verify(token, process.env.JWT_SECRET);
          } catch (err) {
            user = null;
          }
        }

        return {
          user,
          io,
        };
      },
    })
  );

  // ── ERROR HANDLER ──────────────────────────────────────────
  app.use(require('./middleware/errorHandler'));

  // ── START SERVER ───────────────────────────────────────────
  const PORT = process.env.PORT || 5000;

  sequelize.authenticate()
    .then(() => {

      console.log('MySQL connected');

      server.listen(PORT, () => {

        console.log(`StreamCart running on http://localhost:${PORT}`);

        console.log(`GraphQL playground: http://localhost:${PORT}/graphql`);
      });

    })
    .catch(err => console.error('DB connection failed:', err));
}

// Start Apollo
startApollo();