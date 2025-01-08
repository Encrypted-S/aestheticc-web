import express from "express";
import session from "express-session";
import passport from "passport";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { getDb } from "../db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import ConnectPgSimple from "connect-pg-simple";
import { sql } from 'drizzle-orm';

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

    // Updated CORS configuration
    app.use(cors({
      origin: ['http://localhost:5173', 'http://localhost:3002'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    console.log("Setting up session store...");
    // Session configuration
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
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        secure: false, // Set to false in development
        sameSite: 'lax' as const,
        httpOnly: true
      }
    };

    app.use(session(sessionConfig));

    console.log("Initializing Passport...");
    app.use(passport.initialize());
    app.use(passport.session());

    // Register routes
    console.log("Registering routes...");
    registerRoutes(app);

    // Error handling middleware
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('Error:', err);
      res.status(500).json({ error: err.message || "Internal server error" });
    });

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
    console.log(`Attempting to start server on port ${port}...`);

    await new Promise<void>((resolve, reject) => {
      server.listen(Number(port), "0.0.0.0", () => {
        console.log(`Server running on port ${port}`);
        resolve();
      });

      server.on('error', (error) => {
        console.error("Server startup error:", error);
        reject(error);
      });
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