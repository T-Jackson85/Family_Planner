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

router.put(
    '/messages/:messageId/handle-invite',
    authenticateToken,
    asyncHandler(async (req, res) => {
      const { messageId } = req.params;
      const { status } = req.body;
  
      if (!['APPROVED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status.' });
      }
  
      // Find the original message
      const message = await prisma.message.findUnique({
        where: { id: parseInt(messageId, 10) },
        include: {
          sender: true, // Include sender info to send a notification
        },
      });
  
      if (!message) {
        return res.status(404).json({ error: 'Message not found.' });
      }
  
      const groupNameMatch = message.content.match(/group: (.+)/i);
      const groupName = groupNameMatch ? groupNameMatch[1] : null;
  
      if (!groupName) {
        return res.status(400).json({ error: 'Group name not found in the message.' });
      }
  
      const group = await prisma.group.findUnique({ where: { name: groupName } });
  
      if (!group) {
        return res.status(404).json({ error: 'Group not found.' });
      }
  
      if (status === 'APPROVED') {
        // Add user to the group
        await prisma.group.update({
          where: { id: group.id },
          data: { users: { connect: { id: message.receiverId } } },
        });
  
        // Notify the sender
        await prisma.message.create({
          data: {
            senderId: message.receiverId,
            receiverId: message.senderId,
            content: `${message.sender.firstName} has accepted your invitation to join "${group.name}".`,
          },
        });
      } else {
        // Notify the sender of rejection
        await prisma.message.create({
          data: {
            senderId: message.receiverId,
            receiverId: message.senderId,
            content: `${message.sender.firstName} has rejected your invitation to join "${group.name}".`,
          },
        });
      }
  
      res.json({ message: `Invite ${status.toLowerCase()} successfully.` });
    })
  );
  

module.exports = router;
