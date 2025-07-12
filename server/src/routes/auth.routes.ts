import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDatabase } from '../database/db.js';
import { generateToken } from '../middleware/auth.js';
import { validateBody, userRegistrationSchema, userLoginSchema } from '../middleware/validation.js';
import type { User } from '../database/schema.js';

const router = Router();

// Register
router.post('/register', validateBody(userRegistrationSchema), async (req, res) => {
  try {
    console.log('Received registration request with body:', req.body);
    
    const { email, password, ...rest } = req.body;
    
    const db = await getDatabase();

    // Check if user already exists
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const username = email.split('@')[0];

    // Insert user with only the fields that exist in the database
    const result = await db.run(
      `INSERT INTO users (
        username, 
        email, 
        password, 
        fullName, 
        location
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        username, // Use the part before @ as username
        email,
        hashedPassword,
        rest.name || username, // Use provided name or username
        rest.location || null
      ]
    );
    
    console.log('User created with ID:', result.lastID);

    const userId = result.lastID as number;

    // Get the newly created user
    const newUser = await db.get<User>('SELECT * FROM users WHERE id = ?', [userId]);
    if (!newUser) {
      throw new Error('Failed to retrieve newly created user');
    }

    // Generate token with user data
    const token = generateToken({ 
      id: newUser.id, 
      email: newUser.email, 
      is_admin: Boolean(newUser.isAdmin) 
    });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: newUser
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Login
router.post('/login', validateBody(userLoginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = await getDatabase();

    // Find user by email
    const user = await db.get<User>('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Omit password from response
    const { password: _, ...userWithoutPassword } = user;

    // Generate token
    const token = generateToken({ 
      id: user.id,
      email: user.email, 
      is_admin: Boolean(user.isAdmin) 
    });

    res.json({
      message: 'Login successful',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;