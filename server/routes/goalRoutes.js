const express = require("express");
const router = express.Router();
const {
  createGoal,
  getGoals,
  updateGoal,
  deleteGoal,
  completeGoal,
  addException,
  removeException,
  completeOccurrence,
} = require("../controllers/goalController");
const { protect } = require("../middleware/authMiddleware");

router.post("/create", protect, createGoal);
router.get("/", protect, getGoals);
router.put("/:id", protect, updateGoal);
router.delete("/:id", protect, deleteGoal);
router.patch("/:id/complete", protect, completeGoal);
router.patch("/:id/incomplete", protect, require("../controllers/goalController").incompleteGoal);
router.post("/:id/exception", protect, addException);
router.delete("/:id/exception", protect, removeException);
router.post("/:id/complete-occurrence", protect, completeOccurrence);

module.exports = router;