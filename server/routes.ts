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

  // Session configuration - simplified for development
  app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Create API router
  const apiRouter = express.Router();

  // Login route - simplified for hardcoded email
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
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    res.json({
      success: true,
      user: req.session.user
    });
  });

  // Logout route
  apiRouter.post("/logout", (req, res) => {
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