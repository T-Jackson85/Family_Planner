const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authenticateToken = require('../../api/middleware/authenticateToken');

const router = express.Router();
const prisma = new PrismaClient();

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Route to update user profile
router.put(
  '/update',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { firstName, lastName, phone, location } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { firstName, lastName, phone, location },
    });

    res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  })
);

module.exports = router;

