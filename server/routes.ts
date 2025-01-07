import express from "express";
import passport from "passport";
import { db } from "../db";
import { users, scheduledPosts } from "@db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { generateContent } from "./services/openai";
import { registerUser, setupPassport, updateUserPassword } from "./auth";
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

  // Authentication routes section
  app.post("/api/auth/email-login", async (req, res, next) => {
    console.log("Login attempt for email:", req.body.email);

    passport.authenticate('local', (err, user, info) => {
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

        if (user.emailVerified === false) {
          console.log("User email not verified:", user.email);
          return res.status(403).json({ 
            error: "Please verify your email address" 
          });
        }

        console.log("Login successful for user:", user.email);
        res.json(user);
      });
    })(req, res, next);
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

  // Add this route after the email verification endpoint
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const email = "drshanemckeown@gmail.com"; // Hardcoded for this specific fix
      const password = "password123";

      const user = await updateUserPassword(email, password);
      res.json({ message: "Password reset successful" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to reset password" 
      });
    }
  });

  return app;
}