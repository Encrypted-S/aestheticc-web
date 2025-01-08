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
    origin: ['http://localhost:5173', 'http://localhost:3002'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Initialize passport
  const passportMiddleware = setupPassport();
  app.use(passportMiddleware.initialize());
  app.use(passportMiddleware.session());

  // Authentication Routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const user = await registerUser(req.body);
      req.login(user, (err) => {
        if (err) {
          console.error("Login error after registration:", err);
          return res.status(500).json({ error: "Error logging in after registration" });
        }
        res.json({ message: "Registration successful" });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Registration failed" });
    }
  });

  app.post("/api/auth/email-login", (req, res, next) => {
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
      res.json({ message: "Logged out successfully" });
    });
  });

  if (process.env.NODE_ENV === 'development') {
    app.post("/api/auth/dev-login", async (req, res) => {
      try {
        // Find or create a test user
        let user = await db.query.users.findFirst({
          where: eq(users.email, 'test@example.com'),
        });

        if (!user) {
          const [newUser] = await db.insert(users).values({
            email: 'test@example.com',
            name: 'Test User',
            password: 'test-password-hash',
            subscriptionStatus: 'free',
            emailVerified: true,
          }).returning();
          user = newUser;
        }

        req.login(user, (err) => {
          if (err) {
            return res.status(500).json({ error: "Dev login failed" });
          }
          res.json({ message: "Dev login successful" });
        });
      } catch (error) {
        console.error("Dev login error:", error);
        res.status(500).json({ error: "Dev login failed" });
      }
    });
  }

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