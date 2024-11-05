// src/routes/userRoutes.ts

const { Router } = require("express");
const {
  registerUser,
  loginUser,
  updatedUser,
} = require("../controllers/userController");

const router = Router();

// router.post("/register", registerUser);
// router.post("/login", loginUser);
router.put("/users/:id", updatedUser);

export default router;
