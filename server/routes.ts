import express from "express";
import passport from "passport";
import { db } from "../db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { generateContent } from "./services/openai";
import { setupAuth } from "./auth";
import cors from "cors";

export function registerRoutes(app: express.Express) {
  // Enable CORS for all routes
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3002', process.env.REPLIT_ORIGIN || 'https://localhost:3002'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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

  // Login route
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
        return res.status(401).json({ error: "Invalid email or password" });
      }

      req.login(user, (loginErr) => {
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

  app.post("/api/logout", (req, res) => {
    const userEmail = (req.user as any)?.email;
    console.log("Logout attempt for user:", userEmail);

    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      console.log("User logged out successfully:", userEmail);
      res.json({ success: true, message: "Logged out successfully" });
    });
  });

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
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { topic, treatmentCategory, contentType, platform, tone, additionalContext } = req.body;
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
        error: error instanceof Error ? error.message : "Failed to generate content"
      });
    }
  });

  return app;
}