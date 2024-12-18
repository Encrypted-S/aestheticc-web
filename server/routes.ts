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
import { eq } from "drizzle-orm";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

export function registerRoutes(router: express.Router) {
  // Auth routes
  router.get("/api/auth/user", (req, res) => {
    console.log("Auth check - Session state:", {
      hasSession: !!req.session,
      sessionID: req.sessionID,
      isAuthenticated: req.isAuthenticated(),
      user: req.user,
      cookies: req.cookies,
      headers: {
        cookie: req.headers.cookie,
        authorization: req.headers.authorization
      }
    });

    // Check if session exists and is valid
    if (!req.session) {
      console.error("No session found");
      return res.status(401).json({ error: "No session found" });
    }

    // Verify authentication
    if (!req.isAuthenticated()) {
      console.error("User not authenticated");
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Verify user exists
    if (!req.user) {
      console.error("No user found in session");
      return res.status(401).json({ error: "No user found" });
    }

    // Update session expiry
    req.session.touch();

    // Force session save to ensure it's persisted
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ error: "Session save failed" });
      }
      res.json(req.user);
    });
  });

  // Analytics routes
  router.get("/api/analytics", async (req, res) => {
    const { timeRange = "7d" } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      // Get total posts
      const totalPosts = await db
        .select({ count: sql<number>`count(*)` })
        .from(scheduledPosts)
        .where(eq(scheduledPosts.userId, userId));

      // Get performance metrics
      const performance = await db
        .select({
          totalImpressions: sql<number>`sum(${contentPerformance.impressions})`,
          totalEngagements: sql<number>`sum(${contentPerformance.engagements})`,
        })
        .from(contentPerformance)
        .innerJoin(scheduledPosts, eq(contentPerformance.postId, scheduledPosts.id))
        .where(eq(scheduledPosts.userId, userId));

      // Get platform stats
      const platformStats = await db
        .select({
          platform: contentPerformance.platform,
          posts: sql<number>`count(distinct ${scheduledPosts.id})`,
          impressions: sql<number>`sum(${contentPerformance.impressions})`,
        })
        .from(contentPerformance)
        .innerJoin(scheduledPosts, eq(contentPerformance.postId, scheduledPosts.id))
        .where(eq(scheduledPosts.userId, userId))
        .groupBy(contentPerformance.platform);

      // Get content type performance
      const contentTypeStats = await db
        .select({
          type: analyticsEvents.contentType,
          posts: sql<number>`count(*)`,
          engagements: sql<number>`sum(case when ${analyticsEvents.eventType} = 'engagement' then 1 else 0 end)`,
        })
        .from(analyticsEvents)
        .where(eq(analyticsEvents.userId, userId))
        .groupBy(analyticsEvents.contentType);

      const totalImpressions = Number(performance[0]?.totalImpressions) || 0;
      const totalEngagements = Number(performance[0]?.totalEngagements) || 0;
      const engagementRate = totalImpressions > 0 ? totalEngagements / totalImpressions : 0;

      // Ensure platformStats and contentTypeStats are always arrays
      const formattedPlatformStats = platformStats || [];
      const formattedContentTypeStats = contentTypeStats || [];

      console.log('Analytics response:', {
        totalPosts: Number(totalPosts[0]?.count) || 0,
        totalImpressions,
        engagementRate,
        platformStats: formattedPlatformStats,
        contentTypeStats: formattedContentTypeStats,
      });

      res.json({
        totalPosts: Number(totalPosts[0]?.count) || 0,
        totalImpressions,
        engagementRate,
        platformStats: formattedPlatformStats,
        contentTypeStats: formattedContentTypeStats,
      });
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
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
}