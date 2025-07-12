-- Seed data for SkillSwap application
-- This file contains sample data for development and testing

-- Clear existing data
DELETE FROM ratings;
DELETE FROM reviews;
DELETE FROM swap_requests;
DELETE FROM skills;
DELETE FROM users;
DELETE FROM migrations;

-- Reset auto-increment counters
UPDATE sqlite_sequence SET seq = 0 WHERE name IN ('users', 'skills', 'swap_requests', 'reviews', 'ratings');

-- Insert sample users
-- Note: Passwords are hashed versions of 'password123'
INSERT INTO users (username, email, password, fullName, bio, location, profilePicture, isAdmin) VALUES
('john_doe', 'john@example.com', '$2a$10$XFDq3wNxVzLzX5X5X5X5XeX5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X', 'John Doe', 'Web developer and designer', 'New York, USA', 'https://randomuser.me/api/portraits/men/1.jpg', 1),
('jane_smith', 'jane@example.com', '$2a$10$XFDq3wNxVzLzX5X5X5X5XeX5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X', 'Jane Smith', 'Mobile app developer', 'San Francisco, USA', 'https://randomuser.me/api/portraits/women/1.jpg', 0),
('alex_wong', 'alex@example.com', '$2a$10$XFDq3wNxVzLzX5X5X5X5XeX5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X', 'Alex Wong', 'UI/UX Designer', 'Toronto, Canada', 'https://randomuser.me/api/portraits/men/2.jpg', 0),
('sarah_lee', 'sarah@example.com', '$2a$10$XFDq3wNxVzLzX5X5X5X5XeX5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X', 'Sarah Lee', 'Digital Marketing Specialist', 'London, UK', 'https://randomuser.me/api/portraits/women/2.jpg', 0),
('mike_chen', 'mike@example.com', '$2a$10$XFDq3wNxVzLzX5X5X5X5XeX5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X', 'Mike Chen', 'Data Scientist', 'Sydney, Australia', 'https://randomuser.me/api/portraits/men/3.jpg', 0);

-- Insert sample skills
INSERT INTO skills (userId, name, description, category, proficiency, isOffering, isSeeking) VALUES
-- John's skills
(1, 'React', 'Frontend development with React', 'Web Development', 'expert', 1, 0),
(1, 'Node.js', 'Backend development with Node.js', 'Web Development', 'advanced', 1, 0),
(1, 'UI/UX Design', 'User interface and experience design', 'Design', 'intermediate', 0, 1),

-- Jane's skills
(2, 'Flutter', 'Cross-platform mobile development', 'Mobile Development', 'advanced', 1, 0),
(2, 'Firebase', 'Backend as a service', 'Mobile Development', 'intermediate', 1, 0),
(2, 'GraphQL', 'API query language', 'Web Development', 'beginner', 0, 1),

-- Alex's skills
(3, 'Figma', 'UI/UX design tool', 'Design', 'expert', 1, 0),
(3, 'Adobe XD', 'UI/UX design tool', 'Design', 'advanced', 1, 0),
(3, 'React Native', 'Mobile app development', 'Mobile Development', 'intermediate', 0, 1),

-- Sarah's skills
(4, 'Social Media Marketing', 'Managing social media campaigns', 'Marketing', 'advanced', 1, 0),
(4, 'Content Creation', 'Creating engaging content', 'Marketing', 'intermediate', 1, 0),
(4, 'SEO', 'Search engine optimization', 'Marketing', 'beginner', 0, 1),

-- Mike's skills
(5, 'Python', 'Data analysis and machine learning', 'Data Science', 'expert', 1, 0),
(5, 'SQL', 'Database querying', 'Data Science', 'advanced', 1, 0),
(5, 'Data Visualization', 'Creating visual representations of data', 'Data Science', 'intermediate', 1, 0);

-- Insert sample swap requests
-- John wants to learn UI/UX Design from Alex
INSERT INTO swap_requests (requesterId, skillOfferedId, skillRequestedId, status, message, proposedTime, proposedLocation) VALUES
(1, 1, 7, 'pending', 'I can help you with React in exchange for some UI/UX design tips!', '2025-08-15 14:00:00', 'Virtual - Zoom'),

-- Jane wants to learn React from John
(2, 4, 1, 'accepted', 'I can help you with Flutter in exchange for React lessons!', '2025-08-16 15:00:00', 'Virtual - Google Meet'),

-- Alex wants to learn React Native from Jane
(3, 7, 9, 'completed', 'I can help you with Figma in exchange for React Native lessons!', '2025-07-10 13:00:00', 'Virtual - Zoom'),

-- Sarah wants to learn Data Visualization from Mike
(4, 10, 15, 'pending', 'I can help you with Social Media Marketing in exchange for Data Visualization tips!', '2025-08-20 11:00:00', 'In-person - Local Cafe'),

-- Mike wants to learn SEO from Sarah
(5, 13, 12, 'rejected', 'I can help you with Python in exchange for SEO knowledge!', '2025-08-05 10:00:00', 'Virtual - Teams');

-- Insert sample reviews
-- Review for the completed swap between Alex and Jane
INSERT INTO reviews (userId, reviewerId, swapId, rating, comment) VALUES
(3, 2, 3, 5, 'Great teacher! Very patient and knowledgeable about React Native.'),
(2, 3, 3, 4, 'Alex was a quick learner and had great design insights!');

-- Insert sample ratings
INSERT INTO ratings (userId, raterId, rating, comment) VALUES
(3, 2, 5, 'Excellent teacher, highly recommended!'),
(2, 3, 4, 'Great student, eager to learn!');

-- Insert migration record
INSERT INTO migrations (id, name) VALUES
('20230712000000', 'initial_migration');
