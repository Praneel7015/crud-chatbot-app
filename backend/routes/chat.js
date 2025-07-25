const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const User = require('../models/User');

const userModel = new User();

// Initialize Gemini AI with API key from environment variables
if (!process.env.GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY environment variable is not set.');
    console.error('Please add your Google Gemini API key to your .env file.');
    console.error('You can get an API key from: https://makersuite.google.com/app/apikey');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
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

// Function to analyze user intent using Gemini AI
async function analyzeIntent(userMessage) {
    // Check if API key is available
    if (!process.env.GEMINI_API_KEY) {
        console.error('Gemini API key not configured');
        return {
            intent: "unknown",
            action: "API key not configured",
            data: {},
            requires_confirmation: false,
            response_message: "I'm sorry, but the AI chatbot is not properly configured. Please check that the GEMINI_API_KEY environment variable is set."
        };
    }

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
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        
        // Try to parse JSON from the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        } else {
            // Fallback if JSON parsing fails
            return {
                intent: "unknown",
                action: "Could not parse intent",
                data: {},
                requires_confirmation: false,
                response_message: "I'm sorry, I didn't understand that. Could you please rephrase your request?"
            };
        }
    } catch (error) {
        console.error('Error analyzing intent:', error);
        
        // Provide more specific error messages
        let errorMessage = "I'm having trouble understanding your request right now. Please try again.";
        
        if (error.message.includes('API_KEY')) {
            errorMessage = "The AI chatbot is not properly configured. Please check the API key configuration.";
        } else if (error.message.includes('quota') || error.message.includes('limit')) {
            errorMessage = "The AI service is currently unavailable due to usage limits. Please try again later.";
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = "I'm having trouble connecting to the AI service. Please check your internet connection and try again.";
        }
        
        return {
            intent: "unknown",
            action: "AI analysis failed",
            data: {},
            requires_confirmation: false,
            response_message: errorMessage
        };
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