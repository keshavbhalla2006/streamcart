import express, { Application, Request } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import jwt from 'jsonwebtoken';

import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';

import { IJwtPayload } from './types/index';
import { errorHandler } from './middleware/errorHandler';
import authRouter from './routes/auth';

// JS files that aren't migrated yet
const typeDefs = require('../graphql/typeDefs');
const resolvers = require('../graphql/resolvers');
const streamSocketHandler = require('../sockets/streamSocket');

dotenv.config();

const app: Application = express();
const server: http.Server = http.createServer(app);

// ───────────────── SOCKET.IO ─────────────────
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

streamSocketHandler(io);

app.set('io', io);

// ───────────────── MIDDLEWARE ─────────────────
app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(express.static(path.join(__dirname, '../public')));

// ───────────────── REST ROUTES ─────────────────
app.use('/api/auth', authRouter);

app.use(
  '/api/streams',
  require('../routes/streams')
);

app.use(
  '/api/products',
  require('../routes/products')
);

app.use(
  '/api/orders',
  require('../routes/orders')
);

app.get('/api/ping', (_, res) => {
  res.json({
    message: 'StreamCart alive!',
  });
});

// ───────────────── GRAPHQL SERVER ─────────────────
async function startServer(): Promise<void> {
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await apolloServer.start();

  app.use(
    '/graphql',
    expressMiddleware(apolloServer, {
      context: async ({
        req,
      }: {
        req: Request;
      }): Promise<{
        user: IJwtPayload | null;
        io: Server;
      }> => {
        let user: IJwtPayload | null = null;

        const authHeader = req.headers.authorization ?? '';

        if (authHeader.startsWith('Bearer ')) {
          const token = authHeader.split(' ')[1];

          try {
            const decoded = jwt.verify(
              token,
              process.env.JWT_SECRET as string
            );

            if (typeof decoded !== 'string') {
              user = decoded as IJwtPayload;
            }
          } catch {
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

  // Global error handler
  app.use(errorHandler);

  // DB connection
  const { sequelize } = require('../models/index');

  const PORT = parseInt(
    process.env.PORT ?? '5000',
    10
  );

  try {
    await sequelize.authenticate();

    console.log('✅ MySQL connected');

    server.listen(PORT, () => {
      console.log(
        `🚀 StreamCart (TypeScript) running on http://localhost:${PORT}`
      );

      console.log(
        `📦 GraphQL: http://localhost:${PORT}/graphql`
      );
    });
  } catch (err) {
    console.error('❌ DB connection failed:', err);

    return process.exit(1);
  }
}

startServer();