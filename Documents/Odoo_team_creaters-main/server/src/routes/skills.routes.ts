import { Router } from 'express';
import { getDatabase } from '../database/db.js';
import { authenticateToken, type AuthRequest } from '../middleware/auth.js';
import { validateBody, skillSchema } from '../middleware/validation.js';
import type { Skill } from '../database/schema.js';

const router = Router();

// Helper function to get database connection
const getDb = async () => {
  return await getDatabase();
};

// Get user's skills
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const db = await getDb();
    const skills = await db.all(
      `SELECT id, name, 
              CASE WHEN isOffering = 1 THEN 'offered' ELSE 'wanted' END as type,
              description, 
              proficiency as proficiency_level,
              category,
              createdAt as created_at
       FROM skills 
       WHERE userId = ?
       ORDER BY type, name`,
      [req.user!.id]
    ) as Skill[];

    res.json(skills);
  } catch (error) {
    console.error('Get skills error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new skill
router.post('/', authenticateToken, validateBody(skillSchema), async (req: AuthRequest, res) => {
  const db = await getDb();
  try {
    const { name, type, description, proficiency_level, category = 'Other' } = req.body;

    // Validate proficiency level
    const validProficiencies = ['beginner', 'intermediate', 'advanced', 'expert'];
    if (!validProficiencies.includes(proficiency_level)) {
      return res.status(400).json({ error: 'Invalid proficiency level' });
    }

    // Check if skill already exists for this user
    const existingSkill = await db.get(
      `SELECT id FROM skills 
       WHERE userId = ? AND name = ? AND 
             ((isOffering = 1 AND ? = 'offered') OR (isSeeking = 1 AND ? = 'wanted'))`,
      [req.user!.id, name, type, type]
    );

    if (existingSkill) {
      return res.status(400).json({ error: 'You already have this skill listed' });
    }

    const isOffering = type === 'offered' ? 1 : 0;
    const isSeeking = type === 'wanted' ? 1 : 0;

    const result = await db.run(
      `INSERT INTO skills (userId, name, isOffering, isSeeking, description, proficiency, category)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user!.id, name, isOffering, isSeeking, description || null, proficiency_level, category]
    );

    const skillId = result.lastID;

    const newSkill = await db.get(
      `SELECT id, name, 
              CASE WHEN isOffering = 1 THEN 'offered' ELSE 'wanted' END as type,
              description, 
              proficiency as proficiency_level,
              createdAt as created_at
       FROM skills 
       WHERE id = ?`,
      [skillId]
    ) as Skill;

    res.status(201).json({
      message: 'Skill added successfully',
      skill: newSkill
    });
  } catch (error) {
    console.error('Add skill error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update skill
router.put('/:id', authenticateToken, validateBody(skillSchema), async (req: AuthRequest, res) => {
  const db = await getDb();
  try {
    const skillId = parseInt(req.params.id);
    const { name, type, description, proficiency_level } = req.body;

    // Check if skill belongs to user
    const skill = await db.get(
      `SELECT id FROM skills WHERE id = ? AND userId = ?`,
      [skillId, req.user!.id]
    );

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    const isOffering = type === 'offered' ? 1 : 0;
    const isSeeking = type === 'wanted' ? 1 : 0;

    await db.run(
      `UPDATE skills 
       SET name = ?, 
           isOffering = ?,
           isSeeking = ?,
           description = ?, 
           proficiency = ?,
           updatedAt = CURRENT_TIMESTAMP
       WHERE id = ? AND userId = ?`,
      [name, isOffering, isSeeking, description || null, proficiency_level, skillId, req.user!.id]
    );

    res.json({ message: 'Skill updated successfully' });
  } catch (error) {
    console.error('Update skill error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete skill
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  const db = await getDb();
  try {
    const skillId = parseInt(req.params.id);

    // Check if skill belongs to user
    const skill = await db.get(
      `SELECT id FROM skills WHERE id = ? AND userId = ?`,
      [skillId, req.user!.id]
    );

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    await db.run(
      'DELETE FROM skills WHERE id = ? AND userId = ?',
      [skillId, req.user!.id]
    );

    res.json({ message: 'Skill deleted successfully' });
  } catch (error) {
    console.error('Delete skill error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get popular skills
router.get('/popular', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const db = await getDb();
    const popularSkills = await db.all(`
      SELECT name, COUNT(*) as count
      FROM skills
      WHERE name IS NOT NULL
      GROUP BY name
      ORDER BY count DESC
      LIMIT 20
    `);

    res.json(popularSkills);
  } catch (error) {
    console.error('Get popular skills error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Internal server error', details: errorMessage });
  }
});

export default router;