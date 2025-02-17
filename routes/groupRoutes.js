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

    // Check if the user already belongs to a group
    const existingGroup = await prisma.group.findFirst({
      where: { users: { some: { id: userId } } },
    });

    if (existingGroup) {
      return res.status(400).json({ error: 'You already belong to a group.' });
    }

    // Create the new group
    const group = await prisma.group.create({
      data: {
        name,
        admins: { create: { userId } }, // Add the user as an admin
        users: { connect: { id: userId } }, // Connect the user to the group
      },
    });

    // Handle invitations if provided
    if (invites && invites.length > 0) {
      for (const email of invites) {
        const invitedUser = await prisma.user.findUnique({ where: { email } });
        if (invitedUser) {
          await prisma.groupRequest.create({
            data: { userId: invitedUser.id, groupId: group.id },
          });

          // Emit a notification via Socket.IO
          req.io.to(`user-${invitedUser.id}`).emit('groupInvite', {
            groupName: name,
            groupId: group.id,
            message: `You have been invited to join the group "${name}".`,
          });
        }
      }
    }

    res.status(201).json({ groupId: group.id, name: group.name });
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

router.post(
  '/groups/:groupId/requests',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    const { userId } = req.body; // userId sent in the request

    const parsedGroupId = parseInt(groupId, 10);

    // Validate groupId
    if (isNaN(parsedGroupId)) {
      return res.status(400).json({ error: 'Invalid group ID.' });
    }

    // Check if the group exists
    const group = await prisma.group.findUnique({ where: { id: parsedGroupId } });
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    // Check for existing pending request
    const existingRequest = await prisma.groupRequest.findFirst({
      where: { userId, groupId: parsedGroupId, status: 'PENDING' },
    });

    if (existingRequest) {
      return res.status(400).json({ error: 'You already have a pending request for this group.' });
    }

    // Create a new group request
    const groupRequest = await prisma.groupRequest.create({
      data: {
        userId,
        groupId: parsedGroupId,
      },
    });

    // Notify group admins
    const admins = await prisma.user.findMany({
      where: {
        groupAdmins: {
          some: { id: parsedGroupId },
        },
      },
    });

    const io = req.app.get('io'); // Ensure you’ve set `io` in your Express app
    admins.forEach((admin) => {
      io.to(admin.id.toString()).emit('new-join-request', {
        groupId: parsedGroupId,
        userId,
        groupName: group.name,
      });
    });

    res.status(201).json(groupRequest);
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

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    // Check if the user already belongs to a group
    const existingGroup = await prisma.group.findFirst({
      where: { users: { some: { id: userId } } },
    });

    if (existingGroup) {
      return res.status(400).json({
        error: 'You already belong to a group and cannot join another.',
      });
    }

    // Validate the group
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    // Validate the pending invite
    const groupRequest = await prisma.groupRequest.findFirst({
      where: { userId, groupId, status: 'PENDING' },
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

      res.status(200).json({ message: 'Invite accepted and user added to the group.' });
    } else {
      await prisma.groupRequest.update({
        where: { id: groupRequest.id },
        data: { status: 'REJECTED' },
      });

      res.status(200).json({ message: 'Invite rejected successfully.' });
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

    // Fetch all groups created by the logged-in user
    const groups = await prisma.group.findMany({
      where: {
        admins: {
          some: { userId },
        },
      },
      include: {
        admins: {
          select: { user: { select: { firstName: true, lastName: true, email: true } } },
        },
        users: {
          select: { firstName: true, lastName: true, email: true },
        },
        requests: {
          include: {
            user: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });

    res.json(
      groups.map((group) => ({
        groupId: group.id,
        groupName: group.name,
        members: group.users.map((user) => ({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        })),
        requests: group.requests.map((request) => ({
          firstName: request.user.firstName,
          lastName: request.user.lastName,
          email: request.user.email,
          status: request.status,
        })),
      }))
    );
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

    // Validate the group
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    const createdInvites = [];
    for (const email of invites) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        // Check if the user already belongs to a group
        const existingGroup = await prisma.group.findFirst({
          where: { users: { some: { id: user.id } } },
        });

        if (existingGroup) {
          continue; // Skip inviting users already in a group
        }

        const invite = await prisma.groupRequest.create({
          data: { userId: user.id, groupId, status: 'PENDING' },
        });
        createdInvites.push(invite);

        // Emit notification via Socket.IO
        req.io.to(`user-${user.id}`).emit('group-invite', {
          message: `You have been invited to join the group "${group.name}".`,
          groupId: group.id,
          requestId: invite.id,
        });
      }
    }

    res.json({ message: 'Invites sent successfully.', invites: createdInvites });
  })
);

router.get(
  "/groups/search",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ error: "Search query is required" });
    }

    // Split the query into words for flexible matching
    const words = query.split(" ").filter((word) => word.trim().length > 0);

    if (words.length === 0) {
      return res.status(400).json({ error: "Invalid search query." });
    }

    // Build a logical OR condition to match the first and second words
    const conditions = words.slice(0, 2).map((word) => ({
      name: {
        startsWith: word,
        mode: "insensitive", // Case-insensitive matching
      },
    }));

    try {
      const groups = await prisma.group.findMany({
        where: {
          OR: conditions,
        },
        select: {
          id: true,
          name: true,
          admins: {
            select: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      const formattedGroups = groups.map((group) => ({
        id: group.id,
        name: group.name,
        admins: group.admins.map((admin) => admin.user),
      }));

      res.json(formattedGroups);
    } catch (error) {
      console.error("Error searching groups:", error);
      res.status(500).json({ error: "An error occurred while searching for groups." });
    }
  })
);

router.get(
  "/groups/:id/search",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
      const group = await prisma.group.findUnique({
        where: { id: parseInt(id, 10) },
        include: {
          admins: {
            select: {
              user: {
                select: { firstName: true, lastName: true, email: true },
              },
            },
          },
        },
      });

      if (!group) {
        return res.status(404).json({ error: "Group not found." });
      }

      const formattedGroup = {
        id: group.id,
        name: group.name,
        admins: group.admins.map((admin) => admin.user),
      };

      res.json(formattedGroup);
    } catch (error) {
      console.error("Error fetching group details:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  })
);


/**
 * Retrieve users, events, tasks, and expenses with the same group ID
 */
router.get(
  "/groups/:groupId/details",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const groupId = parseInt(req.params.groupId, 10);

    if (isNaN(groupId)) {
      return res.status(400).json({ error: "Invalid group ID." });
    }

    try {
      // Fetch group details including users (excluding the logged-in user), events, tasks, and expenses
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: {
          users: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
              location: true,
              groups: true
            },
          },
          events: {
            select: {
              id: true,
              title: true,
              date: true,
              location: true,
              description: true,
              tasks: {
                select: {
                  id: true,
                  title: true,
                  status: true,
                  createdById: true,
                  assignedToId: true,
                },
              },
              expenses: {
                select: {
                  id: true,
                  amount: true,
                  description: true,
                  paid: true,
                  paidById: true,
                },
              },
            },
          },
        },
      });

      if (!group) {
        return res.status(404).json({ error: "Group not found." });
      }

      // Exclude the logged-in user from the group users
      const otherUsers = group.users.filter((user) => user.id !== req.user.id);

      res.status(200).json({
        groupId: group.id,
        groupName: group.name,
        otherUsers, // Filtered users excluding the logged-in user
        events: group.events, // Events with nested tasks and expenses
      });
    } catch (error) {
      console.error("Error fetching group details:", error);
      res.status(500).json({ error: "Failed to retrieve group details." });
    }
  })
);
router.delete(
  "/groups/:groupId",
  authenticateToken,
  async (req, res) => {
    const { groupId } = req.params;
    const userId = req.user.id;

    try {
      const parsedGroupId = parseInt(groupId, 10);

      // Check if the user is an admin of the group
      const group = await prisma.group.findFirst({
        where: {
          id: parsedGroupId,
          admins: { some: { userId } },
        },
      });

      if (!group) {
        return res.status(403).json({ error: "You are not authorized to delete this group." });
      }

      // Step 1: Delete related records in the correct order
      await prisma.comment.deleteMany({
        where: { eventId: { in: (await prisma.event.findMany({ where: { groupId: parsedGroupId }, select: { id: true } })).map(event => event.id) } }
      });

      await prisma.task.deleteMany({
        where: { eventId: { in: (await prisma.event.findMany({ where: { groupId: parsedGroupId }, select: { id: true } })).map(event => event.id) } }
      });

      await prisma.expense.deleteMany({
        where: { eventId: { in: (await prisma.event.findMany({ where: { groupId: parsedGroupId }, select: { id: true } })).map(event => event.id) } }
      });

      await prisma.event.deleteMany({
        where: { groupId: parsedGroupId },
      });

      await prisma.message.deleteMany({
        where: { groupId: parsedGroupId },
      });

      await prisma.groupRequest.deleteMany({
        where: { groupId: parsedGroupId },
      });

      // Step 2: Delete the group itself
      await prisma.group.delete({
        where: { id: parsedGroupId },
      });

      res.json({ message: "Group deleted successfully." });
    } catch (error) {
      console.error("Error deleting group:", error);
      res.status(500).json({ error: "Failed to delete group." });
    }
  }
);

router.put(
  "/groups/:groupId/leave",
  authenticateToken,
  async (req, res) => {
    const { groupId } = req.params;
    const userId = req.user.id;

    try {
      const group = await prisma.group.findUnique({
        where: { id: parseInt(groupId, 10) },
        include: { users: true },
      });

      if (!group) {
        return res.status(404).json({ error: "Group not found." });
      }

      // Check if the user is in the group
      const isMember = group.users.some((user) => user.id === userId);
      if (!isMember) {
        return res.status(403).json({ error: "You are not a member of this group." });
      }

      // Remove the user from the group
      await prisma.group.update({
        where: { id: parseInt(groupId, 10) },
        data: {
          users: {
            disconnect: { id: userId },
          },
        },
      });

      res.status(200).json({ message: "You have left the group." });
    } catch (error) {
      console.error("Error leaving group:", error);
      res.status(500).json({ error: "Failed to leave group." });
    }
  }
);



module.exports = router;