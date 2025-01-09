import express from "express";
import cors from "cors";
import session from "express-session";
import { db } from "../db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { generateContent } from "./services/openai";

export function registerRoutes(app: express.Express) {
  // Basic middleware setup
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Enable CORS with credentials
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.REPLIT_ORIGIN 
      : ['http://localhost:5173', 'http://localhost:3002'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Session configuration
  const sessionConfig: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    name: 'sessionId', // Change cookie name from connect.sid
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  app.use(session(sessionConfig));

  // Create API router
  const apiRouter = express.Router();

  // Login route with hardcoded test user
  apiRouter.post("/login", (req, res) => {
    try {
      const { email } = req.body;
      console.log("Login attempt for:", email);

      // For testing: Hardcoded successful login
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