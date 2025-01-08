import express from "express";
import passport from "passport";
import { db } from "../db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { setupPassport } from "./auth";

// Initialize Stripe with secret key
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is required");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-08-16",
  typescript: true,
});

const PREMIUM_PRICE = 2999; // $29.99 in cents

export function registerRoutes(app: express.Application) {
  console.log("Registering routes...");

  // Initialize passport
  const passportMiddleware = setupPassport();
  app.use(passportMiddleware.initialize());
  app.use(passportMiddleware.session());

  // Premium purchase endpoint
  app.post("/api/create-checkout-session", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Premium Access",
                description: "One-time purchase for premium features",
              },
              unit_amount: PREMIUM_PRICE,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${req.headers.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/payment-cancelled`,
        customer_email: req.user.email,
        metadata: {
          userId: req.user.id.toString(),
        },
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Stripe session creation error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to create checkout session" 
      });
    }
  });

  // Authentication routes
  app.post("/api/auth/email-login", async (req, res, next) => {
    console.log("Login attempt for email:", req.body.email);

    passport.authenticate('local', (err: any, user: Express.User | false, info: { message?: string }) => {
      if (err) {
        console.error("Authentication error:", err);
        return res.status(500).json({ error: err.message });
      }

      if (!user) {
        console.log("Login failed:", info?.message);
        return res.status(401).json({ error: info?.message || "Login failed" });
      }

      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error("Login error:", loginErr);
          return res.status(500).json({ error: "Login failed" });
        }

        console.log("Login successful for user:", user.email);
        res.json(user);
      });
    })(req, res, next);
  });

  // Get current user
  app.get("/api/auth/user", (req, res) => {
    console.log("GET /api/auth/user - Auth status:", req.isAuthenticated());
    if (req.isAuthenticated()) {
      console.log("User is authenticated:", req.user);
      return res.json(req.user);
    }
    console.log("User is not authenticated");
    res.status(401).json({ error: "Not authenticated" });
  });

  // Session logout route
  app.post("/api/auth/logout", (req, res) => {
    console.log("POST /api/auth/logout - Processing logout");
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      console.log("Logout successful");
      res.sendStatus(200);
    });
  });

  // Error handling middleware
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({ error: err.message || "Internal server error" });
  });

  return app;
}
