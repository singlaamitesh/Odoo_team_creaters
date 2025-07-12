import { Router } from 'express';
import { getDatabase } from '../database/db.js';
import { authenticateToken, requireAdmin, type AuthRequest } from '../middleware/auth.js';

const router = Router();

// Helper function to get database connection
const getDb = async () => {
  return await getDatabase();
};

// Get all users (admin only)
router.get('/users', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT u.id, u.email, u.name, u.location, u.is_public, u.is_banned, u.created_at,
             COUNT(DISTINCT s.id) as skills_count,
             COUNT(DISTINCT sr.id) as swap_requests_count,
             AVG(r.rating) as avg_rating
      FROM users u
      LEFT JOIN skills s ON u.id = s.user_id
      LEFT JOIN swap_requests sr ON u.id = sr.requester_id OR u.id = sr.provider_id
      LEFT JOIN ratings r ON u.id = r.rated_id
      WHERE u.is_admin = 0
    `;

    const params: any[] = [];

    if (search) {
      query += ` AND (u.name LIKE ? OR u.email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += `
      GROUP BY u.id
      ORDER BY u.createdAt DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(Number(limit), offset);

    const db = await getDb();
    const users = await db.all(query, ...params);

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM users WHERE isAdmin = 0`;
    const countParams: any[] = [];
    
    if (search) {
      countQuery += ` AND (fullName LIKE ? OR email LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const totalResult = await db.get(countQuery, ...countParams);
    const total = totalResult ? totalResult.total : 0;

    res.json({
      users: users.map((user: any) => ({
        ...user,
        avgRating: user.avgRating ? Number(user.avgRating.toFixed(1)) : null
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ban/unban user
router.put('/users/:id/ban', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { isBanned } = req.body;

    const db = await getDb();
    await db.run(`
      UPDATE users SET isBanned = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ? AND isAdmin = 0
    `, isBanned, userId);

    res.json({ message: `User ${isBanned ? 'banned' : 'unbanned'} successfully` });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all swap requests (admin only)
router.get('/swaps', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT sr.*, 
             requester.fullName as requesterName, requester.email as requesterEmail,
             provider.fullName as providerName, provider.email as providerEmail,
             os.name as offeredSkillName,
             ws.name as wantedSkillName
      FROM swapRequests sr
      JOIN users requester ON sr.requesterId = requester.id
      JOIN users provider ON sr.providerId = provider.id
      JOIN skills os ON sr.offeredSkillId = os.id
      JOIN skills ws ON sr.wantedSkillId = ws.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (status) {
      query += ` AND sr.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY sr.createdAt DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    const db = await getDb();
    const swaps = await db.all(query, ...params);

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM swapRequests WHERE 1=1`;
    const countParams: any[] = [];
    
    if (status) {
      countQuery += ` AND status = ?`;
      countParams.push(status);
    }

    const totalResult = await db.get(countQuery, ...countParams);
    const total = totalResult ? totalResult.total : 0;

    res.json({
      swaps,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get swaps error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get platform statistics
router.get('/stats', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const db = await getDb();
    
    const [
      totalUsers,
      activeUsers,
      totalSkills,
      totalSwaps,
      completedSwaps,
      pendingSwaps,
      recentUsers,
      recentSwaps
    ] = await Promise.all([
      db.get('SELECT COUNT(*) as count FROM users WHERE isAdmin = 0'),
      db.get('SELECT COUNT(*) as count FROM users WHERE isAdmin = 0 AND isBanned = 0'),
      db.get('SELECT COUNT(*) as count FROM skills'),
      db.get('SELECT COUNT(*) as count FROM swaps'),
      db.get("SELECT COUNT(*) as count FROM swaps WHERE status = 'completed'"),
      db.get("SELECT COUNT(*) as count FROM swaps WHERE status = 'pending'"),
      db.all('SELECT * FROM users ORDER BY createdAt DESC LIMIT 5'),
      db.all(`
        SELECT s.*, 
               u1.fullName as requesterName, 
               u2.fullName as providerName
        FROM swaps s
        LEFT JOIN users u1 ON s.requesterId = u1.id
        LEFT JOIN users u2 ON s.providerId = u2.id
        ORDER BY s.createdAt DESC
        LIMIT 5
      `)
    ]);

    const stats = {
      totalUsers: totalUsers?.count || 0,
      activeUsers: activeUsers?.count || 0,
      totalSkills: totalSkills?.count || 0,
      totalSwaps: totalSwaps?.count || 0,
      completedSwaps: completedSwaps?.count || 0,
      pendingSwaps: pendingSwaps?.count || 0,
      recentUsers: recentUsers || [],
      recentSwaps: recentSwaps || []
    };

    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send platform message
router.post('/messages', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { title, content, type = 'announcement' } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const db = await getDb();
    await db.run(`
      INSERT INTO adminMessages (adminId, title, content, type)
      VALUES (?, ?, ?, ?)
    `, req.user!.id, title, content, type);

    res.status(201).json({ message: 'Platform message sent successfully' });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all messages (admin only)
router.get('/messages', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const db = await getDb();
    const messages = await db.all(`
      SELECT m.*, 
             u1.fullName as senderName, 
             u2.fullName as receiverName
      FROM messages m
      LEFT JOIN users u1 ON m.senderId = u1.id
      LEFT JOIN users u2 ON m.receiverId = u2.id
      ORDER BY m.createdAt DESC
    `);

    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Internal server error', details: errorMessage });
  }
});

export default router;