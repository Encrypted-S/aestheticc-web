import type { Express, Request } from "express";
import "./types";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { db } from "../db";
import { users, scheduledPosts } from "@db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-20.acacia" as const,
});

export function registerRoutes(app: Express) {
  // Auth routes
  app.get("/api/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  app.get("/api/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login?error=auth_failed" }),
    (req, res) => {
      res.send(`
        <script>
          window.opener.postMessage({ type: 'oauth-success', user: ${JSON.stringify(req.user)} }, '*');
          window.close();
        </script>
      `);
    }
  );

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/config", (req, res) => {
  // Google OAuth routes
  app.get("/api/auth/google", (req, res, next) => {
    console.log("Starting Google OAuth flow...");
    passport.authenticate("google")(req, res, next);
  });

  app.get(
    "/api/auth/google/callback",
    (req, res, next) => {
      console.log("Received callback from Google OAuth");
      passport.authenticate("google", {
        failureRedirect: "/login?error=auth_failed",
        failureMessage: true
      })(req, res, next);
    },
    (req, res) => {
      console.log("Authentication successful, sending response to client");
      res.send(`
        <script>
          window.opener.postMessage({ type: 'oauth-success' }, '*');
          window.close();
        </script>
      `);
    }
  );

    // Use the same domain as configured in Google OAuth
    const domain = 'https://f9e0b7b6-6cc4-401c-ad46-ba99d97a103f.shanemckeown.repl.co';
    
    res.json({ baseUrl: domain });
  });

  app.get("/api/auth/user", (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    res.json(req.user);
  });

  // Templates
  app.get("/api/templates", async (req, res) => {
    const allTemplates = await db.query.templates.findMany();
    res.json(allTemplates);
  });

  // Scheduled Posts
  app.post("/api/posts/schedule", async (req, res) => {
    const { content, platforms, scheduledFor } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const post = await db
      .insert(scheduledPosts)
      .values({
        userId,
        content,
        platforms,
        scheduledFor: new Date(scheduledFor),
      })
      .returning();

    res.json(post[0]);
  });
  // Content Generation
  app.post("/api/generate-content", async (req, res) => {
    const { topic, platform, tone } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const { generateContent } = await import("./services/openai");
      const content = await generateContent({ topic, platform, tone });
      res.json(content);
    } catch (error) {
      console.error("Content generation error:", error);
      res.status(500).json({ error: "Failed to generate content" });
    }
  });


  // Stripe Subscription
  app.post("/api/create-subscription", async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    let customerId = user?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user?.email,
        metadata: {
          userId: userId.toString(),
        },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${process.env.APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.APP_URL}/dashboard?canceled=true`,
    });

    res.json({ sessionId: session.id });
  });
}
