import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Test database connection before proceeding
async function testConnection() {
  try {
    console.log("Testing database connection...");
    const db = drizzle({
      connection: process.env.DATABASE_URL,
      schema,
      ws: ws,
    });

    // Try to execute a simple query to test the connection
    await db.execute(sql`SELECT 1`);
    console.log("Database connection successful");
    return db;
  } catch (error) {
    console.error("Database connection error:", error);
    throw error;
  }
}

// Export an async function to get the database instance
export async function getDb() {
  return await testConnection();
}

// For backward compatibility
export const db = drizzle({
  connection: process.env.DATABASE_URL,
  schema,
  ws: ws,
});