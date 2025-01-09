import express from "express";
import cors from "cors";
import session from "express-session";
import { db } from "../db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { generateContent } from "./services/openai";

// Extend express-session types to include our user object
declare module 'express-session' {
  interface SessionData {
    user: {
      id: number;
      email: string;
      name: string;
      isPremium: boolean;
    };
  }
}

export function registerRoutes(app: express.Express) {
  // Enable CORS with credentials
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.REPLIT_ORIGIN 
      : 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Basic middleware setup
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Session configuration with proper security settings
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    name: 'sessionId',
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // Create API router
  const apiRouter = express.Router();

  // Login route
  apiRouter.post("/login", (req, res) => {
    try {
      const { email } = req.body;
      console.log("Login attempt for:", email);

      // Hardcoded test user
      const testUser = {
        id: 1,
        email: email,
        name: "Test User",
        isPremium: false
      };

      // Store user in session
      if (!req.session) {
        throw new Error("Session middleware not properly initialized");
      }

      req.session.user = testUser;
      console.log("User stored in session:", testUser);

      res.json({ 
        success: true,
        user: testUser
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // User info route
  apiRouter.get("/user", (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    res.json({
      success: true,
      user: req.session.user
    });
  });

  // Logout route
  apiRouter.post("/logout", (req, res) => {
    if (!req.session) {
      return res.status(500).json({ error: "Session not initialized" });
    }

    req.session.destroy((err) => {
      if (err) {
        console.error("Session destruction error:", err);
        return res.status(500).json({ error: "Failed to clear session" });
      }

      res.clearCookie('sessionId');
      res.json({ success: true });
    });
  });

  // Mount API routes
  app.use("/api", apiRouter);

  return app;
}