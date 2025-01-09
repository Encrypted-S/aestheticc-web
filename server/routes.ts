import express from "express";
import cors from "cors";
import session from "express-session";
import { db } from "../db";
import { users, scheduledPosts } from "@db/schema";
import { eq } from "drizzle-orm";
import { generateContent } from "./services/openai";
import passport from "passport";
import multer from "multer";
import { Blob } from "node:buffer";
import { FormData } from "node-fetch";
import fetch from "node-fetch";

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB limit
  }
});

// Extend express-session types to include our user object
declare module 'express-session' {
  interface SessionData {
    user: {
      id: number;
      email: string;
      name: string;
      isPremium: boolean;
    };
  }
}

export function registerRoutes(app: express.Express) {
  // Enable CORS with credentials
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.REPLIT_ORIGIN 
      : 'http://0.0.0.0:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: true,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Initialize Passport middleware
  app.use(passport.initialize());
  app.use(passport.session());

  // Create API router
  const apiRouter = express.Router();

  // Google Auth Routes
  apiRouter.get("/auth/google",
    passport.authenticate("google", {
      scope: ["profile", "email"]
    })
  );

  apiRouter.get("/auth/google/callback",
    passport.authenticate("google", {
      failureRedirect: "/login",
      successRedirect: "/dashboard",
    })
  );

  // Get current auth status
  apiRouter.get("/auth/status", (req, res) => {
    if (req.isAuthenticated()) {
      res.json({ 
        isAuthenticated: true, 
        user: req.user 
      });
    } else {
      res.json({ 
        isAuthenticated: false 
      });
    }
  });

  // Login route - simplified for hardcoded email
  apiRouter.post("/login", (req, res) => {
    try {
      const { email } = req.body;
      console.log("Login attempt for:", email);

      // Hardcoded test user
      const testUser = {
        id: 1,
        email: email,
        name: "Test User",
        isPremium: false
      };

      // Store user in session
      req.session.user = testUser;
      console.log("User stored in session:", testUser);

      res.json({ 
        success: true,
        user: testUser
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // User info route
  apiRouter.get("/user", (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    res.json({
      success: true,
      user: req.session.user
    });
  });

  // Logout route
  apiRouter.post("/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destruction error:", err);
        return res.status(500).json({ error: "Failed to clear session" });
      }

      res.clearCookie('sessionId');
      res.json({ success: true });
    });
  });

  // Content generation endpoint
  apiRouter.post("/generate-content", async (req, res) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const content = await generateContent(req.body);
      res.json({ 
        success: true,
        content 
      });
    } catch (error) {
      console.error("Content generation error:", error);
      res.status(500).json({ 
        success: false,
        error: error instanceof Error ? error.message : "Content generation failed" 
      });
    }
  });

  // Posts endpoints
  apiRouter.get("/posts", async (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const posts = await db.query.scheduledPosts.findMany({
        where: eq(scheduledPosts.userId, req.session.user.id)
      });
      res.json(posts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  apiRouter.post("/posts", async (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const { scheduledFor, ...restBody } = req.body;
      const [post] = await db.insert(scheduledPosts)
        .values({
          ...restBody,
          userId: req.session.user.id,
          scheduledFor: new Date(scheduledFor),
          createdAt: new Date(),
        })
        .returning();
      res.json(post);
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  // Transcription endpoint
  apiRouter.post('/transcribe', upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    try {
      // Create form data for OpenAI
      const formData = new FormData();

      // Create a Buffer from the file data and convert it to Blob
      const audioBlob = new Blob([req.file.buffer], { type: req.file.mimetype });
      formData.append('file', audioBlob, 'audio.wav');
      formData.append('model', 'whisper-1');

      // Send to OpenAI
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('OpenAI API Error:', errorData);
        throw new Error('Failed to transcribe audio');
      }

      const data = await response.json();
      return res.json(data);
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: 'Failed to process audio' });
    }
  });

  // Mount API routes
  app.use("/api", apiRouter);

  return app;
}