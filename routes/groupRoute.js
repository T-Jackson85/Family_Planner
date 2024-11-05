// src/routes/userRoutes.ts

const { Router } = require("express");
const {
  createGroup,
  updateGroup,
  deleteGroup,
  getGroup,
  getGroups,
} = require("../controllers/groupController");

const router = Router();

router.post("/creategroup", createGroup);
router.put("/updateGroup", updateGroup);
router.delete("/deleteGroup", deleteGroup);
router.get("/getGroup", getGroup);
router.get("/getGroups", getGroups);

export default router;
