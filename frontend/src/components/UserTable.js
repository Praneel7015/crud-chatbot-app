import React, { useState } from 'react';

const UserTable = ({ users, loading, onEditUser, onUserDeleted, onRefresh }) => {
    const [deletingUserId, setDeletingUserId] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    // Handle delete user
    const handleDeleteUser = async (user) => {
        setDeletingUserId(user.id);

        try {
            const response = await fetch(`http://localhost:5000/api/users/${user.id}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                onUserDeleted(user.id);
                setDeleteConfirm({
                    type: 'success',
                    message: `${user.full_name} has been deleted successfully.`
                });
            } else {
                setDeleteConfirm({
                    type: 'error',
                    message: data.message || 'Failed to delete user'
                });
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            setDeleteConfirm({
                type: 'error',
                message: 'Unable to connect to server. Please try again.'
            });
        } finally {
            setDeletingUserId(null);
            setTimeout(() => setDeleteConfirm(null), 5000);
        }
    };

    // Confirm delete dialog
    const confirmDelete = (user) => {
        if (window.confirm(`Are you sure you want to delete ${user.full_name}? This action cannot be undone.`)) {
            handleDeleteUser(user);
        }
    };

    // Format date
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading && users.length === 0) {
        return (
            <div className="user-table-container">
                <div className="table-header">
                    <h2>
                        <i className="fas fa-table"></i>
                        User Directory
                    </h2>
                </div>
                <div className="loading-state">
                    <i className="fas fa-spinner fa-spin"></i>
                    <p>Loading users...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="user-table-container">
            <div className="table-header">
                <h2>
                    <i className="fas fa-table"></i>
                    User Directory
                    <span className="user-count">({users.length} users)</span>
                </h2>
                <button 
                    onClick={onRefresh} 
                    className="refresh-button"
                    disabled={loading}
                    title="Refresh user list"
                >
                    <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
                    Refresh
                </button>
            </div>

            {deleteConfirm && (
                <div className={`delete-message ${deleteConfirm.type}`}>
                    <i className={`fas ${deleteConfirm.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                    {deleteConfirm.message}
                </div>
            )}

            {users.length === 0 ? (
                <div className="empty-state">
                    <i className="fas fa-users"></i>
                    <h3>No Users Found</h3>
                    <p>Start by adding your first user using the form above.</p>
                </div>
            ) : (
                <div className="table-wrapper">
                    <table className="user-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Address</th>
                                <th>Notes</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td>
                                        <div className="user-name">
                                            <i className="fas fa-user"></i>
                                            {user.full_name}
                                        </div>
                                    </td>
                                    <td>
                                        <a 
                                            href={`mailto:${user.email}`}
                                            className="email-link"
                                            title={`Send email to ${user.email}`}
                                        >
                                            <i className="fas fa-envelope"></i>
                                            {user.email}
                                        </a>
                                    </td>
                                    <td>
                                        <a 
                                            href={`tel:${user.phone_number}`}
                                            className="phone-link"
                                            title={`Call ${user.phone_number}`}
                                        >
                                            <i className="fas fa-phone"></i>
                                            {user.phone_number}
                                        </a>
                                    </td>
                                    <td>
                                        <div className="address-cell">
                                            {user.address ? (
                                                <>
                                                    <i className="fas fa-map-marker-alt"></i>
                                                    <span title={user.address}>
                                                        {user.address.length > 30 
                                                            ? `${user.address.substring(0, 30)}...`
                                                            : user.address
                                                        }
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="no-data">No address</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="notes-cell">
                                            {user.additional_notes ? (
                                                <>
                                                    <i className="fas fa-sticky-note"></i>
                                                    <span title={user.additional_notes}>
                                                        {user.additional_notes.length > 25
                                                            ? `${user.additional_notes.substring(0, 25)}...`
                                                            : user.additional_notes
                                                        }
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="no-data">No notes</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="date-cell">
                                            <i className="fas fa-calendar"></i>
                                            {formatDate(user.created_at)}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                onClick={() => onEditUser(user)}
                                                className="edit-button"
                                                title={`Edit ${user.full_name}`}
                                                disabled={deletingUserId === user.id}
                                            >
                                                <i className="fas fa-edit"></i>
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => confirmDelete(user)}
                                                className="delete-button"
                                                title={`Delete ${user.full_name}`}
                                                disabled={deletingUserId === user.id}
                                            >
                                                {deletingUserId === user.id ? (
                                                    <>
                                                        <i className="fas fa-spinner fa-spin"></i>
                                                        Deleting...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="fas fa-trash"></i>
                                                        Delete
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default UserTable;