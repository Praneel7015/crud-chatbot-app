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

// Simple pattern matching for common CRUD operations
function simpleIntentRecognition(message) {
    const lowerMessage = message.toLowerCase().trim();
    
    // Help patterns
    if (lowerMessage.includes('help') || lowerMessage.includes('what can you do') || lowerMessage.includes('how to')) {
        return {
            intent: 'help',
            confidence: 'high',
            data: {}
        };
    }
    
    // Create patterns
    if (lowerMessage.includes('add') || lowerMessage.includes('create') || lowerMessage.includes('new user') || lowerMessage.includes('insert')) {
        return {
            intent: 'create',
            confidence: 'high',
            data: extractUserData(message)
        };
    }
    
    // Read patterns
    if (lowerMessage.includes('show') || lowerMessage.includes('list') || lowerMessage.includes('get') || 
        lowerMessage.includes('display') || lowerMessage.includes('all users') || lowerMessage.includes('view')) {
        return {
            intent: 'read',
            confidence: 'high',
            data: extractUserIdentifier(message)
        };
    }
    
    // Search patterns
    if (lowerMessage.includes('search') || lowerMessage.includes('find') || lowerMessage.includes('look for')) {
        return {
            intent: 'search',
            confidence: 'high',
            data: { search_term: extractSearchTerm(message) }
        };
    }
    
    // Update patterns
    if (lowerMessage.includes('update') || lowerMessage.includes('edit') || lowerMessage.includes('modify') || 
        lowerMessage.includes('change')) {
        return {
            intent: 'update',
            confidence: 'high',
            data: extractUserData(message, true)
        };
    }
    
    // Delete patterns
    if (lowerMessage.includes('delete') || lowerMessage.includes('remove') || lowerMessage.includes('destroy')) {
        return {
            intent: 'delete',
            confidence: 'high',
            data: extractUserIdentifier(message)
        };
    }
    
    // If no pattern matches, return unknown
    return {
        intent: 'unknown',
        confidence: 'low',
        data: {}
    };
}

// Extract user data from message using simple patterns
function extractUserData(message, isUpdate = false) {
    const data = {};
    
    // Extract email using regex
    const emailMatch = message.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    if (emailMatch) {
        data.email = emailMatch[0];
    }
    
    // Extract phone number - look for patterns after "phone" keyword or standalone numbers
    const phonePatterns = [
        /(?:phone|number|tel)[\s:]+([+]?[\d\s\-\(\)\.]{10,})/i,
        /(?:to|is)\s+([+]?[\d\s\-\(\)\.]{10,})(?:\s|$)/i,
        /(?:phone|tel)\s+([+]?[\d\-\(\)\.]{10,})/i
    ];
    
    for (const pattern of phonePatterns) {
        const match = message.match(pattern);
        if (match && match[1]) {
            data.phone_number = match[1].trim();
            break;
        }
    }
    
    // Extract name patterns - more careful to avoid email conflicts
    const namePatterns = [
        /(?:named?|called?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)(?=\s|$)/i,
        /(?:add|create)\s+(?:user\s+)?([A-Z][a-z]+\s+[A-Z][a-z]+)(?=\s+with|\s+email|\s+phone|$)/i,
        /(?:user|contact|person)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)(?=\s+with|\s+email|\s+phone|$)/i
    ];
    
    for (const pattern of namePatterns) {
        const match = message.match(pattern);
        if (match && match[1] && !match[1].includes('@')) {
            // Clean up the name by removing trailing email-related words
            let name = match[1].trim();
            name = name.replace(/\s+(with|email|phone).*$/i, '');
            if (name.length > 1) {
                data.full_name = name;
                break;
            }
        }
    }
    
    // Extract address patterns
    const addressPatterns = [
        /(?:address|location|at)\s+"([^"]+)"/i,
        /(?:address|location|at)\s+(.+?)(?:\s+notes?|$)/i
    ];
    
    for (const pattern of addressPatterns) {
        const match = message.match(pattern);
        if (match && match[1]) {
            data.address = match[1].trim();
            break;
        }
    }
    
    // Extract user ID
    const idPatterns = [
        /user\s+(?:id\s+)?(\d+)/i,
        /(?:with\s+)?id\s+(\d+)/i
    ];
    
    for (const pattern of idPatterns) {
        const match = message.match(pattern);
        if (match) {
            data.user_id = parseInt(match[1]);
            break;
        }
    }
    
    return data;
}

