const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const prisma = new PrismaClient();
const router = express.Router();

// JWT Secrets
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// Generate Access Token (short-lived)
const generateAccessToken = (user) => {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '15m' });
};

// Generate Refresh Token (long-lived)
const generateRefreshToken = (user) => {
  return jwt.sign(user, JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

// Helper for error handling
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Login an existing user
router.post(
  '/auth/login',
  [
    body('email').isEmail().withMessage('Enter a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find the user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Generate tokens
    const userPayload = { id: user.id, email: user.email };
    const accessToken = generateAccessToken(userPayload);
    const refreshToken = generateRefreshToken(userPayload);

    // Save refresh token in database
    await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id } });

    res.json({ message: 'Login successful', accessToken, refreshToken });
  })
);

// Refresh token endpoint
router.post(
  '/auth/refresh',
  asyncHandler(async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(401).json({ message: 'Refresh token is required' });

    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET);

      // Verify if the refresh token exists in the database
      const storedToken = await prisma.refreshToken.findUnique({ where: { token } });
      if (!storedToken) {
        return res.status(403).json({ message: 'Invalid refresh token' });
      }

      const userPayload = { id: decoded.id, email: decoded.email };
      const accessToken = generateAccessToken(userPayload);

      res.json({ accessToken });
    } catch (error) {
      res.status(403).json({ message: 'Invalid or expired refresh token' });
    }
  })
);

// Middleware to validate Access Token
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Example of a protected route
router.get(
  '/auth/protected',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    res.json({ message: 'Protected route accessed', user });
  })
);

module.exports = router;

