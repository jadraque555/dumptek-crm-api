import { db } from '../index';
import { users } from '../schema';
import { hashPassword } from '../../utils/password';
import logger from '../../utils/logger';

async function seed() {
  try {
    logger.info('Starting database seeding...');
    
    // Create default admin user
    const passwordHash = await hashPassword('admin123');
    
    await db.insert(users).values([
      {
        email: 'admin@dumptek.com',
        passwordHash,
        firstName: 'Admin',
        lastName: 'User',
        role: 'sales_manager',
        isActive: true,
      },
      {
        email: 'rep@dumptek.com',
        passwordHash: await hashPassword('rep123'),
        firstName: 'Sales',
        lastName: 'Rep',
        role: 'account_representative',
        isActive: true,
      },
    ]);
    
    logger.info('Database seeding completed!');
    logger.info('Default users created:');
    logger.info('  - admin@dumptek.com / admin123 (Sales Manager)');
    logger.info('  - rep@dumptek.com / rep123 (Account Representative)');
    
    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
