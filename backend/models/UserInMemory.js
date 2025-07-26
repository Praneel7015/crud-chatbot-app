// In-memory user model for testing purposes
class UserInMemory {
    constructor() {
        this.users = [
            {
                id: 1,
                full_name: 'John Doe',
                email: 'john.doe@example.com',
                phone_number: '+1-555-0123',
                address: '123 Main St, New York, NY 10001',
                additional_notes: 'Regular customer',
                created_at: new Date('2024-01-01'),
                updated_at: new Date('2024-01-01')
            },
            {
                id: 2,
                full_name: 'Jane Smith',
                email: 'jane.smith@example.com',
                phone_number: '+1-555-0124',
                address: '456 Oak Ave, Los Angeles, CA 90210',
                additional_notes: 'VIP member',
                created_at: new Date('2024-01-02'),
                updated_at: new Date('2024-01-02')
            },
            {
                id: 3,
                full_name: 'Mike Johnson',
                email: 'mike.johnson@example.com',
                phone_number: '+1-555-0125',
                address: '789 Pine Rd, Chicago, IL 60601',
                additional_notes: 'Prefers email contact',
                created_at: new Date('2024-01-03'),
                updated_at: new Date('2024-01-03')
            }
        ];
        this.nextId = 4;
    }

    // Create a new user
    async create(userData) {
        try {
            const { full_name, email, phone_number, address, additional_notes } = userData;
            
            // Check if email exists
            const existingUser = this.users.find(user => user.email === email);
            if (existingUser) {
                throw new Error('Email already exists');
            }

            const newUser = {
                id: this.nextId++,
                full_name,
                email,
                phone_number,
                address: address || null,
                additional_notes: additional_notes || null,
                created_at: new Date(),
                updated_at: new Date()
            };

            this.users.push(newUser);
            return newUser.id;
        } catch (error) {
            throw error;
        }
    }

    // Get all users
    async findAll() {
        try {
            return [...this.users].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } catch (error) {
            throw error;
        }
    }

    // Get user by ID
    async findById(id) {
        try {
            return this.users.find(user => user.id === parseInt(id)) || null;
        } catch (error) {
            throw error;
        }
    }

    // Get user by email
    async findByEmail(email) {
        try {
            return this.users.find(user => user.email === email) || null;
        } catch (error) {
            throw error;
        }
    }

    // Search users by name (partial match)
    async findByName(name) {
        try {
            return this.users.filter(user => 
                user.full_name.toLowerCase().includes(name.toLowerCase())
            ).sort((a, b) => a.full_name.localeCompare(b.full_name));
        } catch (error) {
            throw error;
        }
    }

    // Update user
    async update(id, userData) {
        try {
            const userIndex = this.users.findIndex(user => user.id === parseInt(id));
            if (userIndex === -1) {
                return false;
            }

            const { full_name, email, phone_number, address, additional_notes } = userData;
            
            // Check if email exists (excluding current user)
            const existingUser = this.users.find(user => user.email === email && user.id !== parseInt(id));
            if (existingUser) {
                throw new Error('Email already exists');
            }

            this.users[userIndex] = {
                ...this.users[userIndex],
                full_name,
                email,
                phone_number,
                address: address || null,
                additional_notes: additional_notes || null,
                updated_at: new Date()
            };

            return true;
        } catch (error) {
            throw error;
        }
    }

    // Delete user
    async delete(id) {
        try {
            const userIndex = this.users.findIndex(user => user.id === parseInt(id));
            if (userIndex === -1) {
                return false;
            }

            this.users.splice(userIndex, 1);
            return true;
        } catch (error) {
            throw error;
        }
    }

    // Check if email exists (excluding current user for updates)
    async emailExists(email, excludeId = null) {
        try {
            return this.users.some(user => 
                user.email === email && (excludeId === null || user.id !== parseInt(excludeId))
            );
        } catch (error) {
            throw error;
        }
    }
}

module.exports = UserInMemory;