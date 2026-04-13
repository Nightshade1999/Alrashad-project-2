import { PowerSyncDatabase } from '@powersync/web';
import { AppSchema } from './schema';

/**
 * Global PowerSync database instance.
 * Using a module-level singleton ensures it survives HMR during development
 * and prevents "database already open" errors.
 */
let powerSyncInstance: PowerSyncDatabase | null = null;
let isInitialized = false;

export const getPowerSync = () => {
  if (powerSyncInstance) return powerSyncInstance;

  powerSyncInstance = new PowerSyncDatabase({
    schema: AppSchema,
    database: {
      dbFilename: 'powersync.db',
    },
  });

  return powerSyncInstance;
};

export const initPowerSync = async () => {
  const db = getPowerSync();
  if (isInitialized) return db;
  
  await db.init();
  isInitialized = true;
  return db;
};
