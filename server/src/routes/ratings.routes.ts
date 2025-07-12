import { Router } from 'express';
import { getDatabase } from '../database/db.js';
import { authenticateToken, type AuthRequest } from '../middleware/auth.js';
import { validateBody, ratingSchema } from '../middleware/validation.js';
import type { Rating } from '../database/schema.js';

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
      `SELECT * FROM swaps WHERE id = ? AND status = 'completed'`,
      [swapId]
    );

    if (!swapRequest) {
      return res.status(404).json({ error: 'Completed swap request not found' });
    }

    // Check if user is part of this swap
    if (swapRequest.requesterId !== req.user!.id && swapRequest.providerId !== req.user!.id) {
      return res.status(403).json({ error: 'You are not part of this swap' });
    }

    // Determine who is being rated (the other person in the swap)
    const ratedId = swapRequest.requesterId === req.user!.id 
      ? swapRequest.providerId 
      : swapRequest.requesterId;

    // Check if rating already exists
    const existingRating = await db.get(
      `SELECT id FROM ratings WHERE swapId = ? AND raterId = ?`,
      [swapId, req.user!.id]
    );

    if (existingRating) {
      return res.status(400).json({ error: 'You have already rated this swap' });
    }

    // Insert rating
    await db.run(
      `INSERT INTO ratings (swapId, raterId, ratedId, rating, feedback, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [swapId, req.user!.id, ratedId, rating, feedback || null]
    );

    // Update the swap with the rating
    if (req.user!.id === swapRequest.requesterId) {
      await db.run(
        `UPDATE swaps 
         SET ratingByRequester = ?, feedbackByRequester = ?, updatedAt = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [rating, feedback || null, swapId]
      );
    } else {
      await db.run(
        `UPDATE swaps 
         SET ratingByProvider = ?, feedbackByProvider = ?, updatedAt = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [rating, feedback || null, swapId]
      );
    }

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