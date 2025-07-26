import React, { useState, useRef, useEffect } from 'react';

const Chatbot = ({ onRefreshUsers }) => {
    const [messages, setMessages] = useState([
        {
            id: 1,
            type: 'bot',
            content: "👋 Hello! I'm your AI assistant for managing users. I can help you create, read, update, delete, and search for users using natural language. Just tell me what you'd like to do!",
            timestamp: new Date()
        }
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [pendingConfirmation, setPendingConfirmation] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Scroll to bottom when new messages are added
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Handle sending message
    const handleSendMessage = async (message = inputMessage.trim(), isConfirmation = false) => {
        if (!message && !isConfirmation) return;

        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: message,
            timestamp: new Date()
        };

        // Add user message to chat
        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            const payload = {
                message,
                confirm_action: isConfirmation && pendingConfirmation !== null,
                intent_data: isConfirmation ? pendingConfirmation.intent_data : undefined
            };

            const response = await fetch('http://localhost:5000/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            // Create bot response message
            const botMessage = {
                id: Date.now() + 1,
                type: 'bot',
                content: data.message || 'I encountered an error processing your request.',
                timestamp: new Date(),
                data: data.data || null,
                success: data.success
            };

            setMessages(prev => [...prev, botMessage]);

            // Handle confirmation requirement
            if (data.requires_confirmation) {
                setPendingConfirmation({
                    intent_data: data.intent_data,
                    message: data.message
                });
            } else {
                setPendingConfirmation(null);
                // Refresh users if data was modified
                if (data.success && ['create', 'update', 'delete'].includes(data.intent)) {
                    onRefreshUsers();
                }
            }

        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage = {
                id: Date.now() + 1,
                type: 'bot',
                content: "I'm sorry, I'm having trouble connecting to the server right now. Please try again in a moment.",
                timestamp: new Date(),
                success: false
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle confirmation response
    const handleConfirmation = (confirmed) => {
        const response = confirmed ? 'yes, proceed' : 'no, cancel';
        handleSendMessage(response, true);
    };

    // Handle input key press
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // Format timestamp
    const formatTime = (timestamp) => {
        return timestamp.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Render user data in a formatted way
    const renderUserData = (data) => {
        if (!data) return null;

        if (Array.isArray(data)) {
            return (
                <div className="user-data-list">
                    {data.map(user => (
                        <div key={user.id} className="user-data-item">
                            <div className="user-data-header">
                                <strong>{user.full_name}</strong>
                                <span className="user-id">ID: {user.id}</span>
                            </div>
                            <div className="user-data-details">
                                <div><i className="fas fa-envelope"></i> {user.email}</div>
                                <div><i className="fas fa-phone"></i> {user.phone_number}</div>
                                {user.address && (
                                    <div><i className="fas fa-map-marker-alt"></i> {user.address}</div>
                                )}
                                {user.additional_notes && (
                                    <div><i className="fas fa-sticky-note"></i> {user.additional_notes}</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            );
        } else {
            return (
                <div className="user-data-single">
                    <div className="user-data-header">
                        <strong>{data.full_name}</strong>
                        <span className="user-id">ID: {data.id}</span>
                    </div>
                    <div className="user-data-details">
                        <div><i className="fas fa-envelope"></i> {data.email}</div>
                        <div><i className="fas fa-phone"></i> {data.phone_number}</div>
                        {data.address && (
                            <div><i className="fas fa-map-marker-alt"></i> {data.address}</div>
                        )}
                        {data.additional_notes && (
                            <div><i className="fas fa-sticky-note"></i> {data.additional_notes}</div>
                        )}
                        <div className="user-data-meta">
                            <small>
                                <i className="fas fa-calendar"></i>
                                Created: {new Date(data.created_at).toLocaleDateString()}
                            </small>
                        </div>
                    </div>
                </div>
            );
        }
    };

    // Quick action buttons
    const quickActions = [
        { label: 'Show all users', icon: 'fas fa-list', message: 'Show me all users' },
        { label: 'Add new user', icon: 'fas fa-user-plus', message: 'I want to add a new user' },
        { label: 'Search users', icon: 'fas fa-search', message: 'Search for a user' },
        { label: 'Help', icon: 'fas fa-question-circle', message: 'Help me understand what you can do' }
    ];

    return (
        <div className="chatbot-container">
            <div className="chatbot-header">
                <div className="chatbot-title">
                    <i className="fas fa-robot"></i>
                    <h2>AI Assistant</h2>
                    <span className="status-indicator online">
                        <i className="fas fa-circle"></i>
                        Online
                    </span>
                </div>
                <div className="chatbot-subtitle">
                    Powered by Google Gemini AI
                </div>
            </div>

            <div className="chatbot-messages">
                {messages.map(message => (
                    <div key={message.id} className={`message ${message.type}`}>
                        <div className="message-avatar">
                            <i className={`fas ${message.type === 'bot' ? 'fa-robot' : 'fa-user'}`}></i>
                        </div>
                        <div className="message-content">
                            <div className="message-text">
                                {message.content}
                            </div>
                            {message.data && renderUserData(message.data)}
                            <div className="message-time">
                                {formatTime(message.timestamp)}
                                {message.success === false && (
                                    <span className="error-indicator">
                                        <i className="fas fa-exclamation-triangle"></i>
                                        Error
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="message bot typing">
                        <div className="message-avatar">
                            <i className="fas fa-robot"></i>
                        </div>
                        <div className="message-content">
                            <div className="typing-indicator">
                                <div className="typing-dots">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                                <span className="typing-text">AI is thinking...</span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {pendingConfirmation && (
                <div className="confirmation-panel">
                    <div className="confirmation-message">
                        <i className="fas fa-exclamation-triangle"></i>
                        <span>Confirmation Required</span>
                    </div>
                    <div className="confirmation-buttons">
                        <button 
                            onClick={() => handleConfirmation(true)}
                            className="confirm-yes"
                            disabled={isLoading}
                        >
                            <i className="fas fa-check"></i>
                            Yes, Proceed
                        </button>
                        <button 
                            onClick={() => handleConfirmation(false)}
                            className="confirm-no"
                            disabled={isLoading}
                        >
                            <i className="fas fa-times"></i>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className="quick-actions">
                <div className="quick-actions-label">Quick Actions:</div>
                <div className="quick-actions-buttons">
                    {quickActions.map((action, index) => (
                        <button
                            key={index}
                            onClick={() => handleSendMessage(action.message)}
                            className="quick-action-button"
                            disabled={isLoading}
                            title={action.label}
                        >
                            <i className={action.icon}></i>
                            {action.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="chatbot-input">
                <div className="input-container">
                    <textarea
                        ref={inputRef}
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your message here... (e.g., 'Add a new user named John Doe')"
                        disabled={isLoading}
                        rows="2"
                    />
                    <button
                        onClick={() => handleSendMessage()}
                        disabled={isLoading || !inputMessage.trim()}
                        className="send-button"
                    >
                        {isLoading ? (
                            <i className="fas fa-spinner fa-spin"></i>
                        ) : (
                            <i className="fas fa-paper-plane"></i>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Chatbot;