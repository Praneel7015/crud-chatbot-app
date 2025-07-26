const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
// Use in-memory model for testing
const User = require('../models/UserInMemory');

const userModel = new User();

// Initialize Gemini AI with the provided API key
const genAI = new GoogleGenerativeAI('AIzaSyCGiFZ3sKkURBN3ajveL34e56Zpd0JNc0c');
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

// Internal API helper functions
const internalAPI = {
    async createUser(userData) {
        try {
            const userId = await userModel.create(userData);
            return await userModel.findById(userId);
        } catch (error) {
            throw error;
        }
    },

    async getUsers() {
        try {
            return await userModel.findAll();
        } catch (error) {
            throw error;
        }
    },

    async getUserById(id) {
        try {
            return await userModel.findById(id);
        } catch (error) {
            throw error;
        }
    },

    async getUserByEmail(email) {
        try {
            return await userModel.findByEmail(email);
        } catch (error) {
            throw error;
        }
    },

    async searchUsersByName(name) {
        try {
            return await userModel.findByName(name);
        } catch (error) {
            throw error;
        }
    },

    async updateUser(id, userData) {
        try {
            const updated = await userModel.update(id, userData);
            if (updated) {
                return await userModel.findById(id);
            }
            return null;
        } catch (error) {
            throw error;
        }
    },

    async deleteUser(id) {
        try {
            return await userModel.delete(id);
        } catch (error) {
            throw error;
        }
    }
};

// Fallback intent analysis when AI is not available
function analyzeIntentFallback(userMessage) {
    const message = userMessage.toLowerCase().trim();
    
    // Help patterns
    if (message.includes('help') || message.includes('what can you do') || message.includes('assist')) {
        return {
            intent: "help",
            action: "User requested help",
            data: {},
            requires_confirmation: false,
            response_message: "I can help you manage users in the database!"
        };
    }
    
    // Create patterns
    if (message.includes('add') || message.includes('create') || message.includes('new user') || message.includes('register')) {
        // Try to extract basic data
        const emailMatch = userMessage.match(/[\w.-]+@[\w.-]+\.\w+/);
        const phoneMatch = userMessage.match(/[\+]?[\d\s\-\(\)]{7,}/);
        
        // Try to extract name - look for patterns like "named X" or "user X"
        let fullName = null;
        if (userMessage.toLowerCase().includes('named ')) {
            const nameStart = userMessage.toLowerCase().indexOf('named ') + 6;
            const withPart = userMessage.toLowerCase().indexOf(' with', nameStart);
            if (withPart > nameStart) {
                fullName = userMessage.substring(nameStart, withPart).trim();
            }
        } else if (userMessage.toLowerCase().includes('user ')) {
            const nameStart = userMessage.toLowerCase().indexOf('user ') + 5;
            const withPart = userMessage.toLowerCase().indexOf(' with', nameStart);
            if (withPart > nameStart) {
                fullName = userMessage.substring(nameStart, withPart).trim();
            }
        }
        
        console.log(`[Chatbot] Parsed create data - Name: "${fullName}", Email: "${emailMatch ? emailMatch[0] : null}", Phone: "${phoneMatch ? phoneMatch[0].trim() : null}"`);
        
        return {
            intent: "create",
            action: "Create new user",
            data: {
                full_name: fullName,
                email: emailMatch ? emailMatch[0] : null,
                phone_number: phoneMatch ? phoneMatch[0].trim() : null,
                address: null,
                additional_notes: null
            },
            requires_confirmation: false,
            response_message: "I can help you create a new user. Please provide the full name, email, and phone number."
        };
    }
    
    // Read/List patterns
    if (message.includes('show') || message.includes('list') || message.includes('all users') || message.includes('view') || message.includes('get')) {
        return {
            intent: "read",
            action: "List all users",
            data: {},
            requires_confirmation: false,
            response_message: "I'll show you all the users in the database."
        };
    }
    
    // Search patterns
    if (message.includes('search') || message.includes('find') || message.includes('look for')) {
        // Try to extract search term - look for words after search/find keywords
        let searchTerm = null;
        
        if (message.includes('search for ')) {
            searchTerm = userMessage.substring(userMessage.toLowerCase().indexOf('search for ') + 11).trim();
        } else if (message.includes('find ')) {
            searchTerm = userMessage.substring(userMessage.toLowerCase().indexOf('find ') + 5).trim();
        } else if (message.includes('look for ')) {
            searchTerm = userMessage.substring(userMessage.toLowerCase().indexOf('look for ') + 9).trim();
        }
        
        return {
            intent: "search",
            action: "Search users",
            data: {
                search_term: searchTerm
            },
            requires_confirmation: false,
            response_message: searchTerm ? `I'll search for users matching "${searchTerm}".` : "What name would you like me to search for?"
        };
    }
    
    // Update patterns
    if (message.includes('update') || message.includes('edit') || message.includes('modify') || message.includes('change')) {
        return {
            intent: "update",
            action: "Update user",
            data: {},
            requires_confirmation: false,
            response_message: "I can help you update a user. Please specify which user and what information you'd like to change."
        };
    }
    
    // Delete patterns
    if (message.includes('delete') || message.includes('remove') || message.includes('erase')) {
        return {
            intent: "delete",
            action: "Delete user",
            data: {},
            requires_confirmation: true,
            response_message: "I can help you delete a user. Please specify which user you'd like to remove."
        };
    }
    
    // Default unknown
    return {
        intent: "unknown",
        action: "Could not determine intent",
        data: {},
        requires_confirmation: false,
        response_message: "I'm not sure what you'd like me to do. You can ask me to create, read, update, delete, or search for users. Type 'help' for more information."
    };
}

