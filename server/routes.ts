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

export function registerRoutes(app: express.Router) {
  // Auth routes
  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(req.user);
  });

  // Dev login route
  if (process.env.NODE_ENV === "development") {
    app.post("/api/auth/dev-login", async (req, res) => {
      try {
        const [user] = await db
          .insert(users)
          .values({
            name: "Dev User",
            email: "dev@example.com",
            subscriptionStatus: "active",
          })
          .onConflictDoUpdate({
            target: users.email,
            set: {
              name: "Dev User",
              subscriptionStatus: "active",
            },
          })
          .returning();

        if (!user) {
          throw new Error("Failed to create or update dev user");
        }

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

  // Content generation route
  app.post("/api/generate-content", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { topic, treatmentCategory, contentType, platform, tone, additionalContext } = req.body;

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

  // Session logout route
  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.sendStatus(200);
    });
  });

  // Templates routes
  app.get("/api/templates", async (req, res) => {
    try {
      const allTemplates = await db.query.templates.findMany();
      res.json(allTemplates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  // Analytics routes
  app.post("/api/analytics/track", async (req, res) => {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const { eventType, platform, contentType, metadata } = req.body;
      await trackAnalyticsEvent({
        userId: req.user.id,
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
    app.post("/api/analytics/generate-sample", async (req, res) => {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      try {
        await generateSampleAnalytics(req.user.id);
        res.json({ success: true });
      } catch (error) {
        console.error("Sample data generation error:", error);
        res.status(500).json({ error: error instanceof Error ? error.message : "Failed to generate sample data" });
      }
    });
  }

  // Google OAuth routes
  app.get("/api/auth/google", (req, res, next) => {
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

  app.get(
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

    // Posts routes
  app.get("/api/posts/scheduled", async (req, res) => {
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
  app.post("/api/create-subscription", async (req, res) => {
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

  return app;
}