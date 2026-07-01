import './polyfills'; // MUST be first
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { schema } from './schema';
import Event from './models/Event';

const adapter = new SQLiteAdapter({
  schema,
  jsi: true, // high-performance JSI mode (requires a dev build, not Expo Go)
  onSetUpError: (error) => {
    console.error('[WatermelonDB] setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [Event],
});

export default database;
