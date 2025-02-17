const express = require("express");
const multer = require("multer");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const authenticateToken = require("../api/middleware/authenticateToken");

const prisma = new PrismaClient();
const router = express.Router();

// Helper for error handling
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Multer Storage Configuration for Avatar Uploads
const storage = multer.diskStorage({
  destination: "./uploads/avatars/",
  filename: (req, file, cb) => {
    cb(null, `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

/**
 * ✅ USER ROUTES
 */

// Get all users
router.get("/users", asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
}));

// Get user by ID
router.get("/users/:id", asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: parseInt(req.params.id) },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatar: true,
      birthday: true,
      phone: true,
      location: true,
      groups: true,
    },
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json(user);
}));

// Get user by email
router.get("/users/email/:email", asyncHandler(async (req, res) => {
  const { email } = req.params;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json(user);
}));

// Create a new user
router.post("/users", asyncHandler(async (req, res) => {
  const user = await prisma.user.create({ data: req.body });
  res.status(201).json(user);
}));

// Update user details
router.put("/users/:id", asyncHandler(async (req, res) => {
  const user = await prisma.user.update({
    where: { id: parseInt(req.params.id) },
    data: req.body,
  });
  res.json(user);
}));

// Delete a user
router.delete("/users/:id", asyncHandler(async (req, res) => {
  await prisma.user.delete({ where: { id: parseInt(req.params.id) } });
  res.status(204).send();
}));

/**
 * ✅ Upload Profile Picture Route
 */
router.post("/users/upload-avatar", authenticateToken, upload.single("avatar"), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;

  await prisma.user.update({
    where: { id: userId },
    data: { avatar: avatarUrl },
  });

  res.json({ avatar: avatarUrl });
}));

module.exports = router;
