const express = require('express');
const { PrismaClient } = require('@prisma/client');
const dayjs = require('dayjs');
const authenticateToken = require('../api/middleware/authenticateToken');

const prisma = new PrismaClient();
const router = express.Router();



router.get('/events', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date parameter is required.' });

    const userId = req.user.id;

    const startOfDay = dayjs(date).startOf('day').toDate();
    const endOfDay = dayjs(date).endOf('day').toDate();

    const events = await prisma.event.findMany({
      where: {
        OR: [
          { hostId: userId }, // Events created by the user
          {
            group: {
              users: {
                some: { id: userId }, // Events from groups the user is a member of
              },
            },
          },
        ],
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        comments: { include: { user: true } }, // Include comments with user details
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
    const { title, date, location, description, groupId, tasks, expenses } = req.body;
    const userId = req.user.id;

    const event = await prisma.event.create({
      data: {
        title,
        date: new Date(date),
        location,
        description,
        hostId: userId,
        groupId: groupId || null,
        tasks: {
          create: tasks.map((task) => ({
            title: task.title,
            status: task.status || "TODO", // Default to TODO
            createdById: userId, // Set creator
          })),
        },
        expenses: {
          create: expenses.map((expense) => ({
            description: expense.description,
            amount: expense.amount,
            paidById: userId, // Set payer
          })),
        },
      },
      include: {
        tasks: true,
        expenses: true,
      },
    });

    res.status(201).json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Internal server error' });
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

