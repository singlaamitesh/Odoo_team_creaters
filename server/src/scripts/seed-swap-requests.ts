import { getDatabase } from '../database/db';

interface User {
  id: number;
  name: string;
  email: string;
}

interface Skill {
  id: number;
  userId: number;
  name: string;
  description: string;
  isOffering: boolean;
}

async function seedSwapRequests() {
  try {
    const db = await getDatabase();

    // Get users
    const users: User[] = await db.all(
      'SELECT id, name, email FROM users WHERE name IN (?, ?, ?, ?)',
      ['Jayant', 'Samar', 'Archita', 'Amitesh']
    );

    if (users.length < 4) {
      console.error('Not all required users found. Please make sure Jayant, Samar, Archita, and Amitesh exist in the database.');
      return;
    }

    // Get skills for these users
    const skills: Skill[] = await db.all(
      'SELECT id, userId, name, description, isOffering FROM skills WHERE userId IN (?, ?, ?, ?)',
      users.map(u => u.id)
    );

    if (skills.length < 4) {
      console.error('Not enough skills found. Please make sure each user has at least one skill they are offering.');
      return;
    }

    // Clear existing swap requests to avoid duplicates
    await db.run('DELETE FROM swap_requests');

    // Create swap requests
    const requests = [
      // Jayant wants to learn from Samar
      {
        requesterId: users.find(u => u.name === 'Jayant')!.id,
        skillOfferedId: skills.find(s => s.userId === users.find(u => u.name === 'Jayant')!.id && s.isOffering)!.id,
        skillRequestedId: skills.find(s => s.userId === users.find(u => u.name === 'Samar')!.id && s.isOffering)!.id,
        message: 'Hi Samar, I would love to learn from you!',
        status: 'pending'
      },
      // Samar wants to learn from Archita
      {
        requesterId: users.find(u => u.name === 'Samar')!.id,
        skillOfferedId: skills.find(s => s.userId === users.find(u => u.name === 'Samar')!.id && s.isOffering)!.id,
        skillRequestedId: skills.find(s => s.userId === users.find(u => u.name === 'Archita')!.id && s.isOffering)!.id,
        message: 'Archita, I\'ve heard great things about your skills. Would love to learn from you!',
        status: 'accepted'
      },
      // Archita wants to learn from Amitesh
      {
        requesterId: users.find(u => u.name === 'Archita')!.id,
        skillOfferedId: skills.find(s => s.userId === users.find(u => u.name === 'Archita')!.id && s.isOffering)!.id,
        skillRequestedId: skills.find(s => s.userId === users.find(u => u.name === 'Amitesh')!.id && s.isOffering)!.id,
        message: 'Amitesh, I\'d love to swap skills with you!',
        status: 'completed',
        completedAt: new Date().toISOString()
      },
      // Amitesh wants to learn from Jayant
      {
        requesterId: users.find(u => u.name === 'Amitesh')!.id,
        skillOfferedId: skills.find(s => s.userId === users.find(u => u.name === 'Amitesh')!.id && s.isOffering)!.id,
        skillRequestedId: skills.find(s => s.userId === users.find(u => u.name === 'Jayant')!.id && s.isOffering)!.id,
        message: 'Jayant, let\'s swap skills!',
        status: 'pending'
      }
    ];

    // Insert swap requests
    for (const request of requests) {
      const { requesterId, skillOfferedId, skillRequestedId, message, status } = request;
      
      await db.run(
        `INSERT INTO swap_requests 
        (requesterId, skillOfferedId, skillRequestedId, message, status, createdAt, updatedAt${status === 'completed' ? ', completedAt' : ''})
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now')${status === 'completed' ? ', datetime("now")' : ''})`,
        [requesterId, skillOfferedId, skillRequestedId, message, status]
      );
    }

    console.log('Successfully seeded swap requests!');
  } catch (error) {
    console.error('Error seeding swap requests:', error);
  } finally {
    process.exit(0);
  }
}

// Run the script
seedSwapRequests();
