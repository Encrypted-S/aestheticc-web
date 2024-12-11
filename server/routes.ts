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
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(req.user);
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
    console.log("Starting Google OAuth flow with scopes:", ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email']);
    passport.authenticate("google", {
      scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email']
    })(req, res, next);
  });

  router.get(
    "/api/auth/google/callback",
    (req, res, next) => {
      console.log("Received Google OAuth callback", {
        query: req.query,
        session: req.session,
        isAuthenticated: req.isAuthenticated()
      });
      
      passport.authenticate("google", {
        failureRedirect: "/login?error=auth_failed",
        failureMessage: true,
        failWithError: true
      })(req, res, (err: Error | null) => {
        if (err) {
          console.error("Google authentication error:", err);
          return res.redirect('/login?error=auth_failed');
        }
        next();
      });
    },
    (req, res) => {
      console.log("Google OAuth authentication successful");
      const origin = 'https://f9e0b7b6-6cc4-401c-ad46-ba99d97a103f.replit.app';
      
      res.send(`
        <script>
          window.opener.postMessage({ type: 'oauth-success' }, '${origin}');
          window.close();
        </script>
      `);
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