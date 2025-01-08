import express from "express";
import session from "express-session";
import passport from "passport";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { setupVite, serveStatic } from "./vite";
import { getDb } from "../db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import ConnectPgSimple from "connect-pg-simple";
import { sql } from 'drizzle-orm';
import { registerRoutes } from "./routes";

const PgSession = ConnectPgSimple(session);

async function startServer() {
  const app = express();
  const db = await getDb();

  try {
    console.log("Initializing server...");

    // Test database connection first
    console.log("Testing database connection...");
    await db.execute(sql`SELECT 1`);
    console.log("Database connection successful");

    // Basic middleware
    app.use(express.json());
    app.use(cookieParser());

    // CORS configuration
    app.use(cors({
      origin: ['http://localhost:5173', 'http://localhost:3002', process.env.REPLIT_ORIGIN || 'https://localhost:3002'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    // Session configuration
    console.log("Setting up session store...");
    const sessionConfig = {
      store: new PgSession({
        conObject: {
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        },
        tableName: 'session',
        createTableIfMissing: true
      }),
      secret: process.env.SESSION_SECRET || 'your-secret-key',
      resave: true,
      saveUninitialized: true,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        httpOnly: true
      }
    };

    app.use(session(sessionConfig));

    // Initialize passport and session
    app.use(passport.initialize());
    app.use(passport.session());

    // Register routes
    console.log("Setting up routes...");
    registerRoutes(app);

    // Setup Vite or static files
    const server = createServer(app);

    if (process.env.NODE_ENV === "development") {
      console.log("Setting up Vite in development mode...");
      await setupVite(app, server);
    } else {
      console.log("Setting up static files for production...");
      serveStatic(app);
    }

    // Start server
    const port = process.env.PORT || 3002;
    console.log(`Starting server on port ${port}...`);

    server.listen(Number(port), "0.0.0.0", () => {
      console.log(`Server running on port ${port}`);
    });

    return server;
  } catch (error) {
    console.error("Server startup error:", error);
    throw error;
  }
}

startServer().catch(error => {
  console.error("Failed to start server:", error);
  process.exit(1);
});