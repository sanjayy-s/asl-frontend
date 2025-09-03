const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { updateProfile, getUserById } = require('../controllers/userController');

// All routes here are protected
router.use(auth);

// @route   PUT api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', updateProfile);

// @route   GET api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', getUserById);

module.exports = router;
