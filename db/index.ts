import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create the SQL client
const sql_client = neon(process.env.DATABASE_URL);
const db = drizzle(sql_client, { schema });

// Test database connection before proceeding
export async function testConnection() {
  try {
    console.log("Testing database connection...");

    // Try to execute a simple query to test the connection
    const result = await db.execute(sql`SELECT 1`);
    console.log("Database connection successful", result);
    return true;
  } catch (error) {
    console.error("Database connection error:", error);
    throw error;
  }
}

// Export an async function to get the database instance
export async function getDb() {
  await testConnection();
  return db;
}

// Export the db instance for direct use
export { db };