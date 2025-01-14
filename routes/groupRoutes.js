const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authenticateToken = require('../api/middleware/authenticateToken');
const sendEmail = require('../api/auth/sendEmail'); // Utility for sending emails
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const prisma = new PrismaClient();
const router = express.Router();

/**
 * Get all groups
 */
router.get(
  '/groups',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const groups = await prisma.group.findMany({
      include: { admins: true, users: true },
    });
    res.json(groups);
  })
);

/**
 * Get group by ID
 */
router.get(
  '/groups/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const groupId = parseInt(req.params.id);

    if (isNaN(groupId)) {
      return res.status(400).json({ error: 'Invalid group ID' });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        admins: true,
        users: true,
        requests: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.json(group);
  })
);

/**
 * Create a new group
 */
router.post(
  '/groups',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { name, invites } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ error: 'Group name is required.' });
    }

    const group = await prisma.group.create({
      data: {
        name,
        admins: { create: { userId } },
      },
    });

    // Send invitations
    if (invites && invites.length > 0) {
      for (const email of invites) {
        const invitedUser = await prisma.user.findUnique({ where: { email } });
        if (invitedUser) {
          await prisma.groupRequest.create({
            data: { userId: invitedUser.id, groupId: group.id },
          });

          // Send email notification
          await sendEmail(
            email,
            `You have been invited to join the group "${name}"`,
            `Hello, you have been invited to join the group "${name}". Please log in to your account to accept the invitation.`
          );
        }
      }
    }

    res.status(201).json(group);
  })
);

/**
 * Get all pending requests for groups where the logged-in user is an admin
 */
router.get(
  '/groups/requests',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Fetch groups where the user is an admin
    const adminGroups = await prisma.group.findMany({
      where: { admins: { some: { userId } } },
      select: { id: true },
    });

    console.log('Admin Groups:', adminGroups);

    if (!adminGroups || adminGroups.length === 0) {
      return res.status(404).json({ error: 'No groups found for this admin.' });
    }

    const groupIds = adminGroups.map((group) => group.id);

    // Fetch pending requests for these groups
    const requests = await prisma.groupRequest.findMany({
      where: {
        groupId: { in: groupIds },
        status: 'PENDING',
      },
      include: {
        group: { select: { name: true } },
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    console.log('Requests:', requests);

    if (requests.length === 0) {
      return res.status(404).json({ error: 'No pending requests found for your groups.' });
    }

    res.status(200).json(requests);
  })
);



/**
 * Join a group
 */
router.post(
  '/groups/:id/join',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const groupId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    if (isNaN(groupId)) {
      return res.status(400).json({ error: 'Invalid group ID' });
    }

    const groupExists = await prisma.group.findUnique({ where: { id: groupId } });
    if (!groupExists) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const request = await prisma.groupRequest.create({
      data: { userId, groupId },
    });

    res.status(201).json(request);
  })
);

/**
 * Update group request status
 */
router.put(
  '/groups/:id/requests/:requestId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const requestId = parseInt(req.params.requestId, 10);
    const { status } = req.body;

    const request = await prisma.groupRequest.update({
      where: { id: requestId },
      data: { status },
    });

    if (status === 'APPROVED') {
      await prisma.group.update({
        where: { id: request.groupId },
        data: { users: { connect: { id: request.userId } } },
      });
    }

    res.json(request);
  })
);

/**
 * Fetch groups created by the logged-in user
 */
router.post(
  '/groups/mine',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const groups = await prisma.group.findMany({
      where: {
        admins: { some: { userId } },
      },
      include: {
        requests: {
          include: {
            user: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        },
        users: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!groups || groups.length === 0) {
      return res.status(404).json({ error: 'No groups found for the logged-in user.' });
    }

    const result = groups.map((group) => ({
      groupId: group.id,
      groupName: group.name,
      members: group.users,
      requests: group.requests.map((request) => ({
        firstName: request.user.firstName,
        lastName: request.user.lastName,
        email: request.user.email,
        status: request.status,
      })),
    }));

    res.json(result);
  })
);

/**
 * Invite additional members to a group
 */
router.post(
  '/groups/:id/invite',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const groupId = parseInt(req.params.id, 10);
    const { invites } = req.body;

    if (!Array.isArray(invites) || invites.length === 0) {
      return res.status(400).json({ error: 'No invites provided.' });
    }

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    const createdInvites = [];
    for (const email of invites) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        const invite = await prisma.groupRequest.create({
          data: { userId: user.id, groupId, status: 'PENDING' },
        });
        createdInvites.push(invite);

        // Send email notification
        await sendEmail(
          email,
          `Invitation to Join Group "${group.name}"`,
          `Hello, you have been invited to join the group "${group.name}". Please log in to accept the invitation.`
        );

        // Emit real-time notification
        req.io.to(`user-${user.id}`).emit('group-invite', {
          message: `You have been invited to join the group "${group.name}".`,
          groupId: group.id,
        });
      }
    }

    res.json({ message: 'Invites sent successfully.', invites: createdInvites });
  })
);


module.exports = router;
