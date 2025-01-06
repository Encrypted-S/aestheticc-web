import express from "express";
import passport from "passport";
import { db } from "../db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { generateContent } from "./services/openai";

export function registerRoutes(app: express.Router) {
  // Auth routes
  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(req.user);
  });

  // Email login route
  app.post("/api/auth/email-login", async (req, res) => {
    const { email, password } = req.body;
    console.log("Attempting email login for:", email);

    // Check for the specific email and password
    if (email === "drshanemckeown@gmail.com" && password === "replpass") {
      try {
        // Create or update the user
        const [user] = await db
          .insert(users)
          .values({
            name: "Dr Shane McKeown",
            email: "drshanemckeown@gmail.com",
            subscriptionStatus: "active",
          })
          .onConflictDoUpdate({
            target: users.email,
            set: {
              name: "Dr Shane McKeown",
              subscriptionStatus: "active",
            },
          })
          .returning();

        if (!user) {
          throw new Error("Failed to create or update user");
        }

        req.login(user, (err) => {
          if (err) {
            console.error("Login failed:", err);
            return res.status(500).json({ error: "Login failed" });
          }
          console.log("Login successful for:", user.email);
          res.json(user);
        });
      } catch (error) {
        console.error("Email login error:", error);
        res.status(500).json({ error: "Login failed" });
      }
    } else {
      console.log("Invalid credentials for:", email);
      res.status(401).json({ error: "Invalid credentials" });
    }
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

  return app;
}