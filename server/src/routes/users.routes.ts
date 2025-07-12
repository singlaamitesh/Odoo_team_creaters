import { Router } from 'express';
import { getDatabase } from '../database/db.js';
import { authenticateToken, type AuthRequest } from '../middleware/auth.js';
import type { User, Skill } from '../database/schema.js';

const router = Router();

// Helper function to get database connection
const getDb = async () => {
  return await getDatabase();
};

// Get current user profile
router.get('/profile', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const db = await getDb();
    
    const user = await db.get(`
      SELECT id, email, fullName as name, location, profilePicture as profile_photo, isAdmin
      FROM users WHERE id = ?
    `, [req.user!.id]) as User | undefined;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's skills
    const skills = await db.all(`
      SELECT id, name, description, 
             CASE WHEN isOffering = 1 THEN 'offered' ELSE 'wanted' END as type,
             proficiency as proficiency_level
      FROM skills 
      WHERE userId = ?
      ORDER BY type, name
    `, [user.id]) as Skill[];

    // Get user's average rating
    const ratingResult = await db.get(`
      SELECT rating as avg_rating, 
             (SELECT COUNT(*) FROM reviews WHERE userId = ?) as total_ratings
      FROM users WHERE id = ?
    `, [user.id, user.id]) as { avg_rating: number | null; total_ratings: number };

    res.json({
      ...user,
      skills,
      avg_rating: ratingResult.avg_rating ? Number(ratingResult.avg_rating.toFixed(1)) : null,
      total_ratings: ratingResult.total_ratings
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const db = await getDb();
    const { name, location, isPublic } = req.body;
    
    await db.run(
      `UPDATE users 
       SET fullName = ?, location = ?, isPublic = ?, updatedAt = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [name, location, isPublic ? 1 : 0, req.user!.id]
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search users by skill
router.get('/search', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const db = await getDb();
    const { skill, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // First, get the total count
    let countQuery = `
      SELECT COUNT(DISTINCT u.id) as count
      FROM users u
      LEFT JOIN skills s ON u.id = s.userId
      WHERE u.id != ?
    `;

    let query = `
      SELECT DISTINCT u.id, u.fullName as name, u.location, u.profilePicture as profile_photo,
             GROUP_CONCAT(DISTINCT CASE WHEN s.isOffering = 1 THEN s.name END) as offered_skills,
             GROUP_CONCAT(DISTINCT CASE WHEN s.isSeeking = 1 THEN s.name END) as wanted_skills,
             u.rating as avg_rating,
             (SELECT COUNT(*) FROM reviews WHERE userId = u.id) as total_ratings
      FROM users u
      LEFT JOIN skills s ON u.id = s.userId
      WHERE u.id != ?
    `;

    const params: any[] = [req.user!.id];
    const countParams: any[] = [req.user!.id];

    if (skill) {
      query += ` AND s.name LIKE ?`;
      countQuery += ` AND s.name LIKE ?`;
      const skillParam = `%${skill}%`;
      params.push(skillParam);
      countParams.push(skillParam);
    }

    // Add grouping and ordering
    query += `
      GROUP BY u.id, u.fullName, u.location, u.profilePicture, u.rating
      ORDER BY u.fullName
      LIMIT ? OFFSET ?
    `;

    params.push(Number(limit), offset);

    // Execute both queries in parallel
    const [users, totalResult] = await Promise.all([
      db.all(query, ...params),
      db.get(countQuery, ...countParams)
    ]);
    
    const total = totalResult ? totalResult.count : 0;

    // Process the results
    const processedUsers = users.map((user: any) => ({
      ...user,
      avg_rating: user.avg_rating ? Number(Number(user.avg_rating).toFixed(1)) : null,
      offered_skills: user.offered_skills ? user.offered_skills.split(',').filter(Boolean) : [],
      wanted_skills: user.wanted_skills ? user.wanted_skills.split(',').filter(Boolean) : []
    }));

    res.json({
      users: processedUsers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(total),
        totalPages: Math.ceil(Number(total) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by ID (public profile)
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const db = await getDb();
    const userId = parseInt(req.params.id);
    
    const user = await db.get(
      `SELECT id, email, fullName as name, location, profilePicture as profile_photo, isAdmin
       FROM users WHERE id = ?`,
      [userId]
    ) as User | undefined;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's skills
    const skills = await db.all(
      `SELECT id, name, description, 
              CASE WHEN isOffering = 1 THEN 'offered' ELSE 'wanted' END as type,
              proficiency as proficiency_level
       FROM skills 
       WHERE userId = ?
       ORDER BY type, name`,
      [userId]
    ) as Skill[];

    // Get user's rating info
    const ratingResult = await db.get(
      `SELECT rating as avg_rating, 
              (SELECT COUNT(*) FROM reviews WHERE userId = ?) as total_ratings
       FROM users WHERE id = ?`,
      [userId, userId]
    ) as { avg_rating: number | null; total_ratings: number };

    res.json({
      ...user,
      skills,
      avg_rating: ratingResult.avg_rating ? Number(Number(ratingResult.avg_rating).toFixed(1)) : null,
      total_ratings: ratingResult.total_ratings || 0
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;