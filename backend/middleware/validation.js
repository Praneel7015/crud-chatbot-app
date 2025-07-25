const validator = require('validator');

// Validation middleware for user data
const validateUserData = (req, res, next) => {
    const { full_name, email, phone_number } = req.body;
    const errors = [];

    // Validate full_name
    if (!full_name || full_name.trim().length === 0) {
        errors.push('Full name is required');
    } else if (full_name.trim().length < 2) {
        errors.push('Full name must be at least 2 characters long');
    } else if (full_name.trim().length > 255) {
        errors.push('Full name must be less than 255 characters');
    }

    // Validate email
    if (!email || email.trim().length === 0) {
        errors.push('Email is required');
    } else if (!validator.isEmail(email)) {
        errors.push('Email must be a valid email address');
    }

    // Validate phone_number
    if (!phone_number || phone_number.trim().length === 0) {
        errors.push('Phone number is required');
    } else if (phone_number.trim().length < 10) {
        errors.push('Phone number must be at least 10 characters long');
    }

    // Validate optional fields length
    if (req.body.address && req.body.address.length > 1000) {
        errors.push('Address must be less than 1000 characters');
    }

    if (req.body.additional_notes && req.body.additional_notes.length > 2000) {
        errors.push('Additional notes must be less than 2000 characters');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors
        });
    }

    // Sanitize data
    req.body.full_name = full_name.trim();
    req.body.email = email.trim().toLowerCase();
    req.body.phone_number = phone_number.trim();
    if (req.body.address) req.body.address = req.body.address.trim();
    if (req.body.additional_notes) req.body.additional_notes = req.body.additional_notes.trim();

    next();
};

module.exports = {
    validateUserData
};