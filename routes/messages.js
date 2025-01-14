const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authenticateToken = require('../api/middleware/authenticateToken');
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const prisma = new PrismaClient();
const router = express.Router();

// Send a message
router.post(
    '/messages',
    authenticateToken,
    asyncHandler(async (req, res) => {
      const { receiverId, content } = req.body;
      const senderId = req.user.id;
  
      if (!receiverId || !content) {
        return res.status(400).json({ error: 'Receiver and content are required.' });
      }
  
      const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
      if (!receiver) {
        return res.status(404).json({ error: 'Receiver not found.' });
      }
  
      const message = await prisma.message.create({
        data: {
          senderId,
          receiverId,
          content,
        },
      });
  
      // Emit real-time notification
      req.io.to(`user-${receiverId}`).emit('new-message', {
        senderId,
        content,
        createdAt: message.createdAt,
      });
  
      res.status(201).json(message);
    })
  );
  

// Get inbox messages
router.get(
  '/messages/inbox',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const messages = await prisma.message.findMany({
      where: { receiverId: userId },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(messages);
  })
);

// Get sent messages
router.get(
  '/messages/sent',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const messages = await prisma.message.findMany({
      where: { senderId: userId },
      include: {
        receiver: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(messages);
  })
);

module.exports = router;
