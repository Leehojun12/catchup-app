import { appSchema, tableSchema } from '@nozbe/watermelondb';

// Increment whenever you add/modify tables or columns (requires a new dev build).
export const SCHEMA_VERSION = 1;

export const schema = appSchema({
  version: SCHEMA_VERSION,
  tables: [
    tableSchema({
      name: 'events',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'date', type: 'string', isIndexed: true }, // 'YYYY-MM-DD'
        { name: 'start_time', type: 'string', isOptional: true }, // 'HH:mm'
        { name: 'end_time', type: 'string', isOptional: true }, // 'HH:mm'
        { name: 'location', type: 'string', isOptional: true },
        { name: 'members', type: 'string', isOptional: true }, // JSON-encoded string[]
        { name: 'memo', type: 'string', isOptional: true },
        { name: 'all_day', type: 'boolean' },
        { name: 'reminder_minutes', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' }, // Unix ms
        { name: 'updated_at', type: 'number' }, // Unix ms
      ],
    }),
  ],
});

export default schema;
