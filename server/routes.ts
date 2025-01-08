import express from "express";
import passport from "passport";
import { db } from "../db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { generateContent } from "./services/openai";
import { setupAuth } from "./auth";
import cors from "cors";
import session from "express-session";

export function registerRoutes(app: express.Express) {
  // Enable CORS for all routes with credentials
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.REPLIT_ORIGIN 
      : ['http://localhost:5173', 'http://localhost:3002'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Initialize authentication middleware
  setupAuth(app);

  // Google OAuth routes
  app.get("/api/auth/google", passport.authenticate("google", {
    scope: ["profile", "email"],
  }));

  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
      res.redirect("/dashboard");
    }
  );

  // Login route with proper error handling
  app.post("/api/login", (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    console.log("Login attempt received for email:", email);

    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("Authentication error:", err);
        return res.status(500).json({ error: "Internal authentication error occurred" });
      }

      if (!user) {
        console.log("Login failed:", info?.message);
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }

      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error("Session creation error:", loginErr);
          return res.status(500).json({ error: "Failed to create login session" });
        }

        console.log("User logged in successfully:", { id: user.id, email: user.email });
        return res.json({ 
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            isPremium: user.isPremium || false
          }
        });
      });
    })(req, res, next);
  });

  // Logout route with proper session cleanup
  app.post("/api/logout", (req, res) => {
    const userEmail = (req.user as any)?.email;
    console.log("Logout attempt for user:", userEmail);

    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destruction error:", err);
          return res.status(500).json({ error: "Failed to destroy session" });
        }
        res.clearCookie('connect.sid');
        console.log("User logged out successfully:", userEmail);
        res.json({ success: true, message: "Logged out successfully" });
      });
    });
  });

  // User info route with proper authentication check
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const user = req.user as any;
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isPremium: user.isPremium || false
      }
    });
  });

  // Content generation route
  app.post("/api/generate-content", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ 
        success: false,
        error: "Authentication required" 
      });
    }

    try {
      const { topic, treatmentCategory, contentType, platform, tone, additionalContext } = req.body;

      if (!topic || !treatmentCategory || !contentType || !platform || !tone) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields"
        });
      }

      const content = await generateContent({
        topic,
        treatmentCategory,
        contentType,
        platform,
        tone,
        additionalContext
      });

      res.json({ success: true, content });
    } catch (error) {
      console.error("Content generation error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred"
      });
    }
  });

  return app;
}