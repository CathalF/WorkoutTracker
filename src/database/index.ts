import { getDatabase } from './database';
import { seedDatabase } from './seed';

export function initializeDatabase(): void {
  const db = getDatabase();
  seedDatabase(db);
}

export { getDatabase } from './database';
