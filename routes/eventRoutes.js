const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Helper for error handling
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);


// EVENT ROUTES
router.get('/events', asyncHandler(async (req, res) => {
    const events = await prisma.event.findMany();
    res.json(events);
  }));
  
  router.get('/events/:id', asyncHandler(async (req, res) => {
    const event = await prisma.event.findUnique({ where: { id: parseInt(req.params.id) } });
    res.json(event);
  }));
  
  router.post('/events', asyncHandler(async (req, res) => {
    const event = await prisma.event.create({ data: req.body });
    res.status(201).json(event);
  }));
  
  router.put('/events/:id', asyncHandler(async (req, res) => {
    const event = await prisma.event.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json(event);
  }));
  
  router.delete('/events/:id', asyncHandler(async (req, res) => {
    await prisma.event.delete({ where: { id: parseInt(req.params.id) } });
    res.status(204).send();
  }));

  module.exports = router;
  