import React, { useState, useEffect } from 'react';

const UserForm = ({ editingUser, onUserCreated, onUserUpdated, onCancelEdit }) => {
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone_number: '',
        address: '',
        additional_notes: ''
    });
    
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [submitMessage, setSubmitMessage] = useState(null);

    // Update form when editing user changes
    useEffect(() => {
        if (editingUser) {
            setFormData({
                full_name: editingUser.full_name || '',
                email: editingUser.email || '',
                phone_number: editingUser.phone_number || '',
                address: editingUser.address || '',
                additional_notes: editingUser.additional_notes || ''
            });
        } else {
            setFormData({
                full_name: '',
                email: '',
                phone_number: '',
                address: '',
                additional_notes: ''
            });
        }
        setErrors({});
        setSubmitMessage(null);
    }, [editingUser]);

    // Handle form input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Clear error for this field when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    // Validate form data
    const validateForm = () => {
        const newErrors = {};

        if (!formData.full_name.trim()) {
            newErrors.full_name = 'Full name is required';
        } else if (formData.full_name.trim().length < 2) {
            newErrors.full_name = 'Full name must be at least 2 characters';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        if (!formData.phone_number.trim()) {
            newErrors.phone_number = 'Phone number is required';
        } else if (formData.phone_number.trim().length < 10) {
            newErrors.phone_number = 'Phone number must be at least 10 characters';
        }

        return newErrors;
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const newErrors = validateForm();
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setLoading(true);
        setSubmitMessage(null);

        try {
            const url = editingUser 
                ? `http://localhost:5000/api/users/${editingUser.id}`
                : 'http://localhost:5000/api/users';
            
            const method = editingUser ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                setSubmitMessage({
                    type: 'success',
                    text: editingUser ? 'User updated successfully!' : 'User created successfully!'
                });
                
                if (editingUser) {
                    onUserUpdated(data.data);
                } else {
                    onUserCreated(data.data);
                    // Reset form for new user creation
                    setFormData({
                        full_name: '',
                        email: '',
                        phone_number: '',
                        address: '',
                        additional_notes: ''
                    });
                }
            } else {
                setSubmitMessage({
                    type: 'error',
                    text: data.message || data.error || 'An error occurred'
                });
                
                // Handle validation errors from server
                if (data.details && Array.isArray(data.details)) {
                    const serverErrors = {};
                    data.details.forEach(error => {
                        if (error.includes('Full name')) serverErrors.full_name = error;
                        else if (error.includes('Email')) serverErrors.email = error;
                        else if (error.includes('Phone')) serverErrors.phone_number = error;
                    });
                    setErrors(serverErrors);
                }
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            setSubmitMessage({
                type: 'error',
                text: 'Unable to connect to server. Please try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    // Handle cancel edit
    const handleCancel = () => {
        onCancelEdit();
    };

    return (
        <div className="user-form-container">
            <div className="form-header">
                <h2>
                    <i className={`fas ${editingUser ? 'fa-edit' : 'fa-user-plus'}`}></i>
                    {editingUser ? 'Edit User' : 'Add New User'}
                </h2>
                {editingUser && (
                    <button 
                        type="button" 
                        onClick={handleCancel}
                        className="cancel-edit-button"
                        title="Cancel editing"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                )}
            </div>

            {submitMessage && (
                <div className={`submit-message ${submitMessage.type}`}>
                    <i className={`fas ${submitMessage.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                    {submitMessage.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="user-form">
                <div className="form-group">
                    <label htmlFor="full_name">
                        Full Name <span className="required">*</span>
                    </label>
                    <input
                        type="text"
                        id="full_name"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        className={errors.full_name ? 'error' : ''}
                        placeholder="Enter full name"
                        disabled={loading}
                    />
                    {errors.full_name && (
                        <span className="error-message">
                            <i className="fas fa-exclamation-triangle"></i>
                            {errors.full_name}
                        </span>
                    )}
                </div>

                <div className="form-group">
                    <label htmlFor="email">
                        Email Address <span className="required">*</span>
                    </label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={errors.email ? 'error' : ''}
                        placeholder="Enter email address"
                        disabled={loading}
                    />
                    {errors.email && (
                        <span className="error-message">
                            <i className="fas fa-exclamation-triangle"></i>
                            {errors.email}
                        </span>
                    )}
                </div>

                <div className="form-group">
                    <label htmlFor="phone_number">
                        Phone Number <span className="required">*</span>
                    </label>
                    <input
                        type="tel"
                        id="phone_number"
                        name="phone_number"
                        value={formData.phone_number}
                        onChange={handleChange}
                        className={errors.phone_number ? 'error' : ''}
                        placeholder="Enter phone number"
                        disabled={loading}
                    />
                    {errors.phone_number && (
                        <span className="error-message">
                            <i className="fas fa-exclamation-triangle"></i>
                            {errors.phone_number}
                        </span>
                    )}
                </div>

                <div className="form-group">
                    <label htmlFor="address">Address</label>
                    <textarea
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Enter address (optional)"
                        rows="3"
                        disabled={loading}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="additional_notes">Additional Notes</label>
                    <textarea
                        id="additional_notes"
                        name="additional_notes"
                        value={formData.additional_notes}
                        onChange={handleChange}
                        placeholder="Enter any additional notes (optional)"
                        rows="4"
                        disabled={loading}
                    />
                </div>

                <div className="form-actions">
                    {editingUser && (
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="cancel-button"
                            disabled={loading}
                        >
                            <i className="fas fa-times"></i>
                            Cancel
                        </button>
                    )}
                    <button
                        type="submit"
                        className="submit-button"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <i className="fas fa-spinner fa-spin"></i>
                                {editingUser ? 'Updating...' : 'Creating...'}
                            </>
                        ) : (
                            <>
                                <i className={`fas ${editingUser ? 'fa-save' : 'fa-plus'}`}></i>
                                {editingUser ? 'Update User' : 'Add User'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default UserForm;