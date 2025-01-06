import express from "express";
import passport from "passport";
import { sql } from "drizzle-orm";
import { db } from "../db";
import {
  users,
  scheduledPosts,
  templates,
  analyticsEvents,
  contentPerformance,
} from "@db/schema";
import { trackAnalyticsEvent, generateSampleAnalytics } from "./services/analytics";
import { generateContent } from "./services/openai";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

export function registerRoutes(router: express.Router) {
  // Auth routes
  router.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!req.user) {
      return res.status(401).json({ error: "No user found" });
    }

    res.json(req.user);
  });

  router.get("/api/auth/google", (req, res, next) => {
    console.log("Starting Google OAuth flow:", {
      scopes: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'],
      headers: req.headers,
      referer: req.headers.referer,
      host: req.headers.host
    });
    passport.authenticate("google", {
      scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email']
    })(req, res, next);
  });

  router.get(
    "/api/auth/google/callback",
    (req, res, next) => {
      console.log("Google OAuth callback received:", {
        headers: {
          host: req.headers.host,
          referer: req.headers.referer,
          origin: req.headers.origin
        },
        query: req.query,
        session: req.session ? {
          ...req.session,
          cookie: req.session.cookie ? {
            ...req.session.cookie,
            expires: req.session.cookie.expires?.toISOString()
          } : undefined
        } : null,
        isAuthenticated: req.isAuthenticated(),
        user: req.user,
        timestamp: new Date().toISOString(),
        state: req.query.state,
        code: req.query.code ? 'present' : 'missing'
      });

      passport.authenticate("google", {
        failureRedirect: "/login?error=auth_failed",
        failureMessage: true,
        failWithError: true,
        session: true
      })(req, res, (err: Error | null) => {
        if (err) {
          console.error("Google authentication error:", {
            error: err.message,
            stack: err.stack,
            name: err.name
          });
          return res.redirect('/login?error=auth_failed');
        }

        console.log("Authentication successful, session state:", {
          sessionExists: !!req.session,
          isAuthenticated: req.isAuthenticated(),
          user: req.user,
          sessionID: req.sessionID
        });

        // Ensure session is saved before redirect
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            return res.redirect('/login?error=session_error');
          }

          if (req.session) {
            req.session.touch(); // Update session expiry
          }

          // Send response with proper origin check
          res.send(`
            <script>
              if (window.opener) {
                const targetOrigin = window.opener.origin;
                console.log("Sending success message to:", targetOrigin);
                window.opener.postMessage(
                  { type: 'oauth-success' },
                  targetOrigin
                );
                window.close();
              } else {
                window.location.href = '/dashboard';
              }
            </script>
          `);
        });
      });
    }
  );

  router.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.sendStatus(200);
    });
  });

  // Development-only routes
  if (process.env.NODE_ENV === "development") {
    router.post("/api/auth/dev-login", async (req, res) => {
      try {
        const [user] = await db
          .insert(users)
          .values({
            name: "Dev User",
            email: "dev@example.com",
          })
          .onConflictDoUpdate({
            target: users.email,
            set: {
              name: "Dev User",
            },
          })
          .returning();

        req.login(user, (err) => {
          if (err) {
            console.error("Login failed:", err);
            return res.status(500).json({ error: "Login failed" });
          }
          res.json(user);
        });
      } catch (error) {
        console.error("Dev login error:", error);
        res.status(500).json({ error: "Login failed" });
      }
    });
  }

  // Templates routes
  router.get("/api/templates", async (req, res) => {
    try {
      const allTemplates = await db.query.templates.findMany();
      res.json(allTemplates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  // Posts routes
  router.get("/api/posts/scheduled", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const posts = await db.query.scheduledPosts.findMany({
        where: eq(scheduledPosts.userId, req.user.id),
      });
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scheduled posts" });
    }
  });

  // Subscription routes
  router.post("/api/create-subscription", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const session = await stripe.checkout.sessions.create({
        customer_email: req.user.email,
        line_items: [
          {
            price: "price_H5ggYwtDq4fbrJ",
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${process.env.FRONTEND_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/dashboard`,
      });

      res.json({ sessionId: session.id });
    } catch (error) {
      console.error("Subscription error:", error);
      res.status(500).json({ error: "Failed to create subscription" });
    }
  });

  // Analytics routes
  router.post("/api/analytics/track", async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const { eventType, platform, contentType, metadata } = req.body;
      await trackAnalyticsEvent({
        userId,
        eventType,
        platform,
        contentType,
        metadata,
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Analytics tracking error:", error);
      res.status(500).json({ error: "Failed to track analytics event" });
    }
  });

  // Development routes for generating sample data
  if (process.env.NODE_ENV === "development") {
    router.post("/api/analytics/generate-sample", async (req, res) => {
      console.log("Received request to generate sample data");
      const userId = req.user?.id;
      if (!userId) {
        console.log("No user ID found in request");
        return res.status(401).json({ error: "Unauthorized" });
      }

      try {
        console.log("Starting sample data generation for user:", userId);
        await generateSampleAnalytics(userId);
        console.log("Successfully generated sample data");
        res.json({ success: true });
      } catch (error) {
        console.error("Sample data generation error:", error);
        res.status(500).json({ error: error instanceof Error ? error.message : "Failed to generate sample data" });
      }
    });
  }

  // Content generation routes (from edited snippet)
  router.post("/api/generate-content", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { topic, treatmentCategory, contentType, platform, tone, additionalContext } = req.body;

      // Track content generation attempt
      await trackAnalyticsEvent({
        userId: req.user.id,
        eventType: "generate_content",
        platform,
        contentType,
        metadata: { topic, treatmentCategory, tone }
      });

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
}