const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authenticateToken = require('../api/middleware/authenticateToken');


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
        admins: {
          select: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
        users: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        requests: {
          where: { status: 'APPROVED' },
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
    const { name, invites } = req.body; // Group name and invited user emails
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ error: 'Group name is required.' });
    }

    // Step 1: Create a new group
    const group = await prisma.group.create({
      data: {
        name,
        admins: { create: { userId } }, // Add the current user as an admin
      },
    });

    // Step 2: Process and handle invitations
    if (invites && invites.length > 0) {
      for (const email of invites) {
        const invitedUser = await prisma.user.findUnique({ where: { email } });

        if (invitedUser) {
          // Create a pending group request for the invited user
          const groupRequest = await prisma.groupRequest.create({
            data: { userId: invitedUser.id, groupId: group.id },
          });

          // Emit real-time notification to the invited user via Socket.IO
          req.io.to(`user-${invitedUser.id}`).emit('groupInvite', {
            groupName: name,
            groupId: group.id,
            requestId: groupRequest.id,
            message: `You have been invited to join the group "${name}".`,
          });
        } else {
          console.warn(`No user found with email: ${email}`); // Log a warning for invalid emails
        }
      }
    }

    // Step 3: Respond with the created group details
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
router.put(
  '/groups/:id/join',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const groupId = parseInt(req.params.id, 10);
    const userId = req.user.id;
    const { status } = req.body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const groupRequest = await prisma.groupRequest.findFirst({
      where: {
        groupId,
        userId,
        status: 'PENDING',
      },
    });

    if (!groupRequest) {
      return res.status(404).json({ error: 'No pending invite found for this group.' });
    }

    if (status === 'APPROVED') {
      await prisma.groupRequest.update({
        where: { id: groupRequest.id },
        data: { status: 'APPROVED' },
      });

      await prisma.group.update({
        where: { id: groupId },
        data: {
          users: { connect: { id: userId } },
        },
      });

      return res.status(200).json({ message: 'Invite accepted and user added to the group.' });
    } else {
      await prisma.groupRequest.update({
        where: { id: groupRequest.id },
        data: { status: 'REJECTED' },
      });

      return res.status(200).json({ message: 'Invite rejected successfully.' });
    }
  })
);


/**
 * Update group request status
 */
router.put(
  "/groups/requests/:requestId/handle",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    const { status } = req.body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }

    const request = await prisma.groupRequest.update({
      where: { id: parseInt(requestId) },
      data: { status },
      include: { group: true, user: true },
    });

    if (status === "APPROVED") {
      // Add user to the group
      await prisma.group.update({
        where: { id: request.groupId },
        data: { users: { connect: { id: request.userId } } },
      });
    } else {
      // Notify the sender that the request was rejected
      await prisma.message.create({
        data: {
          senderId: request.userId,
          receiverId: request.group.admins[0].userId, // Assuming the first admin is the sender
          content: `Your invitation to ${request.user.firstName} ${request.user.lastName} was rejected.`,
        },
      });
    }

    res.json({ message: `Request ${status.toLowerCase()} successfully.` });
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

    // Check if the group exists
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    const createdInvites = [];
    for (const email of invites) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        // Create a pending group request for the invited user
        const invite = await prisma.groupRequest.create({
          data: { userId: user.id, groupId, status: 'PENDING' },
        });
        createdInvites.push(invite);

        // Emit real-time notification to the invited user via Socket.IO
        req.io.to(`user-${user.id}`).emit('group-invite', {
          message: `You have been invited to join the group "${group.name}".`,
          groupId: group.id,
          requestId: invite.id,
        });
      } else {
        console.warn(`No user found with email: ${email}`); // Log a warning for invalid emails
      }
    }

    // Respond with the created invites
    res.json({ message: 'Invites sent successfully.', invites: createdInvites });
  })
);
router.get(
  '/groups/search',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const groups = await prisma.group.findMany({
      where: {
        name: {
          contains: query, // Case-insensitive partial match
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    res.json(groups);
  })
);
router.get(
  '/groups/:id/members',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const groupId = parseInt(req.params.id);

    if (isNaN(groupId)) {
      return res.status(400).json({ error: 'Invalid group ID' });
    }

    // Query group and its users
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.json(group.users); // Return only the members
  })
);




module.exports = router;
