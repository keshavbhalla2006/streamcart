const { Stream, ChatMessage, Product, Order } = require('../models/index');
const jwt = require('jsonwebtoken');
const sequelize = require('../config/sequelize');

module.exports = (io) => {

  // ── AUTH MIDDLEWARE FOR SOCKETS ──────────────────────────
  // HTTP routes use authMiddleware.js
  // Sockets have their own middleware — runs before 'connection'
  // Client must send token in the handshake: socket = io(url, { auth: { token } })

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      // Allow unauthenticated connections — viewers can watch without login
      socket.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: decoded.id, role: decoded.role, name: decoded.name };
      next();
    } catch (err) {
      // Invalid token — still allow connection as guest
      socket.user = null;
      next();
    }
  });

  // ── CONNECTION ───────────────────────────────────────────
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} | User: ${socket.user?.name || 'guest'}`);

    // ── JOIN STREAM ROOM ─────────────────────────────────
    // Client emits this when they open a stream page
    // socket.emit('join-stream', { streamId: 5 })
    socket.on('join-stream', async ({ streamId }) => {
      if (!streamId) return;

      const roomName = `stream-${streamId}`;

      // Leave any previous stream room first (user navigates between streams)
      const currentRooms = Array.from(socket.rooms).filter(r => r.startsWith('stream-'));
      for (const room of currentRooms) {
        socket.leave(room);
      }

      socket.join(roomName);
      socket.currentStream = streamId; // store on socket for later use

      // Update viewer count — count sockets in this room
      const roomSockets = await io.in(roomName).fetchSockets();
      const viewerCount = roomSockets.length;

      // Broadcast new viewer count to everyone in the room
      io.to(roomName).emit('viewer-count', { streamId, count: viewerCount });

      // Send last 50 chat messages to the newly joined viewer
      const recentMessages = await ChatMessage.findAll({
        where:   { stream_id: streamId },
        include: [{ model: require('../models/User'), as: 'user', attributes: ['id', 'name'] }],
        order:   [['createdAt', 'ASC']],
        limit:   50,
      });

      socket.emit('chat-history', { messages: recentMessages });

      console.log(`${socket.user?.name || 'guest'} joined stream-${streamId} | viewers: ${viewerCount}`);
    });

    // ── LEAVE STREAM ROOM ────────────────────────────────
    socket.on('leave-stream', async ({ streamId }) => {
      const roomName = `stream-${streamId}`;
      socket.leave(roomName);

      const roomSockets = await io.in(roomName).fetchSockets();
      io.to(roomName).emit('viewer-count', { streamId, count: roomSockets.length });
    });

    // ── SEND CHAT MESSAGE ────────────────────────────────
    // Client: socket.emit('send-message', { streamId, message })
    socket.on('send-message', async ({ streamId, message }) => {
      // Must be logged in to chat
      if (!socket.user) {
        return socket.emit('error', { message: 'Login to send messages' });
      }

      if (!message || message.trim().length === 0) return;
      if (message.length > 300) {
        return socket.emit('error', { message: 'Message too long (max 300 chars)' });
      }

      try {
        // Save to DB — chat history persists even after stream ends
        const saved = await ChatMessage.create({
          message:   message.trim(),
          stream_id: streamId,
          user_id:   socket.user.id,
        });

        // Broadcast to EVERYONE in the room (including sender)
        io.to(`stream-${streamId}`).emit('new-message', {
          id:        saved.id,
          message:   saved.message,
          user:      { id: socket.user.id, name: socket.user.name },
          createdAt: saved.createdAt,
        });

      } catch (err) {
        console.error('Chat save error:', err);
        socket.emit('error', { message: 'Could not send message' });
      }
    });

    // ── START FLASH DEAL ─────────────────────────────────
    // Seller triggers this from the dashboard
    // Client: socket.emit('start-flash-deal', { streamId, productId, flashPrice, durationSeconds })
    socket.on('start-flash-deal', async ({ streamId, productId, flashPrice, durationSeconds }) => {
      if (!socket.user || socket.user.role !== 'seller') {
        return socket.emit('error', { message: 'Only sellers can start flash deals' });
      }

      try {
        const flashEndsAt = new Date(Date.now() + durationSeconds * 1000);

        // Update product in DB
        await Product.update(
          { is_flash_deal: true, flash_price: flashPrice, flash_ends_at: flashEndsAt },
          { where: { id: productId } }
        );

        // Broadcast flash deal to ALL viewers in the room
        // They'll see the countdown start simultaneously
        io.to(`stream-${streamId}`).emit('flash-deal-started', {
          productId,
          flashPrice,
          endsAt:          flashEndsAt,
          durationSeconds,
        });

        // Auto-end the flash deal when time expires
        setTimeout(async () => {
          await Product.update(
            { is_flash_deal: false, flash_price: null, flash_ends_at: null },
            { where: { id: productId } }
          );

          io.to(`stream-${streamId}`).emit('flash-deal-ended', { productId });
        }, durationSeconds * 1000);

      } catch (err) {
        console.error('Flash deal error:', err);
        socket.emit('error', { message: 'Could not start flash deal' });
      }
    });

    // ── GO LIVE / END STREAM ─────────────────────────────
    // Seller controls stream status from dashboard
    socket.on('go-live', async ({ streamId }) => {
      if (!socket.user || socket.user.role !== 'seller') return;

      try {
        await Stream.update({ status: 'live' }, { where: { id: streamId } });
        io.to(`stream-${streamId}`).emit('stream-status', { status: 'live', streamId });
        console.log(`Stream ${streamId} is now LIVE`);
      } catch (err) {
        socket.emit('error', { message: 'Could not go live' });
      }
    });

    socket.on('end-stream', async ({ streamId }) => {
      if (!socket.user || socket.user.role !== 'seller') return;

      try {
        await Stream.update({ status: 'ended' }, { where: { id: streamId } });
        io.to(`stream-${streamId}`).emit('stream-status', { status: 'ended', streamId });
        console.log(`Stream ${streamId} has ended`);
      } catch (err) {
        socket.emit('error', { message: 'Could not end stream' });
      }
    });

    // ── INVENTORY UPDATE BROADCAST ───────────────────────
    // Called internally after an order is placed (from orders route)
    // Not emitted by client — only by server
    socket.on('request-inventory', async ({ streamId }) => {
      try {
        const products = await Product.findAll({ where: { stream_id: streamId } });
        socket.emit('inventory-snapshot', { products });
      } catch (err) {
        socket.emit('error', { message: 'Could not fetch inventory' });
      }
    });

    // ── DISCONNECT ───────────────────────────────────────
    socket.on('disconnect', async () => {
      if (socket.currentStream) {
        const roomName  = `stream-${socket.currentStream}`;
        const sockets   = await io.in(roomName).fetchSockets();
        io.to(roomName).emit('viewer-count', {
          streamId: socket.currentStream,
          count:    sockets.length,
        });
      }
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};