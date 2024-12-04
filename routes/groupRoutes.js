const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Helper for error handling
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);


// GROUP ROUTES
router.get('/groups', asyncHandler(async (req, res) => {
    const groups = await prisma.group.findMany();
    res.json(groups);
  }));
  
  router.get('/groups/:id', asyncHandler(async (req, res) => {
    const group = await prisma.group.findUnique({ where: { id: parseInt(req.params.id) } });
    res.json(group);
  }));
  
  router.post('/groups', asyncHandler(async (req, res) => {
    const group = await prisma.group.create({ data: req.body });
    res.status(201).json(group);
  }));
  
  router.put('/groups/:id', asyncHandler(async (req, res) => {
    const group = await prisma.group.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json(group);
  }));
  
  router.delete('/groups/:id', asyncHandler(async (req, res) => {
    await prisma.group.delete({ where: { id: parseInt(req.params.id) } });
    res.status(204).send();
  }));
  
  module.exports = router;