// Function to analyze user intent using Gemini AI with fallback
async function analyzeIntent(userMessage) {
    const prompt = `
    You are an AI assistant that helps users manage a user database through natural conversation. 
    Analyze the following user message and determine the intent and extract relevant data.

    User message: "${userMessage}"

    Please respond with a JSON object containing:
    {
        "intent": "create|read|update|delete|search|help|unknown",
        "action": "specific action description",
        "data": {
            "full_name": "extracted name if any",
            "email": "extracted email if any",
            "phone_number": "extracted phone if any",
            "address": "extracted address if any",
            "additional_notes": "extracted notes if any",
            "search_term": "search term if searching",
            "user_id": "user id if specified"
        },
        "requires_confirmation": true/false,
        "response_message": "conversational response to the user"
    }

    Intent definitions:
    - create: User wants to add a new contact/user
    - read: User wants to view/list users or get specific user details
    - update: User wants to modify existing user information
    - delete: User wants to remove a user
    - search: User wants to find users by name or other criteria
    - help: User needs assistance or general information
    - unknown: Cannot determine intent

    Be conversational and friendly in your response_message. Extract data accurately from natural language.
    For delete operations, always set requires_confirmation to true.
    `;

    try {
        console.log(`[Chatbot] Attempting AI analysis for: "${userMessage}"`);
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        
        console.log(`[Chatbot] AI response received: ${text.substring(0, 100)}...`);
        
        // Try to parse JSON from the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log(`[Chatbot] AI analysis successful, intent: ${parsed.intent}`);
            return parsed;
        } else {
            console.log('[Chatbot] Could not parse JSON from AI response, using fallback');
            return analyzeIntentFallback(userMessage);
        }
    } catch (error) {
        console.error(`[Chatbot] Error analyzing intent with AI: ${error.message}`);
        console.log('[Chatbot] Using fallback intent analysis...');
        return analyzeIntentFallback(userMessage);
    }
}

