const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Helper for error handling
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);


// EXPENSE ROUTES
router.get('/expenses', asyncHandler(async (req, res) => {
  const { eventId } = req.query;
  if (!eventId) return res.status(400).json({ error: "Event ID is required" });

  const expenses = await prisma.expense.findMany({ where: { eventId: parseInt(eventId) } });
  res.json(expenses);
}));
  
  router.get('/expenses/:id', asyncHandler(async (req, res) => {
    const expense = await prisma.expense.findUnique({ where: { id: parseInt(req.params.id) } });
    res.json(expense);
  }));
  
  router.post('/expenses', asyncHandler(async (req, res) => {
    const expense = await prisma.expense.create({ data: req.body });
    res.status(201).json(expense);
  }));
  
  router.put('/expenses/:id', asyncHandler(async (req, res) => {
    const expense = await prisma.expense.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json(expense);
  }));
  
  router.delete('/expenses/:id', asyncHandler(async (req, res) => {
    await prisma.expense.delete({ where: { id: parseInt(req.params.id) } });
    res.status(204).send();
  }));

  module.exports = router;