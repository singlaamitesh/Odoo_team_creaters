import { getDatabase } from '../database/db';
import readline from 'readline';

// Create a promise-based question function
const question = (rl: readline.Interface) => (query: string): Promise<string> => {
  return new Promise((resolve) => rl.question(query, resolve));
};

async function makeUserAdmin() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const ask = question(rl);
  try {
    // Get user email
    const email = await ask('Enter the email of the user to make admin: ');
    
    // Get database connection
    const db = await getDatabase();
    
    // Check if user exists
    const user = await db.get('SELECT id, email, isAdmin FROM users WHERE email = ?', [email]);
    
    if (!user) {
      console.error(`User with email ${email} not found`);
      rl.close();
      return;
    }
    
    if (user.isAdmin) {
      console.log(`User ${email} is already an admin`);
      rl.close();
      return;
    }
    
    // Confirm before making admin
    const confirm = await ask(`Are you sure you want to make ${email} an admin? (yes/no): `);
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('Operation cancelled');
      rl.close();
      return;
    }
    
    // Update user to admin
    await db.run('UPDATE users SET isAdmin = 1 WHERE email = ?', [email]);
    console.log(`Successfully made ${email} an admin`);
    
  } catch (error) {
    console.error('Error making user admin:', error);
  } finally {
    rl.close();
  }
}

// Run the script
makeUserAdmin().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