// Function to execute the determined action
async function executeAction(intentData) {
    const { intent, data } = intentData;

    try {
        switch (intent) {
            case 'create':
                // Validate required fields
                if (!data.full_name || !data.email || !data.phone_number) {
                    return {
                        success: false,
                        message: "To create a new user, I need at least a full name, email, and phone number. Could you provide these details?"
                    };
                }

                // Check if email already exists
                const existingUser = await internalAPI.getUserByEmail(data.email);
                if (existingUser) {
                    return {
                        success: false,
                        message: `A user with the email ${data.email} already exists. Would you like to update their information instead?`
                    };
                }

                const newUser = await internalAPI.createUser(data);
                return {
                    success: true,
                    message: `Great! I've successfully added ${newUser.full_name} to the database.`,
                    data: newUser
                };

            case 'read':
                if (data.user_id) {
                    const user = await internalAPI.getUserById(data.user_id);
                    if (!user) {
                        return {
                            success: false,
                            message: `I couldn't find a user with ID ${data.user_id}.`
                        };
                    }
                    return {
                        success: true,
                        message: `Here are the details for ${user.full_name}:`,
                        data: user
                    };
                } else {
                    const users = await internalAPI.getUsers();
                    return {
                        success: true,
                        message: `I found ${users.length} user(s) in the database:`,
                        data: users
                    };
                }

            case 'search':
                if (!data.search_term) {
                    return {
                        success: false,
                        message: "What name would you like me to search for?"
                    };
                }

                const searchResults = await internalAPI.searchUsersByName(data.search_term);
                if (searchResults.length === 0) {
                    return {
                        success: false,
                        message: `I couldn't find any users matching "${data.search_term}".`
                    };
                }

                return {
                    success: true,
                    message: `I found ${searchResults.length} user(s) matching "${data.search_term}":`,
                    data: searchResults
                };

            case 'update':
                if (!data.user_id && !data.email) {
                    return {
                        success: false,
                        message: "To update a user, I need either their ID or email address to identify them."
                    };
                }

                let userToUpdate;
                if (data.user_id) {
                    userToUpdate = await internalAPI.getUserById(data.user_id);
                } else if (data.email) {
                    userToUpdate = await internalAPI.getUserByEmail(data.email);
                }

                if (!userToUpdate) {
                    return {
                        success: false,
                        message: "I couldn't find the user you want to update."
                    };
                }

                // Prepare update data (only include fields that were provided)
                const updateData = {};
                if (data.full_name) updateData.full_name = data.full_name;
                if (data.email && data.email !== userToUpdate.email) updateData.email = data.email;
                if (data.phone_number) updateData.phone_number = data.phone_number;
                if (data.address !== undefined) updateData.address = data.address;
                if (data.additional_notes !== undefined) updateData.additional_notes = data.additional_notes;

                // Use existing data for required fields if not provided
                updateData.full_name = updateData.full_name || userToUpdate.full_name;
                updateData.email = updateData.email || userToUpdate.email;
                updateData.phone_number = updateData.phone_number || userToUpdate.phone_number;
                updateData.address = updateData.address !== undefined ? updateData.address : userToUpdate.address;
                updateData.additional_notes = updateData.additional_notes !== undefined ? updateData.additional_notes : userToUpdate.additional_notes;

                const updatedUser = await internalAPI.updateUser(userToUpdate.id, updateData);
                if (!updatedUser) {
                    return {
                        success: false,
                        message: "I encountered an error while updating the user."
                    };
                }

                return {
                    success: true,
                    message: `I've successfully updated ${updatedUser.full_name}'s information.`,
                    data: updatedUser
                };

            case 'delete':
                if (!data.user_id && !data.email && !data.full_name) {
                    return {
                        success: false,
                        message: "To delete a user, I need either their ID, email, or full name to identify them."
                    };
                }

                let userToDelete;
                if (data.user_id) {
                    userToDelete = await internalAPI.getUserById(data.user_id);
                } else if (data.email) {
                    userToDelete = await internalAPI.getUserByEmail(data.email);
                } else if (data.full_name) {
                    const searchResults = await internalAPI.searchUsersByName(data.full_name);
                    if (searchResults.length === 1) {
                        userToDelete = searchResults[0];
                    } else if (searchResults.length > 1) {
                        return {
                            success: false,
                            message: `I found multiple users with that name. Please specify which one by providing their email or ID.`
                        };
                    }
                }

                if (!userToDelete) {
                    return {
                        success: false,
                        message: "I couldn't find the user you want to delete."
                    };
                }

                const deleted = await internalAPI.deleteUser(userToDelete.id);
                if (!deleted) {
                    return {
                        success: false,
                        message: "I encountered an error while deleting the user."
                    };
                }

                return {
                    success: true,
                    message: `I've successfully deleted ${userToDelete.full_name} from the database.`
                };

            case 'help':
                return {
                    success: true,
                    message: `I can help you manage users in the database! Here's what I can do:

📝 **Create**: "Add a new contact named John Doe with email john@example.com and phone 555-1234"
👀 **Read**: "Show me all users" or "Get details for user with ID 5"
🔍 **Search**: "Find users named Smith" or "Search for John"
✏️ **Update**: "Update John's phone number to 555-9999"
🗑️ **Delete**: "Delete the user with email john@example.com"

Just tell me what you'd like to do in natural language, and I'll take care of the rest!`
                };

            default:
                return {
                    success: false,
                    message: "I'm not sure what you'd like me to do. Could you please rephrase your request? You can ask me to create, read, update, delete, or search for users."
                };
        }
    } catch (error) {
        console.error('Error executing action:', error);
        return {
            success: false,
            message: "I encountered an error while processing your request. Please try again."
        };
    }
}

// POST /api/chat - Handle chat messages
router.post('/', async (req, res) => {
    try {
        const { message, confirm_action } = req.body;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        // Analyze user intent using Gemini AI
        const intentData = await analyzeIntent(message.trim());

        // Handle confirmation for delete operations
        if (intentData.intent === 'delete' && intentData.requires_confirmation && !confirm_action) {
            return res.json({
                success: true,
                message: intentData.response_message + " Please confirm that you want to proceed with the deletion.",
                requires_confirmation: true,
                intent_data: intentData
            });
        }

        // Execute the action
        const result = await executeAction(intentData);

        res.json({
            success: result.success,
            message: result.message,
            data: result.data || null,
            intent: intentData.intent,
            requires_confirmation: false
        });

    } catch (error) {
        console.error('Error processing chat message:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process chat message',
            message: 'I encountered an error while processing your request. Please try again.'
        });
    }
});

// POST /api/chat/confirm - Handle confirmation for actions that require it
router.post('/confirm', async (req, res) => {
    try {
        const { intent_data, confirmed } = req.body;

        if (!intent_data) {
            return res.status(400).json({
                success: false,
                error: 'Intent data is required for confirmation'
            });
        }

        if (!confirmed) {
            return res.json({
                success: true,
                message: "Okay, I've cancelled that action. Is there anything else I can help you with?"
            });
        }

        // Execute the confirmed action
        const result = await executeAction(intent_data);

        res.json({
            success: result.success,
            message: result.message,
            data: result.data || null,
            intent: intent_data.intent
        });

    } catch (error) {
        console.error('Error confirming action:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to confirm action',
            message: 'I encountered an error while processing your confirmation. Please try again.'
        });
    }
});

module.exports = router;