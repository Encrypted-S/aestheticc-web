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

const PgSession = ConnectPgSimple(session);

async function startServer() {
  const app = express();

  try {
    console.log("Initializing server...");

    // Test database connection first
    console.log("Testing database connection...");
    const db = await getDb();
    console.log("Database connection successful");

    // Basic middleware
    app.use(express.json());
    app.use(cookieParser());
    app.use(cors({
      origin: true,
      credentials: true
    }));

    console.log("Setting up session store...");
    // Session configuration
    const sessionStore = new PgSession({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      tableName: 'session'
    });

    app.use(session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || 'your-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        secure: false, // Set to false to allow non-HTTPS in development
        sameSite: 'lax'
      }
    }));

    console.log("Initializing Passport...");
    // Initialize Passport
    app.use(passport.initialize());
    app.use(passport.session());

    // Passport serialization
    passport.serializeUser((user: Express.User, done) => {
      console.log("Serializing user:", user.id);
      done(null, user.id);
    });

    passport.deserializeUser(async (id: number, done) => {
      try {
        console.log("Deserializing user:", id);
        const user = await db.query.users.findFirst({
          where: eq(users.id, id)
        });
        done(null, user);
      } catch (err) {
        console.error("User deserialization error:", err);
        done(err);
      }
    });

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
    const PORT = process.env.NODE_ENV === 'development' ? 5001 : (process.env.PORT || 5000);
    console.log(`Attempting to start server on port ${PORT}...`);

    await new Promise<void>((resolve, reject) => {
      server.listen(Number(PORT), "0.0.0.0", () => {
        console.log(`Server running on port ${PORT}`);
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