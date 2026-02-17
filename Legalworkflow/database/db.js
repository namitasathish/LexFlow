/**
 * SQLite DB access layer (Expo / expo-sqlite).
 * - Opens a persisted database on device (works offline, Expo Go supported).
 * - Exposes small helpers for queries.
 */
import * as SQLite from 'expo-sqlite';
import { migrateIfNeeded } from './migrations';
 
const DB_NAME = 'legal_workflow.db';
let dbPromise = null;
 
/**
 * Open the database (lazy singleton) and run migrations once.
 */
export async function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      // WAL is recommended for better perf.
      await db.execAsync(`PRAGMA journal_mode = WAL;`);
      await migrateIfNeeded(db);
      return db;
    })();
  }
  return dbPromise;
}
 
export async function run(sql, ...params) {
  const db = await getDb();
  return db.runAsync(sql, params);
}
 
export async function getAll(sql, ...params) {
  const db = await getDb();
  return db.getAllAsync(sql, params);
}
 
export async function getFirst(sql, ...params) {
  const db = await getDb();
  return db.getFirstAsync(sql, params);
}
 
/**
 * Simple ID generator (no crypto dependency; safe enough for local offline IDs).
 */
export function makeId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
 
