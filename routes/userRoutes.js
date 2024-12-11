const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Helper for error handling
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// USER ROUTES
router.get('/users', asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
}));

router.get('/users/:id', asyncHandler(async (req, res) => {
  console.log(req.params.id);
  const user = await prisma.user.findUnique({ where: { id: parseInt(req.params.id) } });
  res.json(user);
}));

router.post('/users', asyncHandler(async (req, res) => {
  const user = await prisma.user.create({ data: req.body });
  res.status(201).json(user);
}));

router.put('/users/:id', asyncHandler(async (req, res) => {
  const user = await prisma.user.update({
    where: { id: parseInt(req.params.id) },
    data: req.body,
  });
  res.json(user);
}));

router.delete('/users/:id', asyncHandler(async (req, res) => {
  await prisma.user.delete({ where: { id: parseInt(req.params.id) } });
  res.status(204).send();
}));

module.exports = router;