import express from "express";
import passport from "passport";
import { db } from "../db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { generateContent } from "./services/openai";
import { registerUser, setupPassport, updateUserPassword } from "./auth";

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const PREMIUM_PRICE = 2999; // $29.99 in cents

export function registerRoutes(app: express.Router) {
  // Initialize passport
  const passportMiddleware = setupPassport();
  app.use(passportMiddleware.initialize());
  app.use(passportMiddleware.session());

  // Authentication routes
  app.post("/api/login", (req, res, next) => {
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

  app.post("/api/logout", (req, res) => {
    req.logout(() => {
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
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

  // Stripe endpoints
  app.post("/api/create-checkout-session", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const user = req.user as any;

      // Create new Checkout Session
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            unit_amount: PREMIUM_PRICE,
            product_data: {
              name: 'Premium Access',
              description: 'One-time purchase for premium features',
            },
          },
          quantity: 1,
        }],
        success_url: `${req.headers.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/payment-cancelled`,
        customer_email: user.email,
        metadata: {
          userId: user.id.toString(),
        },
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to create checkout session" 
      });
    }
  });

  // Verify payment status
  app.get("/api/verify-payment", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { session_id } = req.query;
    if (!session_id || typeof session_id !== "string") {
      return res.status(400).json({ error: "Invalid session ID" });
    }

    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);

      if (session.payment_status === "paid") {
        // Update user's premium status
        await db.update(users)
          .set({ isPremium: true })
          .where(eq(users.id, (req.user as any).id));

        return res.json({ status: "success" });
      }

      res.json({ status: session.payment_status });
    } catch (error) {
      console.error("Payment verification error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to verify payment" 
      });
    }
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