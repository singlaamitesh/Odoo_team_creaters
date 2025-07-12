-- Database Schema
-- This file contains the complete database schema for the SkillSwap application

-- Drop existing tables if they exist
DROP TABLE IF EXISTS ratings;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS swap_requests;
DROP TABLE IF EXISTS skills;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS migrations;

-- Users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    fullName TEXT NOT NULL,
    bio TEXT,
    location TEXT,
    profilePicture TEXT,
    rating REAL DEFAULT 0,
    isAdmin BOOLEAN DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Skills table
CREATE TABLE skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    proficiency TEXT CHECK(proficiency IN ('beginner', 'intermediate', 'advanced', 'expert')) NOT NULL,
    isOffering BOOLEAN DEFAULT 1,
    isSeeking BOOLEAN DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Swap Requests table
CREATE TABLE swap_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requesterId INTEGER NOT NULL,
    skillOfferedId INTEGER NOT NULL,
    skillRequestedId INTEGER NOT NULL,
    status TEXT CHECK(status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')) DEFAULT 'pending',
    message TEXT,
    proposedTime DATETIME,
    proposedLocation TEXT,
    completedAt DATETIME,
    ratingByRequester INTEGER,
    ratingByReceiver INTEGER,
    feedbackByRequester TEXT,
    feedbackByReceiver TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requesterId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (skillOfferedId) REFERENCES skills(id) ON DELETE CASCADE,
    FOREIGN KEY (skillRequestedId) REFERENCES skills(id) ON DELETE CASCADE
);

-- Reviews table
CREATE TABLE reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    reviewerId INTEGER NOT NULL,
    swapId INTEGER NOT NULL,
    rating INTEGER CHECK(rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewerId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (swapId) REFERENCES swap_requests(id) ON DELETE CASCADE
);

-- Ratings table
CREATE TABLE ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    raterId INTEGER NOT NULL,
    rating INTEGER CHECK(rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (raterId) REFERENCES users(id) ON DELETE CASCADE
);

-- Migrations table
CREATE TABLE migrations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_skills_userId ON skills(userId);
CREATE INDEX idx_skills_category ON skills(category);
CREATE INDEX idx_swap_requests_requesterId ON swap_requests(requesterId);
CREATE INDEX idx_swap_requests_skillOfferedId ON swap_requests(skillOfferedId);
CREATE INDEX idx_swap_requests_skillRequestedId ON swap_requests(skillRequestedId);
CREATE INDEX idx_reviews_userId ON reviews(userId);
CREATE INDEX idx_reviews_reviewerId ON reviews(reviewerId);
CREATE INDEX idx_ratings_userId ON ratings(userId);
CREATE INDEX idx_ratings_raterId ON ratings(raterId);

-- Create triggers for updatedAt
CREATE TRIGGER update_users_updatedAt
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    UPDATE users SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_skills_updatedAt
AFTER UPDATE ON skills
FOR EACH ROW
BEGIN
    UPDATE skills SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_swap_requests_updatedAt
AFTER UPDATE ON swap_requests
FOR EACH ROW
BEGIN
    UPDATE swap_requests SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_reviews_updatedAt
AFTER UPDATE ON reviews
FOR EACH ROW
BEGIN
    UPDATE reviews SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_ratings_updatedAt
AFTER UPDATE ON ratings
FOR EACH ROW
BEGIN
    UPDATE ratings SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
