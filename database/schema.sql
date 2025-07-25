-- Create database
CREATE DATABASE IF NOT EXISTS crud_chatbot_db;
USE crud_chatbot_db;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone_number VARCHAR(20) NOT NULL,
    address TEXT,
    additional_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert some sample data
INSERT INTO users (full_name, email, phone_number, address, additional_notes) VALUES
('John Doe', 'john.doe@example.com', '+1-555-0123', '123 Main St, New York, NY 10001', 'Regular customer'),
('Jane Smith', 'jane.smith@example.com', '+1-555-0124', '456 Oak Ave, Los Angeles, CA 90210', 'VIP member'),
('Mike Johnson', 'mike.johnson@example.com', '+1-555-0125', '789 Pine Rd, Chicago, IL 60601', 'Prefers email contact');