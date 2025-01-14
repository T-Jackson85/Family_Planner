const express = require('express');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const authenticateToken = require('../middleware/authenticateToken'); // Middleware to validate JWT

const prisma = new PrismaClient();
const router = express.Router();

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // Retrieve user ID from the decoded token (added by the middleware)
    const userId = req.user.id;

    // Fetch the user details from the database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        birthday: true,
        location: true,
        avatar: true,
        wallpaper: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || null,
      birthday: user.birthday || null,
      location: user.location || null,
      avatar: user.avatar || null,
      wallpaper: user.wallpaper || null,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Error fetching user info:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
