import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // `db/schema.ts` opens the default SQLite file at module scope (used by tests that don't
    // pass an in-memory DB explicitly). Running test files in parallel can make separate
    // worker processes race for the same file's WAL lock ("database is locked"). Disabling
    // file parallelism only affects test execution speed, not the booking engine itself.
    fileParallelism: false,
  },
});
