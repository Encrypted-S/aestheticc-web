import express from "express";
import passport from "passport";
import { db } from "../db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { generateContent } from "./services/openai";
import { registerUser, setupPassport } from "./auth";
import cors from "cors";

export function registerRoutes(app: express.Router) {
  // Enable CORS for all routes
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? 'https://your-production-domain.com' 
      : 'http://localhost:5173',
    credentials: true
  }));

  // Initialize passport
  const passportMiddleware = setupPassport();
  app.use(passportMiddleware.initialize());
  app.use(passportMiddleware.session());

  // Core Authentication Routes
  app.post("/api/auth/email-login", (req, res, next) => {
    console.log("Login attempt received:", req.body.email); // Debug log

    passport.authenticate("local", (err: Error, user: any, info: { message?: string }) => {
      if (err) {
        console.error("Authentication error:", err);
        return res.status(500).json({ error: err.message });
      }

      if (!user) {
        console.log("Login failed:", info?.message);
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }

      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error("Login error:", loginErr);
          return res.status(500).json({ error: "Login failed" });
        }

        console.log("Login successful for user:", user.email);
        res.json({ 
          id: user.id,
          email: user.email,
          name: user.name,
          isPremium: user.isPremium
        });
      });
    })(req, res, next);
  });

  app.get("/api/auth/user", (req, res) => {
    console.log("User session check:", req.isAuthenticated()); // Debug log

    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const user = req.user as any;
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      isPremium: user.isPremium
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.sendStatus(200);
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

      res.json(content);
    } catch (error) {
      console.error("Content generation error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to generate content"
      });
    }
  });

  return app;
}