// Extract user identifier (ID, email, or name) from message
function extractUserIdentifier(message) {
    const data = extractUserData(message);
    
    // Also check for specific ID patterns
    const idPatterns = [
        /user\s+(?:id\s+)?(\d+)/i,
        /(?:with|id)\s+(\d+)/i
    ];
    
    for (const pattern of idPatterns) {
        const match = message.match(pattern);
        if (match) {
            data.user_id = parseInt(match[1]);
            break;
        }
    }
    
    return data;
}

// Extract search term from message
function extractSearchTerm(message) {
    const searchPatterns = [
        /(?:search|find|look for)\s+(?:users?\s+)?(?:named?|called?)\s+"([^"]+)"/i,
        /(?:search|find|look for)\s+(?:users?\s+)?(?:named?|called?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
        /(?:search|find|look for)\s+"([^"]+)"/i,
        /(?:search|find|look for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
        /(?:search|find|look for)\s+(.+?)(?:\s|$)/i
    ];
    
    for (const pattern of searchPatterns) {
        const match = message.match(pattern);
        if (match && match[1]) {
            const term = match[1].trim();
            // Filter out common words that aren't names
            if (!['users', 'user', 'people', 'contacts', 'for', 'all'].includes(term.toLowerCase())) {
                return term;
            }
        }
    }
    
    // Fallback: extract quoted strings
    const quotedMatch = message.match(/"([^"]+)"/);
    if (quotedMatch) {
        return quotedMatch[1];
    }
    
    // Last resort: extract capitalized words
    const capitalizedWords = message.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
    if (capitalizedWords && capitalizedWords.length > 0) {
        return capitalizedWords[capitalizedWords.length - 1];
    }
    
    return '';
}

// Enhanced intent analysis with fallback to Gemini AI for complex cases
async function analyzeIntent(userMessage) {
    // First, try simple pattern matching
    const simpleResult = simpleIntentRecognition(userMessage);
    
    // If we have high confidence, use simple result
    if (simpleResult.confidence === 'high') {
        return {
            intent: simpleResult.intent,
            action: `Direct pattern matching: ${simpleResult.intent}`,
            data: simpleResult.data,
            requires_confirmation: simpleResult.intent === 'delete',
            response_message: generateSimpleResponse(simpleResult.intent, simpleResult.data)
        };
    }
    
    // For complex cases, fall back to Gemini AI if available
    if (process.env.GEMINI_API_KEY) {
        try {
            const prompt = `
            Extract CRUD intent and data from this message: "${userMessage}"
            
            Return JSON:
            {
                "intent": "create|read|update|delete|search|help|unknown",
                "data": {
                    "full_name": "name if found",
                    "email": "email if found", 
                    "phone_number": "phone if found",
                    "address": "address if found",
                    "user_id": "id if found",
                    "search_term": "search term if found"
                }
            }
            
            Be precise and only extract clearly mentioned data.
            `;

            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text();
            
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const aiResult = JSON.parse(jsonMatch[0]);
                return {
                    intent: aiResult.intent,
                    action: `AI-assisted analysis: ${aiResult.intent}`,
                    data: aiResult.data || {},
                    requires_confirmation: aiResult.intent === 'delete',
                    response_message: generateSimpleResponse(aiResult.intent, aiResult.data)
                };
            }
        } catch (error) {
            console.error('Gemini AI analysis failed:', error);
        }
    }
    
    // Fallback for unknown intent
    return {
        intent: "unknown",
        action: "Could not determine intent",
        data: {},
        requires_confirmation: false,
        response_message: "I'm not sure what you'd like me to do. Try commands like 'show all users', 'add new user', 'search for John', 'update user 1', or 'delete user with email john@example.com'."
    };
}

