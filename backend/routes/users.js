const express = require('express');
const router = express.Router();
// Use in-memory model for testing
const User = require('../models/UserInMemory');
const { validateUserData } = require('../middleware/validation');

const userModel = new User();

// GET /api/users - Get all users
router.get('/', async (req, res) => {
    try {
        const users = await userModel.findAll();
        res.json({
            success: true,
            data: users,
            count: users.length
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch users',
            message: error.message
        });
    }
});

// GET /api/users/:id - Get user by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id || isNaN(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid user ID'
            });
        }

        const user = await userModel.findById(parseInt(id));
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user',
            message: error.message
        });
    }
});

// POST /api/users - Create new user
router.post('/', validateUserData, async (req, res) => {
    try {
        const { email } = req.body;

        // Check if email already exists
        const existingUser = await userModel.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'Email already exists',
                message: 'A user with this email address already exists'
            });
        }

        const userId = await userModel.create(req.body);
        const newUser = await userModel.findById(userId);

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: newUser
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create user',
            message: error.message
        });
    }
});

// PUT /api/users/:id - Update user
router.put('/:id', validateUserData, async (req, res) => {
    try {
        const { id } = req.params;
        const { email } = req.body;

        if (!id || isNaN(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid user ID'
            });
        }

        const userId = parseInt(id);

        // Check if user exists
        const existingUser = await userModel.findById(userId);
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Check if email already exists (excluding current user)
        const emailExists = await userModel.emailExists(email, userId);
        if (emailExists) {
            return res.status(409).json({
                success: false,
                error: 'Email already exists',
                message: 'Another user with this email address already exists'
            });
        }

        const updated = await userModel.update(userId, req.body);
        
        if (!updated) {
            return res.status(400).json({
                success: false,
                error: 'Failed to update user'
            });
        }

        const updatedUser = await userModel.findById(userId);

        res.json({
            success: true,
            message: 'User updated successfully',
            data: updatedUser
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update user',
            message: error.message
        });
    }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid user ID'
            });
        }

        const userId = parseInt(id);

        // Check if user exists
        const existingUser = await userModel.findById(userId);
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const deleted = await userModel.delete(userId);
        
        if (!deleted) {
            return res.status(400).json({
                success: false,
                error: 'Failed to delete user'
            });
        }

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete user',
            message: error.message
        });
    }
});

// GET /api/users/search/:name - Search users by name
router.get('/search/:name', async (req, res) => {
    try {
        const { name } = req.params;
        
        if (!name || name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Search name is required'
            });
        }

        const users = await userModel.findByName(name.trim());

        res.json({
            success: true,
            data: users,
            count: users.length,
            searchTerm: name.trim()
        });
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search users',
            message: error.message
        });
    }
});

module.exports = router;