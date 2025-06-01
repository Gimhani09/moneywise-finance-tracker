const express = require('express');
const router = express.Router();
const {
  getUserIncomeGoals,
  addIncomeGoal,
  updateIncomeGoal,
  deleteIncomeGoal,
  getGoalProgress
} = require('../controllers/incomeGoalController');

// Get all income goals for a specific user
router.get('/user/:userId', getUserIncomeGoals);

// Add a new income goal
router.post('/', addIncomeGoal);

// Update an existing income goal
router.put('/:id', updateIncomeGoal);

// Delete an income goal
router.delete('/:id', deleteIncomeGoal);

// Get progress towards a specific goal
router.get('/progress/:id', getGoalProgress);

module.exports = router;