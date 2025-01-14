const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const dayjs = require('dayjs'); // Import Day.js for date formatting

const prisma = new PrismaClient();
const router = express.Router();

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'SECRET';

// Helper for error handling
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Register a new user
router.post(
  '/auth/register',
  [
    body('email').isEmail().withMessage('Enter a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('birthday').optional().isISO8601().withMessage('Invalid birthday format'),
    body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
    body('location').optional().isString().withMessage('Invalid location format'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      birthday,
      location,
      avatar,
      wallpaper,
    } = req.body;

    // Check if the email is already registered
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      // Format the birthday using Day.js
      const formattedBirthday = birthday ? dayjs(birthday).toISOString() : null;

      // Create a new user
      const user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email,
          password: hashedPassword,
          phone: phone || null,
          birthday: formattedBirthday,
          location: location || null,
          avatar: avatar || null,
          wallpaper: wallpaper || null,
        },
      });

      // Generate JWT token
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          birthday: user.birthday,
          location: user.location,
          avatar: user.avatar,
          wallpaper: user.wallpaper,
        },
        token,
      });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ message: 'Database error', error });
    }
  })
);

module.exports = router;

