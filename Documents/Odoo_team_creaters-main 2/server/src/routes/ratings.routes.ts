import { Router } from 'express';
import { Database } from 'sqlite';
import { getDatabase } from '../database/db.js';
import { authenticateToken, type AuthRequest } from '../middleware/auth.js';
import { validateBody, ratingSchema } from '../middleware/validation.js';
import type { Rating } from '../database/schema.js';

// Helper function to update a user's average rating
async function updateUserAverageRating(db: Database, userId: number): Promise<void> {
  // Calculate the new average rating
  const result = await db.get(
    `SELECT AVG(rating) as averageRating, COUNT(*) as ratingCount
     FROM ratings 
     WHERE userId = ?`,
    [userId]
  );

  if (result) {
    // Update the user's average rating in the users table
    await db.run(
      `UPDATE users 
       SET rating = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [result.averageRating || 0, userId]
    );
  }
}

const router = Router();

// Helper function to get database connection
const getDb = async () => {
  return await getDatabase();
};

// Add rating for completed swap
router.post('/swap/:swapId', authenticateToken, validateBody(ratingSchema), async (req: AuthRequest, res) => {
  try {
    const swapId = parseInt(req.params.swapId);
    const { rating, feedback } = req.body;
    const db = await getDb();

    // Get the swap request
    const swapRequest = await db.get(
      `SELECT * FROM swap_requests WHERE id = ? AND status = 'completed'`,
      [swapId]
    );

    if (!swapRequest) {
      return res.status(404).json({ error: 'Completed swap request not found' });
    }

    // Get the skill owner (provider) of the requested skill
    const skillOwner = await db.get(
      'SELECT userId FROM skills WHERE id = ?',
      [swapRequest.skillRequestedId]
    );

    if (!skillOwner) {
      return res.status(404).json({ error: 'Requested skill not found' });
    }

    // Check if user is part of this swap (either requester or skill owner)
    if (swapRequest.requesterId !== req.user!.id && skillOwner.userId !== req.user!.id) {
      return res.status(403).json({ error: 'You are not part of this swap' });
    }

    // Determine who is being rated (the other person in the swap)
    const ratedId = swapRequest.requesterId === req.user!.id 
      ? skillOwner.userId 
      : swapRequest.requesterId;

    // Check if rating already exists
    const existingRating = await db.get(
      `SELECT id, userId FROM ratings WHERE swapId = ? AND raterId = ?`,
      [swapId, req.user!.id]
    );

    if (existingRating) {
      // Update existing rating
      await db.run(
        `UPDATE ratings 
         SET rating = ?, comment = ?, updatedAt = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [rating, feedback || null, existingRating.id]
      );
    } else {
      // Insert new rating
      await db.run(
        `INSERT INTO ratings (swapId, raterId, userId, rating, comment, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [swapId, req.user!.id, ratedId, rating, feedback || null]
      );
    }

    // Update the swap with the rating
    if (req.user!.id === swapRequest.requesterId) {
      await db.run(
        `UPDATE swap_requests 
         SET ratingByRequester = ?, feedbackByRequester = ?, updatedAt = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [rating, feedback || null, swapId]
      );
    } else {
      // When the provider is rating, update ratingByReceiver and feedbackByReceiver
      await db.run(
        `UPDATE swap_requests 
         SET ratingByReceiver = ?, feedbackByReceiver = ?, updatedAt = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [rating, feedback || null, swapId]
      );
    }

    // Update the rated user's average rating
    await updateUserAverageRating(db, ratedId);

    res.status(201).json({ message: 'Rating added successfully' });
  } catch (error) {
    console.error('Add rating error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Internal server error', details: errorMessage });
  }
});

// Get ratings for a user
router.get('/user/:userId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const db = await getDb();

    // Get all ratings for the user
    const ratings = await db.all(
      `SELECT r.rating, r.comment as feedback, r.createdAt,
              u.fullName as raterName, u.profilePicture as raterPhoto
       FROM ratings r
       JOIN users u ON r.raterId = u.id
       WHERE r.userId = ?
       ORDER BY r.createdAt DESC`,
      [userId]
    ) as Rating[];

    // Get average rating and total count
    const ratingStats = await db.get(
      `SELECT AVG(rating) as avgRating, COUNT(*) as totalRatings
       FROM ratings 
       WHERE userId = ?`,
      [userId]
    ) as { avgRating: number | null; totalRatings: number } | undefined;

    res.json({
      ratings: ratings.map(rating => ({
        ...rating,
        // Convert SQLite timestamp to ISO string
        createdAt: new Date(rating.createdAt).toISOString()
      })),
      avgRating: ratingStats?.avgRating ? Number(ratingStats.avgRating.toFixed(1)) : null,
      totalRatings: ratingStats?.totalRatings || 0
    });
  } catch (error) {
    console.error('Get ratings error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Internal server error', details: errorMessage });
  }
});

export default router;