// Generate simple response messages for recognized intents
function generateSimpleResponse(intent, data) {
    switch (intent) {
        case 'create':
            return "I'll help you add a new user. Let me process the information you provided.";
        case 'read':
            if (data.user_id) {
                return `I'll get the details for user ID ${data.user_id}.`;
            }
            return "I'll show you all the users in the database.";
        case 'search':
            return `I'll search for users matching "${data.search_term}".`;
        case 'update':
            return "I'll help you update the user information.";
        case 'delete':
            return "I understand you want to delete a user. This action requires confirmation.";
        case 'help':
            return "I'm here to help you manage users! Here's what I can do:";
        default:
            return "Let me help you with that request.";
    }
}

// Enhanced executeAction with better error handling and validation
async function executeAction(intentData) {
    const { intent, data } = intentData;

    try {
        switch (intent) {
            case 'create':
                return await handleCreateUser(data);
            case 'read':
                return await handleReadUsers(data);
            case 'search':
                return await handleSearchUsers(data);
            case 'update':
                return await handleUpdateUser(data);
            case 'delete':
                return await handleDeleteUser(data);
            case 'help':
                return handleHelp();
            default:
                return {
                    success: false,
                    message: "I'm not sure what you'd like me to do. Try commands like:\n" +
                           "• 'show all users' - to view all users\n" +
                           "• 'add user John Doe with email john@example.com and phone 555-1234'\n" +
                           "• 'search for Smith' - to find users\n" +
                           "• 'update user 1 phone to 555-9999'\n" +
                           "• 'delete user with email john@example.com'"
                };
        }
    } catch (error) {
        console.error('Error executing action:', error);
        return {
            success: false,
            message: "I encountered an error while processing your request. Please try again or contact support if the issue persists."
        };
    }
}

// Handle create user with enhanced validation
async function handleCreateUser(data) {
    // Validate required fields
    const missingFields = [];
    if (!data.full_name) missingFields.push('full name');
    if (!data.email) missingFields.push('email');
    if (!data.phone_number) missingFields.push('phone number');

    if (missingFields.length > 0) {
        return {
            success: false,
            message: `To create a new user, I need the following information: ${missingFields.join(', ')}. Please provide these details in your message.`
        };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        return {
            success: false,
            message: `The email address "${data.email}" doesn't appear to be valid. Please provide a valid email address.`
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

    try {
        const newUser = await internalAPI.createUser(data);
        return {
            success: true,
            message: `Great! I've successfully added ${newUser.full_name} to the database.`,
            data: newUser
        };
    } catch (error) {
        console.error('Create user error:', error);
        return {
            success: false,
            message: "I encountered an error while creating the user. Please check the information and try again."
        };
    }
}

// Handle read users
async function handleReadUsers(data) {
    try {
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
    } catch (error) {
        console.error('Read users error:', error);
        return {
            success: false,
            message: "I encountered an error while retrieving user information. Please try again."
        };
    }
}

// Handle search users
async function handleSearchUsers(data) {
    if (!data.search_term) {
        return {
            success: false,
            message: "What name would you like me to search for? Please specify a search term."
        };
    }

    try {
        const searchResults = await internalAPI.searchUsersByName(data.search_term);
        if (searchResults.length === 0) {
            return {
                success: false,
                message: `I couldn't find any users matching "${data.search_term}". Try searching with a different term or check the spelling.`
            };
        }

        return {
            success: true,
            message: `I found ${searchResults.length} user(s) matching "${data.search_term}":`,
            data: searchResults
        };
    } catch (error) {
        console.error('Search users error:', error);
        return {
            success: false,
            message: "I encountered an error while searching for users. Please try again."
        };
    }
}

// Handle update user
async function handleUpdateUser(data) {
    if (!data.user_id && !data.email) {
        return {
            success: false,
            message: "To update a user, I need either their ID or email address to identify them. Please specify which user you want to update."
        };
    }

    try {
        let userToUpdate;
        if (data.user_id) {
            userToUpdate = await internalAPI.getUserById(data.user_id);
        } else if (data.email) {
            userToUpdate = await internalAPI.getUserByEmail(data.email);
        }

        if (!userToUpdate) {
            return {
                success: false,
                message: "I couldn't find the user you want to update. Please check the ID or email address and try again."
            };
        }

        // Prepare update data (only include fields that were provided)
        const updateData = {
            full_name: data.full_name || userToUpdate.full_name,
            email: data.email || userToUpdate.email,
            phone_number: data.phone_number || userToUpdate.phone_number,
            address: data.address !== undefined ? data.address : userToUpdate.address,
            additional_notes: data.additional_notes !== undefined ? data.additional_notes : userToUpdate.additional_notes
        };

        // Validate email format if email is being updated
        if (data.email && data.email !== userToUpdate.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.email)) {
                return {
                    success: false,
                    message: `The email address "${data.email}" doesn't appear to be valid. Please provide a valid email address.`
                };
            }
        }

        const updatedUser = await internalAPI.updateUser(userToUpdate.id, updateData);
        if (!updatedUser) {
            return {
                success: false,
                message: "I encountered an error while updating the user. Please try again."
            };
        }

        return {
            success: true,
            message: `I've successfully updated ${updatedUser.full_name}'s information.`,
            data: updatedUser
        };
    } catch (error) {
        console.error('Update user error:', error);
        return {
            success: false,
            message: "I encountered an error while updating the user. Please try again."
        };
    }
}

