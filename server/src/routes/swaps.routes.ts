import { Router } from 'express';
import { getDatabase } from '../database/db.js';
import { authenticateToken, type AuthRequest } from '../middleware/auth.js';
import { validateBody, swapRequestSchema } from '../middleware/validation.js';
import type { SwapRequest } from '../database/schema.js';

const router = Router();

// Helper function to get database connection
const getDb = async () => {
  return await getDatabase();
};

// Get user's swap requests
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { status, type = 'all' } = req.query as { status?: string; type?: string };

    let query = `
      SELECT sr.*, 
             requester.fullName as requesterName,
             requester.profilePicture as requesterPhoto,
             provider.fullName as providerName,
             provider.profilePicture as providerPhoto,
             os.name as offeredSkillName,
             ws.name as wantedSkillName
      FROM swap_requests sr
      JOIN users requester ON sr.requesterId = requester.id
      JOIN skills ws ON sr.skillRequestedId = ws.id
      JOIN users provider ON ws.userId = provider.id
      JOIN skills os ON sr.skillOfferedId = os.id
      WHERE (sr.requesterId = ? OR ws.userId = ?)
    `;

    const queryParams: (string | number)[] = [req.user!.id, req.user!.id];

    if (status) {
      query += ` AND sr.status = ?`;
      queryParams.push(status);
    }

    if (type === 'sent') {
      query += ` AND sr.requesterId = ?`;
      queryParams.push(req.user!.id);
    } else if (type === 'received') {
      query += ` AND ws.userId = ?`;
      queryParams.push(req.user!.id);
    }

    query += ` ORDER BY sr.createdAt DESC`;

    const db = await getDb();
    
    // Log the query for debugging
    console.log('Executing query:', query);
    console.log('With params:', queryParams);
    
    const swapRequests = await db.all(query, ...queryParams);
    
    if (!swapRequests) {
      console.warn('No swap requests found for user:', req.user!.id);
      return res.json([]);
    }
    
    res.json(swapRequests);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('Get swap requests error:', {
      message: errorMessage,
      stack: errorStack,
      userId: req.user?.id
    });
    
    res.status(500).json({ 
      error: 'Failed to fetch swap requests',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

// Create swap request
router.post('/', authenticateToken, validateBody(swapRequestSchema), async (req: AuthRequest, res) => {
  console.log('=== Creating swap request ===');
  console.log('Authenticated user ID:', req.user?.id);
  console.log('Request body:', req.body);
  
  if (!req.user) {
    console.error('No user in request');
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const { providerId, offeredSkillId, wantedSkillId, message } = req.body;
    
    console.log('Processing swap request with:', {
      providerId,
      offeredSkillId,
      wantedSkillId,
      message,
      requesterId: req.user.id
    });
    
    if (!providerId || !offeredSkillId || !wantedSkillId) {
      console.error('Missing required fields', { providerId, offeredSkillId, wantedSkillId });
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['providerId', 'offeredSkillId', 'wantedSkillId'],
        received: { providerId, offeredSkillId, wantedSkillId }
      });
    }
    const db = await getDb();

    // Validate that the requester owns the offered skill
    const offeredSkill = await db.get(
      `SELECT id FROM skills WHERE id = ? AND userId = ? AND isOffering = 1`,
      [offeredSkillId, req.user!.id]
    );

    if (!offeredSkill) {
      return res.status(400).json({ error: 'Invalid offered skill' });
    }

    // Validate that the provider owns the wanted skill
    const wantedSkill = await db.get(
      `SELECT id FROM skills WHERE id = ? AND userId = ? AND isOffering = 1`,
      [wantedSkillId, providerId]
    );

    if (!wantedSkill) {
      return res.status(400).json({ error: 'Invalid wanted skill' });
    }

    // Check if there's already a pending request
    const existingRequest = await db.get(
      `SELECT id FROM swap_requests 
       WHERE requesterId = ? 
       AND skillRequestedId = ?
       AND status = 'pending'`,
      [req.user!.id, wantedSkillId]
    );

    if (existingRequest) {
      return res.status(400).json({ 
        error: 'You already have a pending request for this skill' 
      });
    }

    // Create the swap request
    const result = await db.run(
      `INSERT INTO swap_requests (
        requesterId, skillOfferedId, skillRequestedId, 
        message, status, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))`,
      [
        req.user!.id,
        offeredSkillId,
        wantedSkillId,
        message
      ]
    );

    const swapRequestId = result.lastID;

    res.status(201).json({
      message: 'Swap request created successfully',
      swap_request_id: swapRequestId
    });
  } catch (error: any) {
    console.error('Create swap request error:', {
      message: error.message,
      stack: error.stack,
      body: req.body,
      userId: req.user?.id
    });
    
    // Handle specific database errors
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({ 
        error: 'Database constraint error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to create swap request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update swap request status
router.put('/:id/status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const swapRequestId = parseInt(req.params.id);
    const { status } = req.body;
    
    console.log('=== Update Swap Status ===');
    console.log('User ID:', req.user!.id);
    console.log('Requested status:', status);
    console.log('Swap request ID:', swapRequestId);

    if (!['accepted', 'rejected', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const db = await getDb();
    
    // First, get the swap request with basic info
    const swapRequest = await db.get(
      `SELECT sr.*, 
              s.userId as skillOwnerId,
              sr.requesterId = ? as isRequester
       FROM swap_requests sr
       JOIN skills s ON sr.skillRequestedId = s.id
       WHERE sr.id = ?`,
      [req.user!.id, swapRequestId]
    ) as (SwapRequest & { skillOwnerId: number, isRequester: number }) | undefined;
    
    console.log('Swap request details:', {
      swapRequest,
      currentUserId: req.user!.id,
      isRequester: swapRequest?.isRequester,
      isSkillOwner: swapRequest?.skillOwnerId === req.user!.id
    });

    if (!swapRequest) {
      return res.status(404).json({ error: 'Swap request not found' });
    }

    // Check authorization based on status change
    if (['accepted', 'rejected'].includes(status)) {
      // Only the skill owner (provider) can accept/reject
      if (swapRequest.skillOwnerId !== req.user!.id) {
        console.log('User is not authorized to accept/reject this request');
        return res.status(403).json({ 
          error: 'Only the provider can accept or reject the request',
          debug: {
            providerId: swapRequest.skillOwnerId,
            currentUserId: req.user!.id,
            isProvider: swapRequest.skillOwnerId === req.user!.id,
            status: status
          }
        });
      }
      
      // If the user is the requester, they can only cancel, not accept/reject
      if (swapRequest.requesterId === req.user!.id) {
        return res.status(403).json({
          error: 'You cannot accept or reject your own swap request',
          suggestion: 'If you want to cancel this request, use the cancel option instead'
        });
      }
    } else if (status === 'cancelled') {
      // Only the requester can cancel
      if (swapRequest.requesterId !== req.user!.id) {
        // If the provider is trying to cancel, suggest they reject it instead
        if (swapRequest.skillOwnerId === req.user!.id) {
          return res.status(400).json({
            error: 'You cannot cancel this request',
            suggestion: 'As the provider, you should use the reject option instead of cancel',
            allowedActions: ['rejected']
          });
        }
        
        return res.status(403).json({ 
          error: 'Only the requester can cancel the request',
          debug: {
            requesterId: swapRequest.requesterId,
            currentUserId: req.user!.id,
            isRequester: swapRequest.requesterId === req.user!.id
          }
        });
      }
    } else if (status === 'completed') {
      // Either the requester or provider can mark as completed
      if (swapRequest.requesterId !== req.user!.id && swapRequest.skillOwnerId !== req.user!.id) {
        return res.status(403).json({ 
          error: 'Only the requester or provider can complete the swap',
          debug: {
            requesterId: swapRequest.requesterId,
            providerId: swapRequest.skillOwnerId,
            currentUserId: req.user!.id
          }
        });
      }
    }

    // Start a transaction
    await db.run('BEGIN TRANSACTION');
    
    try {
      // Update the status
      await db.run(
        'UPDATE swap_requests SET status = ?, updatedAt = datetime("now") WHERE id = ?',
        [status, swapRequestId]
      );
      
      // If the status is 'completed', set the completedAt timestamp
      if (status === 'completed') {
        await db.run(
          'UPDATE swap_requests SET completedAt = datetime("now") WHERE id = ?',
          [swapRequestId]
        );
      }

      await db.run('COMMIT');
      res.json({ message: `Swap request ${status} successfully` });
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error updating swap request status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Internal server error', details: errorMessage });
  }
});

// Delete swap request
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const swapRequestId = parseInt(req.params.id);
    const db = await getDb();
    
    // Get the swap request with skill information
    const swapRequest = await db.get<{ skillRequestedId: number, requesterId: number }>(
      `SELECT sr.skillRequestedId, sr.requesterId 
       FROM swap_requests sr
       WHERE sr.id = ?`,
      [swapRequestId]
    );

    if (!swapRequest) {
      return res.status(404).json({ error: 'Swap request not found' });
    }

    // Get the provider's user ID from the requested skill
    const providerSkill = await db.get<{ userId: number }>(
      'SELECT userId FROM skills WHERE id = ?',
      [swapRequest.skillRequestedId]
    );

    if (!providerSkill) {
      return res.status(404).json({ error: 'Requested skill not found' });
    }

    // Check if the current user is the provider or the requester
    if (providerSkill.userId !== req.user!.id && swapRequest.requesterId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized to update this swap request' });
    }

    // Only allow deletion of pending requests
    const swapRequestStatus = await db.get<{ status: string } | undefined>(
      `SELECT status FROM swap_requests WHERE id = ?`,
      [swapRequestId]
    );

    if (!swapRequestStatus) {
      return res.status(404).json({ error: 'Swap request not found' });
    }

    if (swapRequestStatus.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending swap requests can be deleted' });
    }

    // Delete the swap request
    await db.run('DELETE FROM swap_requests WHERE id = ?', [swapRequestId]);

    res.json({ message: 'Swap request deleted successfully' });
  } catch (error) {
    console.error('Delete swap request error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Internal server error', details: errorMessage });
  }
});

export default router;