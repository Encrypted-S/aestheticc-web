import express from "express";
import passport from "passport";
import { db } from "../db";
import { users, scheduledPosts } from "@db/schema";
import { eq } from "drizzle-orm";
import { generateContent } from "./services/openai";
import { registerUser, setupPassport } from "./auth";

export function registerRoutes(app: express.Router) {
  // Initialize passport
  const passportMiddleware = setupPassport();
  app.use(passportMiddleware.initialize());
  app.use(passportMiddleware.session());

  // User registration
  app.post("/api/auth/register", async (req, res) => {
    try {
      const user = await registerUser(req.body);
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Registration succeeded but login failed" });
        }
        res.json(user);
      });
    } catch (error) {
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Registration failed" 
      });
    }
  });

  // Email login route with passport
  app.post("/api/auth/email-login", passport.authenticate('local'), (req, res) => {
    res.json(req.user);
  });

  // Get current user
  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(req.user);
  });

  // Session logout route
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

  // Posts routes
  app.post("/api/posts", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      console.log("Creating new post:", req.body);
      const [post] = await db
        .insert(scheduledPosts)
        .values({
          userId: req.user.id,
          content: req.body.content,
          platforms: req.body.platforms,
          scheduledFor: new Date(req.body.scheduledFor),
          published: false,
        })
        .returning();

      console.log("Post created successfully:", post);
      res.json(post);
    } catch (error) {
      console.error("Failed to create post:", error);
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  // Get user's posts
  app.get("/api/posts", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const posts = await db.query.scheduledPosts.findMany({
        where: eq(scheduledPosts.userId, req.user.id),
        orderBy: (posts, { desc }) => [desc(posts.createdAt)],
      });

      res.json(posts);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  return app;
}