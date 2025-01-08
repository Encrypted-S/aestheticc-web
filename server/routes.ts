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

      console.log("Registration attempt for email:", email);

      // Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (existingUser) {
        console.log("Registration failed - user exists:", email);
        return res.status(400).json({ error: "User already exists" });
      }

      // Hash password and create user
      const salt = randomBytes(16).toString('hex');
      const hashedPassword = (await scryptAsync(password, salt, 64)).toString('hex') + '.' + salt;

      console.log("Creating new user with email:", email);
      const [user] = await db
        .insert(users)
        .values({
          email,
          name,
          password: hashedPassword,
        })
        .returning();

      console.log("User created successfully:", { id: user.id, email: user.email });

      req.login(user, (err) => {
        if (err) {
          console.error("Login after registration failed:", err);
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
    console.log("Login attempt received for email:", req.body.email);

    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("Authentication error:", err);
        return res.status(500).json({ error: "Authentication error" });
      }

      if (!user) {
        console.log("Login failed:", info?.message);
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }

      req.login(user, (err) => {
        if (err) {
          console.error("Session creation error:", err);
          return res.status(500).json({ error: "Login error" });
        }

        console.log("User logged in successfully:", { id: user.id, email: user.email });
        return res.json({ 
          user: {
            id: user.id,
            email: user.email,
            name: user.name
          }
        });
      });
    })(req, res, next);
  });

  app.post("/logout", (req, res) => {
    const userEmail = (req.user as any)?.email;
    console.log("Logout attempt for user:", userEmail);

    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      console.log("User logged out successfully:", userEmail);
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