// Handle delete user
async function handleDeleteUser(data) {
    if (!data.user_id && !data.email && !data.full_name) {
        return {
            success: false,
            message: "To delete a user, I need either their ID, email, or full name to identify them."
        };
    }

    try {
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
                message: "I couldn't find the user you want to delete. Please check the details and try again."
            };
        }

        const deleted = await internalAPI.deleteUser(userToDelete.id);
        if (!deleted) {
            return {
                success: false,
                message: "I encountered an error while deleting the user. Please try again."
            };
        }

        return {
            success: true,
            message: `I've successfully deleted ${userToDelete.full_name} from the database.`
        };
    } catch (error) {
        console.error('Delete user error:', error);
        return {
            success: false,
            message: "I encountered an error while deleting the user. Please try again."
        };
    }
}

// Handle help request
function handleHelp() {
    return {
        success: true,
        message: `I can help you manage users in the database! Here's what I can do:

📝 **Create Users**: "Add a new user named John Doe with email john@example.com and phone 555-1234"
👀 **View Users**: "Show me all users" or "Get user with ID 5"
🔍 **Search Users**: "Find users named Smith" or "Search for John"
✏️ **Update Users**: "Update user 1 phone to 555-9999" or "Change John's email to newemail@example.com"
🗑️ **Delete Users**: "Delete user with email john@example.com" (requires confirmation)

Just tell me what you'd like to do in natural language, and I'll take care of the rest!

**Tips:**
• Be specific with user details (name, email, phone)
• Use "user ID" or email to identify users for updates/deletes
• All delete operations require confirmation for safety`
    };
}

// POST /api/chat - Handle chat messages with simplified processing
router.post('/', async (req, res) => {
    try {
        const { message, confirm_action, intent_data } = req.body;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Message is required',
                message: 'Please provide a message to process.'
            });
        }

        let intentResult;

        // Handle confirmation responses
        if (confirm_action && intent_data) {
            // User is responding to a confirmation request
            const confirmMessage = message.toLowerCase().trim();
            const isConfirmed = confirmMessage.includes('yes') || confirmMessage.includes('confirm') || 
                               confirmMessage.includes('proceed') || confirmMessage.includes('ok');
            
            if (!isConfirmed) {
                return res.json({
                    success: true,
                    message: "Okay, I've cancelled that action. Is there anything else I can help you with?",
                    requires_confirmation: false
                });
            }
            
            // Execute the confirmed action
            intentResult = intent_data;
        } else {
            // Analyze the user's intent
            intentResult = await analyzeIntent(message.trim());
        }

        // Handle confirmation requirement for delete operations
        if (intentResult.intent === 'delete' && intentResult.requires_confirmation && !confirm_action) {
            return res.json({
                success: true,
                message: intentResult.response_message + " Please confirm that you want to proceed with the deletion by typing 'yes' or 'confirm'.",
                requires_confirmation: true,
                intent_data: intentResult
            });
        }

        // Execute the action directly
        const result = await executeAction(intentResult);

        res.json({
            success: result.success,
            message: result.message,
            data: result.data || null,
            intent: intentResult.intent,
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

module.exports = router;