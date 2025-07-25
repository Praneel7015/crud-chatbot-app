import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import UserForm from './components/UserForm';
import UserTable from './components/UserTable';
import Chatbot from './components/Chatbot';
import ThemeToggle from './components/ThemeToggle';
import './styles/App.css';

const App = () => {
    const [users, setUsers] = useState([]);
    const [editingUser, setEditingUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('form');

    // Fetch users from the API
    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:5000/api/users');
            const data = await response.json();
            
            if (data.success) {
                setUsers(data.data);
                setError(null);
            } else {
                setError('Failed to fetch users');
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            setError('Unable to connect to the server');
        } finally {
            setLoading(false);
        }
    };

    // Load users on component mount
    useEffect(() => {
        fetchUsers();
    }, []);

    // Handle user creation
    const handleUserCreated = (newUser) => {
        setUsers(prevUsers => [newUser, ...prevUsers]);
        setEditingUser(null);
    };

    // Handle user update
    const handleUserUpdated = (updatedUser) => {
        setUsers(prevUsers => 
            prevUsers.map(user => 
                user.id === updatedUser.id ? updatedUser : user
            )
        );
        setEditingUser(null);
    };

    // Handle user deletion
    const handleUserDeleted = (deletedUserId) => {
        setUsers(prevUsers => 
            prevUsers.filter(user => user.id !== deletedUserId)
        );
    };

    // Handle edit user
    const handleEditUser = (user) => {
        setEditingUser(user);
        setActiveTab('form');
    };

    // Handle cancel edit
    const handleCancelEdit = () => {
        setEditingUser(null);
    };

    // Handle refresh users (for chatbot updates)
    const handleRefreshUsers = () => {
        fetchUsers();
    };

    return (
        <ThemeProvider>
            <div className="app">
                <header className="app-header">
                    <div className="header-content">
                        <div className="header-top">
                            <h1>
                                <i className="fas fa-users"></i>
                                User Management System
                            </h1>
                            <ThemeToggle />
                        </div>
                        <p>Manage your contacts with our intuitive form interface or chat with our AI assistant</p>
                    </div>
                </header>

                <nav className="tab-navigation">
                    <button 
                        className={`tab-button ${activeTab === 'form' ? 'active' : ''}`}
                        onClick={() => setActiveTab('form')}
                    >
                        <i className="fas fa-edit"></i>
                        Form Interface
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`}
                        onClick={() => setActiveTab('chat')}
                    >
                        <i className="fas fa-robot"></i>
                        AI Chatbot
                    </button>
                </nav>

                <main className="main-content">
                    {activeTab === 'form' && (
                        <div className="form-interface">
                            {error && (
                                <div className="error-banner">
                                    <i className="fas fa-exclamation-triangle"></i>
                                    {error}
                                    <button onClick={fetchUsers} className="retry-button">
                                        <i className="fas fa-redo"></i>
                                        Retry
                                    </button>
                                </div>
                            )}

                            <div className="interface-grid">
                                <div className="form-section">
                                    <UserForm
                                        editingUser={editingUser}
                                        onUserCreated={handleUserCreated}
                                        onUserUpdated={handleUserUpdated}
                                        onCancelEdit={handleCancelEdit}
                                    />
                                </div>

                                <div className="table-section">
                                    <UserTable
                                        users={users}
                                        loading={loading}
                                        onEditUser={handleEditUser}
                                        onUserDeleted={handleUserDeleted}
                                        onRefresh={fetchUsers}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'chat' && (
                        <div className="chat-interface">
                            <Chatbot onRefreshUsers={handleRefreshUsers} />
                        </div>
                    )}
                </main>

                <footer className="app-footer">
                    <p>&copy; 2024 User Management System. Powered by Gemini AI.</p>
                </footer>
            </div>
        </ThemeProvider>
    );
};

export default App;