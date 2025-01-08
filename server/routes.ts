import express from "express";
import passport from "passport";
import { db } from "../db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { generateContent } from "./services/openai";
import { setupAuth } from "./auth";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import cors from "cors";

const scryptAsync = promisify(scrypt);

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
  app.get("/auth/google", passport.authenticate("google", {
    scope: ["profile", "email"],
  }));

  app.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
      res.redirect("/dashboard");
    }
  );

  // Basic authentication routes
  app.post("/register", async (req, res) => {
    try {
      const { email, password, name } = req.body;

      // Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      // Hash password and create user
      const salt = randomBytes(16).toString('hex');
      const hashedPassword = (await scryptAsync(password, salt, 64)).toString('hex') + '.' + salt;

      const [user] = await db
        .insert(users)
        .values({
          email,
          name,
          password: hashedPassword,
        })
        .returning();

      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Error logging in after registration" });
        }
        return res.json({ user });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ error: "Authentication error" });
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Login error" });
        }
        return res.json({ user });
      });
    })(req, res, next);
  });

  app.post("/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(req.user);
  });

  // Content generation route
  app.post("/generate-content", async (req, res) => {
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