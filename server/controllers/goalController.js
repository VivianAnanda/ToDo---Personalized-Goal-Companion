// Mark a one-time goal as incomplete
const incompleteGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const goal = await Goal.findOne({ _id: id, user: req.user.id });
    if (!goal) {
      return res.status(404).json({ message: "Goal not found." });
    }
    goal.completed = false;
    await goal.save();
    res.status(200).json({ message: "Goal marked as incomplete." });
  } catch (err) {
    res.status(500).json({ message: "Failed to mark as incomplete", error: err.message });
  }
};
const Goal = require("../models/Goals");
const dayjs = require("dayjs");
// Mark a single occurrence of a recurring task as complete (per-occurrence completion)
const completeOccurrence = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.body;
    if (!date) {
      return res.status(400).json({ message: "Date is required for per-occurrence completion." });
    }
    const goal = await Goal.findOne({ _id: id, user: req.user.id });
    if (!goal) {
      return res.status(404).json({ message: "Goal not found." });
    }
    // Remove any existing complete exception for this date
    goal.exceptions = goal.exceptions.filter(ex => !(ex.date === date && ex.type === 'complete'));
    // Add new complete exception
    goal.exceptions.push({ date, type: 'complete' });
    await goal.save();
    res.status(200).json({ message: "Occurrence marked complete.", exceptions: goal.exceptions });
  } catch (err) {
    console.error('Error in completeOccurrence:', err);
    res.status(500).json({ message: "Failed to complete occurrence", error: err.message });
  }
};
// Add or update an exception for a recurring goal
const addException = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, type, override } = req.body;
    if (!date || !type) {
      return res.status(400).json({ message: "Date and type are required for exception." });
    }
    const goal = await Goal.findOne({ _id: id, user: req.user.id });
    if (!goal) {
      return res.status(404).json({ message: "Goal not found." });
    }
    // Remove any existing exception for this date/type
    goal.exceptions = goal.exceptions.filter(ex => !(ex.date === date && (ex.type === type || (type === 'uncomplete' && ex.type === 'complete') || (type === 'complete' && ex.type === 'uncomplete'))));
    // For 'uncomplete', just remove the 'complete' exception if it exists (already done above)
    if (type !== 'uncomplete') {
      goal.exceptions.push({ date, type, override });
    }
    await goal.save();
    res.status(200).json({ message: "Exception added.", exceptions: goal.exceptions });
  } catch (err) {
    res.status(500).json({ message: "Failed to add exception", error: err.message });
  }
};

// Remove an exception for a recurring goal
const removeException = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, type } = req.body;
    if (!date || !type) {
      return res.status(400).json({ message: "Date and type are required for exception removal." });
    }
    const goal = await Goal.findOne({ _id: id, user: req.user.id });
    if (!goal) {
      return res.status(404).json({ message: "Goal not found." });
    }
    goal.exceptions = goal.exceptions.filter(ex => !(ex.date === date && ex.type === type));
    await goal.save();
    res.status(200).json({ message: "Exception removed.", exceptions: goal.exceptions });
  } catch (err) {
    res.status(500).json({ message: "Failed to remove exception", error: err.message });
  }
};

const createGoal = async (req, res) => {
  try {
    const { title, category, priority, deadline, startTime, endTime, recurrence } = req.body;

    if (!title || !category || !priority || !deadline || !startTime || !endTime || !recurrence) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const deadlineDate = dayjs(deadline).format("YYYY-MM-DD");

    const existingGoals = await Goal.find({
      user: req.user.id,
      deadline: {
        $gte: new Date(deadlineDate + "T00:00:00"),
        $lt: new Date(deadlineDate + "T23:59:59"),
      },
    });

    const isOverlapping = existingGoals.some((goal) => {
      const existingStart = goal.startTime;
      const existingEnd = goal.endTime;
      return startTime < existingEnd && endTime > existingStart;
    });

    if (isOverlapping) {
      return res.status(409).json({ message: "⛔ Time overlaps with an existing task." });
    }

    const newGoal = new Goal({
      user: req.user.id,
      title,
      category,
      priority,
      deadline,
      startTime,
      endTime,
      recurrence,
    });

    await newGoal.save();
    res.status(201).json({ message: "✅ Goal created", goal: newGoal });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const getGoals = async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.user.id }).sort({ deadline: 1 });
    // exceptions are now included in the goal objects
    res.json(goals);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch goals", error: err.message });
  }
};

const updateGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const goal = await Goal.findOne({ _id: id, user: req.user.id });
    if (!goal) {
      return res.status(404).json({ message: "Goal not found." });
    }

    // Only update fields that are present in the request body
    const updatableFields = ['title', 'category', 'priority', 'deadline', 'startTime', 'endTime', 'recurrence'];
    Object.keys(updates).forEach(field => {
      if (updatableFields.includes(field)) {
        goal[field] = updates[field];
      }
    });

    // Also update the same fields in all 'modify' exceptions' override objects
    if (goal.exceptions && Array.isArray(goal.exceptions)) {
      goal.exceptions.forEach(ex => {
        if (ex.type === 'modify' && ex.override) {
          Object.keys(updates).forEach(field => {
            if (updatableFields.includes(field)) {
              ex.override[field] = updates[field];
            }
          });
        }
      });
    }

    // Only clear exceptions if recurrence is being changed
    if (updates.recurrence && updates.recurrence !== goal.recurrence) {
      goal.exceptions = [];
    }

    await goal.save();
    res.status(200).json({ message: "✅ Goal updated successfully", goal });
  } catch (err) {
    console.error("Update failed", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const completeGoal = async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user.id });

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    goal.completed = !goal.completed;
    await goal.save();

    res.json({ message: "✅ Goal updated", goal });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update goal", error: err.message });
  }
};

const deleteGoal = async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    res.json({ message: "🗑️ Goal deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  createGoal,
  getGoals,
  updateGoal,
  completeGoal,
  deleteGoal,
  addException,
  removeException,
  completeOccurrence,
  incompleteGoal,
};
