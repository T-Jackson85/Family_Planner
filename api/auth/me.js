const express = require("express");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const authenticateToken = require("../middleware/authenticateToken"); // Middleware to validate JWT
require("dotenv").config();

const prisma = new PrismaClient();
const router = express.Router();

// Function to generate a new access token
const generateAccessToken = (user) => {
  return jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "15m" });
};

// Function to validate and refresh tokens
router.post("/auth/refresh", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token is missing" });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Fetch the user from the database
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate a new access token
    const accessToken = generateAccessToken({ id: user.id, email: user.email });
    res.json({ accessToken });
  } catch (err) {
    console.error("Error verifying refresh token:", err);
    res.status(403).json({ error: "Invalid refresh token" });
  }
});

// GET /api/auth/me - Fetch user info
router.get("/me", authenticateToken, async (req, res) => {
  try {
    // Retrieve user ID from the decoded token (added by the middleware)
    const userId = req.user.id;

    // Fetch the user details from the database, including group IDs
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
        groups: {
          select: {
            id: true, // Include group IDs
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
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
      groupIds: user.groups.map((group) => group.id), // Return an array of group IDs
    });
  } catch (error) {
    console.error("Error fetching user info:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
