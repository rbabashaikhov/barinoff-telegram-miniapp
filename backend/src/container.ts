import { db } from './db/schema.js';
import { createSqliteRepositories } from './repositories/sqlite.js';

export const repos = createSqliteRepositories(db);
