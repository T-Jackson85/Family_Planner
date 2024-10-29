require('dotenv').config();
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bodyParser = require('body-parser');

const prisma = new PrismaClient();
const app = express();

app.use(bodyParser.json());
const PORT = process.env.PORT || 3000;

// User Routes
app.post('/users', async (req, res) => {
    const { email, password, firstName, lastName } = req.body;
    console.log(email, password, firstName, lastName)
    const newUser = await prisma.user.create({
        data: {
            email, password, firstName, lastName,
        },
    });
    res.json(newUser);
});

app.get('/users/:id', async (req, res) => {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
        where: { id: parseInt(id) },
        include: { tasks: true, groups: true, notifications: true },
    });
    res.json(user);
});

// Update User
app.put('/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, phone } = req.body;
    const updatedUser = await prisma.user.update({
        where: { id: parseInt(id) },
        data: { name, phone },
    });
    res.json(updatedUser);
});

// Delete User
app.delete('/users/:id', async (req, res) => {
    const { id } = req.params;
    await prisma.user.delete({
        where: { id: parseInt(id) },
    });
    res.json({ message: 'User deleted' });
});


// Group Routes
app.post('/groups', async (req, res) => {
    const { name, adminId } = req.body;
    const newGroup = await prisma.group.create({
        data: { name, admin: { connect: { id: adminId } } },
    });
    res.json(newGroup);
});

app.get('/groups/:id', async (req, res) => {
    const { id } = req.params;
    const group = await prisma.group.findUnique({
        where: { id: parseInt(id) },
        include: { users: true, events: true },
    });
    res.json(group);
});

// Event Routes
app.post('/events', async (req, res) => {
    const { title, date, location, hostId, groupId } = req.body;
    const newEvent = await prisma.event.create({
        data: {
            title, date: new Date(date), location,
            host: { connect: { id: hostId } },
            group: { connect: { id: groupId } },
        },
    });
    res.json(newEvent);
});

// Read Event
app.get('/events/:id', async (req, res) => {
    const { id } = req.params;
    const event = await prisma.event.findUnique({
        where: { id: parseInt(id) },
        include: { comments: true, host: true, group: true },
    });
    res.json(event);
});

// Update Event
app.put('/events/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, date, location } = req.body;
    const updatedEvent = await prisma.event.update({
        where: { id: parseInt(id) },
        data: {
            title,
            description,
            date: new Date(date),
            location,
        },
    });
    res.json(updatedEvent);
});

// Delete Event
app.delete('/events/:id', async (req, res) => {
    const { id } = req.params;
    await prisma.event.delete({
        where: { id: parseInt(id) },
    });
    res.json({ message: 'Event deleted' });
});

// Task Routes
app.post('/tasks', async (req, res) => {
    const { title, userId, eventId } = req.body;
    const newTask = await prisma.task.create({
        data: { title, user: { connect: { id: userId } }, event: { connect: { id: eventId } } },
    });
    res.json(newTask);
});
// Read Tasks for a User
app.get('/tasks/:userId', async (req, res) => {
    const { userId } = req.params;
    const tasks = await prisma.task.findMany({
        where: { userId: parseInt(userId) },
    });
    res.json(tasks);
});

// Update Task (mark as completed)
app.put('/tasks/:id', async (req, res) => {
    const { id } = req.params;
    const { isCompleted } = req.body;
    const updatedTask = await prisma.task.update({
        where: { id: parseInt(id) },
        data: { isCompleted },
    });
    res.json(updatedTask);
});

// Delete Task
app.delete('/tasks/:id', async (req, res) => {
    const { id } = req.params;
    await prisma.task.delete({
        where: { id: parseInt(id) },
    });
    res.json({ message: 'Task deleted' });
});

// Expense Routes
app.post('/expenses', async (req, res) => {
    const { amount, description, userId, eventId } = req.body;
    const newExpense = await prisma.expense.create({
        data: { amount, description, user: { connect: { id: userId } }, event: { connect: { id: eventId } } },
    });
    res.json(newExpense);
});
// Add Expense to Event
app.post('/events/:eventId/expenses', async (req, res) => {
    const { eventId } = req.params;
    const { description, amount } = req.body;
    try {
      const expense = await prisma.expense.create({
        data: {
          description,
          amount,
          eventId: parseInt(eventId),
        },
      });
      res.json(expense);
    } catch (e) {
      res.status(500).json({ error: 'Error adding expense' });
    }
  });
  
  // Update Expense (Check Off)
  app.patch('/expenses/:id/check', async (req, res) => {
    const { id } = req.params;
    try {
      const expense = await prisma.expense.update({
        where: { id: parseInt(id) },
        data: { checkedOff: true },
      });
      res.json(expense);
    } catch (e) {
      res.status(500).json({ error: 'Error checking off expense' });
    }
  });
  
  // Create Balance for a User in an Event
  app.post('/events/:eventId/balances', async (req, res) => {
    const { eventId } = req.params;
    const { userId, amount } = req.body;
    try {
      const balance = await prisma.balance.create({
        data: {
          userId: parseInt(userId),
          eventId: parseInt(eventId),
          amount,
        },
      });
      res.json(balance);
    } catch (e) {
      res.status(500).json({ error: 'Error creating balance' });
    }
  });
  
  // Get Event Details with Expenses and Balances
  app.get('/events/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const event = await prisma.event.findUnique({
        where: { id: parseInt(id) },
        include: {
          expenses: true,
          balances: true,
          attendees: true,
          host: true,
        },
      });
      res.json(event);
    } catch (e) {
      res.status(500).json({ error: 'Error fetching event details' });
    }
});
app.listen(PORT, () => {
    console.log('Server running on port 3000');
});
