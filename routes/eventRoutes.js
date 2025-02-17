const express = require('express');
const { PrismaClient } = require('@prisma/client');
const dayjs = require('dayjs');
const authenticateToken = require('../api/middleware/authenticateToken');

const prisma = new PrismaClient();
const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/events', authenticateToken, async (req, res) => {
  try {
    const { date, month } = req.query;
    const userId = req.user.id;

    // Fetch the groups the user belongs to
    const userGroups = await prisma.group.findMany({
      where: { users: { some: { id: userId } } },
      select: { id: true, users: { select: { id: true } } },
    });

    const groupIds = userGroups.map((group) => group.id);
    const groupMemberIds = userGroups
      .flatMap((group) => group.users)
      .map((user) => user.id);

    // Construct the query's where clause
    let whereClause = {
      OR: [
        { hostId: userId }, // Events hosted by the user
        { groupId: { in: groupIds } }, // Events in the user's groups
        { hostId: { in: groupMemberIds } }, // Events hosted by group members
      ],
    };

    // Add date filtering
    if (date) {
      const startOfDay = dayjs(date).startOf('day').toDate();
      const endOfDay = dayjs(date).endOf('day').toDate();
      whereClause.date = { gte: startOfDay, lte: endOfDay };
    } else if (month) {
      const startOfMonth = dayjs().month(parseInt(month, 10) - 1).startOf('month').toDate();
      const endOfMonth = dayjs().month(parseInt(month, 10) - 1).endOf('month').toDate();
      whereClause.date = { gte: startOfMonth, lte: endOfMonth };
    }

    // Fetch events, tasks, and expenses
    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        group: { select: { name: true } }, // Include group name
        host: { select: { firstName: true, lastName: true } }, // Include host's name
        comments: {
          select: {
            content: true,
            createdAt: true,
            user: { select: { firstName: true } },
          },
        }, // Include comments
        tasks: true, // Include tasks
        expenses: true, // Include expenses
      },
    });

    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/events', authenticateToken, async (req, res) => {
  try {
    const { title, date, location, description, tasks, expenses } = req.body;
    const userId = req.user.id;

    // Fetch the user's group ID
    const userGroup = await prisma.group.findFirst({
      where: { users: { some: { id: userId } } }, // Relation with User model
    });

    if (!userGroup) {
      return res.status(400).json({ error: "User is not part of any group." });
    }

    const groupId = userGroup.id;

    // Create the event
    const event = await prisma.event.create({
      data: {
        title,
        date: new Date(date),
        location,
        description,
        hostId: userId,
        groupId, // Associate the event with the user's group
        tasks: {
          create: tasks.map((task) => ({
            title: task.title,
            status: task.status || "TODO",
            createdById: userId, // Task creator is the host
          })),
        },
        expenses: {
          create: expenses.map((expense) => ({
            description: expense.description,
            amount: expense.amount,
            paidById: userId, // Expense payer is the host
          })),
        },
      },
      include: {
        tasks: true,
        expenses: true,
        group: true, // Include group details in the response
      },
    });

    res.status(201).json(event);
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


router.put('/events/:id', authenticateToken, async (req, res) => {
  try {
    const { title, date, location, description, groupId, tasks, expenses } = req.body;
    const userId = req.user.id;
    const eventId = parseInt(req.params.id);

    // Update event details
    const event = await prisma.event.update({
      where: { id: eventId },
      data: {
        title,
        date: new Date(date),
        location,
        description,
        groupId: groupId || null,
      },
    });

    // Update tasks
    if (tasks) {
      await prisma.task.deleteMany({ where: { eventId } }); // Remove old tasks
      await prisma.task.createMany({
        data: tasks.map((task) => ({
          title: task.title,
          status: task.status || "TODO",
          createdById: userId,
          eventId,
        })),
      });
    }

    // Update expenses
    if (expenses) {
      await prisma.expense.deleteMany({ where: { eventId } }); // Remove old expenses
      await prisma.expense.createMany({
        data: expenses.map((expense) => ({
          description: expense.description,
          amount: expense.amount,
          paidById: userId,
          eventId,
        })),
      });
    }

    res.json({ message: 'Event updated successfully' });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete an event
 */
router.delete(
  '/events/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const eventId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    // Check if the event exists and belongs to the user
    const event = await prisma.event.findUnique({ where: { id: eventId } });

    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    if (event.hostId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this event.' });
    }

    // Delete related records manually
    await prisma.comment.deleteMany({ where: { eventId } });
    await prisma.task.deleteMany({ where: { eventId } });
    await prisma.expense.deleteMany({ where: { eventId } });

    // Delete the event
    await prisma.event.delete({ where: { id: eventId } });

    res.status(200).json({ message: 'Event deleted successfully.' });
  })
);


router.get('/events/mine', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Retrieve events where the logged-in user is the host
    const events = await prisma.event.findMany({
      where: {
        hostId: userId,
      },
      include: {
        tasks: true, // Include tasks for each event
        expenses: true, // Include expenses for each event
        group: true, // Optionally include associated group details
        comments: { include: { user: true } }, // Include comments with user details
      },
    });

    res.json(events);
  } catch (error) {
    console.error('Error fetching user events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// Add a comment to an event
router.post('/events/:id/comments', authenticateToken, async (req, res) => {
  const eventId = parseInt(req.params.id, 10);
  const userId = req.user.id;
  const { content } = req.body;

  if (!content || content.trim() === '') {
    return res.status(400).json({ error: 'Comment content is required.' });
  }

  try {
    // Check if the event exists
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    // Create the comment
    const comment = await prisma.comment.create({
      data: {
        content,
        userId,
        eventId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



module.exports = router;