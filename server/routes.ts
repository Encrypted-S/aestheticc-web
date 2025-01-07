import express from "express";
import passport from "passport";
import { db } from "../db";
import { users, scheduledPosts } from "@db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { generateContent } from "./services/openai";
import { registerUser, setupPassport } from "./auth";
import { generateVerificationToken, sendVerificationEmail, verifyEmail } from "./services/email-verification";

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

const PREMIUM_PRICE = 2999; // $29.99 in cents

export function registerRoutes(app: express.Router) {
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
        // Update user's premium status in database
        await db.update(users)
          .set({ isPremium: true })
          .where(eq(users.id, req.user.id));

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

  // User registration
  app.post("/api/auth/register", async (req, res) => {
    try {
      const user = await registerUser(req.body);
      console.log("User registered successfully:", user.id);

      try {
        const verificationToken = await generateVerificationToken(user.id);
        await sendVerificationEmail(user.email, verificationToken);
      } catch (error) {
        console.error("Failed to send verification email:", error);
      }

      res.json({ 
        message: "Registration successful. Please check your email to verify your account.",
        requiresVerification: true
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Registration failed" 
      });
    }
  });

  // Email verification endpoint
  app.get("/api/auth/verify-email", async (req, res) => {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Invalid token" });
    }

    const verified = await verifyEmail(token);

    if (verified) {
      res.redirect("/login?verified=true");
    } else {
      res.redirect("/login?error=verification_failed");
    }
  });

  // Email login route with passport
  app.post("/api/auth/email-login", passport.authenticate('local'), (req, res) => {
    if (req.user && !req.user.emailVerified) {
      generateVerificationToken(req.user.id)
        .then(token => sendVerificationEmail(req.user.email, token))
        .catch(error => console.error("Failed to send verification email:", error));

      return res.status(403).json({ 
        error: "Please verify your email address. A new verification email has been sent." 
      });
    }
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

    if (!req.user?.emailVerified) {
      return res.status(403).json({ error: "Please verify your email address" });
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