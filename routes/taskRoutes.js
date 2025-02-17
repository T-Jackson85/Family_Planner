const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Helper for error handling
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);


// TASK ROUTES
router.get('/tasks', asyncHandler(async (req, res) => {
  const { eventId } = req.query;
  if (!eventId) return res.status(400).json({ error: "Event ID is required" });

  const tasks = await prisma.task.findMany({ where: { eventId: parseInt(eventId) } });
  res.json(tasks);
}));

  
  router.get('/tasks/:id', asyncHandler(async (req, res) => {
    const task = await prisma.task.findUnique({ where: { id: parseInt(req.params.id) } });
    res.json(task);
  }));
  
  router.post('/tasks', asyncHandler(async (req, res) => {
    const task = await prisma.task.create({ data: req.body });
    res.status(201).json(task);
  }));
  
  router.put('/tasks/:id', asyncHandler(async (req, res) => {
    const task = await prisma.task.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json(task);
  }));
  
  router.delete('/tasks/:id', asyncHandler(async (req, res) => {
    await prisma.task.delete({ where: { id: parseInt(req.params.id) } });
    res.status(204).send();
  }));

  router.put('/tasks/:id/status', asyncHandler(async (req, res) => {
    const { status } = req.body;
    const taskId = parseInt(req.params.id, 10);
  
    if (!["TODO", "INPROGRESS", "DONE"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
  
    try {
      const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: { status },
      });
  
      res.json(updatedTask);
    } catch (error) {
      console.error("Error updating task status:", error);
      res.status(500).json({ error: "Failed to update task status" });
    }
  }));
  

  module.exports = router;