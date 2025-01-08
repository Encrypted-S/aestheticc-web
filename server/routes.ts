import express from "express";
import passport from "passport";
import { db } from "../db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { generateContent } from "./services/openai";
import { setupAuth } from "./auth";
import cors from "cors";
import session from "express-session";

export function registerRoutes(app: express.Express) {
  // Enable CORS for all routes with credentials
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.REPLIT_ORIGIN 
      : ['http://localhost:5173', 'http://localhost:3002'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  }));

  // Basic middleware - must come before routes
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Session configuration
  const sessionConfig: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  app.use(session(sessionConfig));
  app.use(passport.initialize());
  app.use(passport.session());

  // Create API router
  const apiRouter = express.Router();

  // Login route with error handling
  apiRouter.post("/login", (req, res, next) => {
    try {
      const { email, password } = req.body;
      console.log("Login attempt for:", email);

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      passport.authenticate("local", (err: any, user: any, info: any) => {
        if (err) {
          console.error("Login error:", err);
          return res.status(500).json({ error: "Authentication error occurred" });
        }

        if (!user) {
          console.log("Login failed:", info?.message);
          return res.status(401).json({ error: info?.message || "Invalid credentials" });
        }

        req.logIn(user, (loginErr) => {
          if (loginErr) {
            console.error("Session error:", loginErr);
            return res.status(500).json({ error: "Failed to create session" });
          }

          console.log("User logged in successfully:", user.email);
          return res.json({ 
            success: true,
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              isPremium: user.isPremium || false
            }
          });
        });
      })(req, res, next);
    } catch (error) {
      console.error("Login route error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // User info route with session verification
  apiRouter.get("/user", (req, res) => {
    try {
      console.log("User info request - Session:", req.session);
      console.log("User info request - Auth:", req.isAuthenticated());

      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = req.user as any;
      console.log("Returning user info for:", user.email);

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isPremium: user.isPremium || false
        }
      });
    } catch (error) {
      console.error("User info error:", error);
      res.status(500).json({ error: "Failed to fetch user info" });
    }
  });

  // Logout route with session cleanup
  apiRouter.post("/logout", (req, res) => {
    const userEmail = (req.user as any)?.email;
    console.log("Logout request for:", userEmail);

    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Logout failed" });
      }

      req.session.destroy((err) => {
        if (err) {
          console.error("Session destruction error:", err);
          return res.status(500).json({ error: "Failed to clear session" });
        }

        res.clearCookie('connect.sid');
        console.log("User logged out successfully:", userEmail);
        res.json({ success: true });
      });
    });
  });

  // Mount API routes before any other middleware
  app.use("/api", apiRouter);

  return app;
}