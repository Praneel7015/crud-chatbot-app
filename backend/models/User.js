const mysql = require('mysql2/promise');

class User {
    constructor() {
        this.pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'crud_chatbot_db',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
    }

    // Create a new user
    async create(userData) {
        try {
            const { full_name, email, phone_number, address, additional_notes } = userData;
            const [result] = await this.pool.execute(
                'INSERT INTO users (full_name, email, phone_number, address, additional_notes) VALUES (?, ?, ?, ?, ?)',
                [full_name, email, phone_number, address || null, additional_notes || null]
            );
            return result.insertId;
        } catch (error) {
            throw error;
        }
    }

    // Get all users
    async findAll() {
        try {
            const [rows] = await this.pool.execute('SELECT * FROM users ORDER BY created_at DESC');
            return rows;
        } catch (error) {
            throw error;
        }
    }

    // Get user by ID
    async findById(id) {
        try {
            const [rows] = await this.pool.execute('SELECT * FROM users WHERE id = ?', [id]);
            return rows[0] || null;
        } catch (error) {
            throw error;
        }
    }

    // Get user by email
    async findByEmail(email) {
        try {
            const [rows] = await this.pool.execute('SELECT * FROM users WHERE email = ?', [email]);
            return rows[0] || null;
        } catch (error) {
            throw error;
        }
    }

    // Search users by name (partial match)
    async findByName(name) {
        try {
            const [rows] = await this.pool.execute(
                'SELECT * FROM users WHERE full_name LIKE ? ORDER BY full_name',
                [`%${name}%`]
            );
            return rows;
        } catch (error) {
            throw error;
        }
    }

    // Update user
    async update(id, userData) {
        try {
            const { full_name, email, phone_number, address, additional_notes } = userData;
            const [result] = await this.pool.execute(
                'UPDATE users SET full_name = ?, email = ?, phone_number = ?, address = ?, additional_notes = ? WHERE id = ?',
                [full_name, email, phone_number, address || null, additional_notes || null, id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            throw error;
        }
    }

    // Delete user
    async delete(id) {
        try {
            const [result] = await this.pool.execute('DELETE FROM users WHERE id = ?', [id]);
            return result.affectedRows > 0;
        } catch (error) {
            throw error;
        }
    }

    // Check if email exists (excluding current user for updates)
    async emailExists(email, excludeId = null) {
        try {
            let query = 'SELECT id FROM users WHERE email = ?';
            let params = [email];
            
            if (excludeId) {
                query += ' AND id != ?';
                params.push(excludeId);
            }
            
            const [rows] = await this.pool.execute(query, params);
            return rows.length > 0;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = User;