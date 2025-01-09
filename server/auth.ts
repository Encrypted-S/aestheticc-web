import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { users } from "@db/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";
import type { Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";

// Hardcoded development credentials
const DEV_EMAIL = "drshanemckeown@gmail.com";
const DEV_PASSWORD = "password123";

export function setupAuth(app: Express) {
  // Setup session middleware
  const MemoryStore = createMemoryStore(session);
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: true,
    saveUninitialized: true,
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    cookie: {
      secure: false,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax'
    }
  }));

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Local Strategy - Simple email/password check
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          console.log("Local strategy authentication for email:", email);

          // Check against hardcoded development credentials
          if (email === DEV_EMAIL && password === DEV_PASSWORD) {
            console.log("Dev credentials match, checking for existing user");

            let user = await db.query.users.findFirst({
              where: eq(users.email, email),
            });

            if (!user) {
              console.log("Creating new dev user");
              try {
                const [newUser] = await db.insert(users)
                  .values({
                    email: DEV_EMAIL,
                    name: "Development User",
                    emailVerified: true
                  })
                  .returning();
                user = newUser;
                console.log("Dev user created successfully:", user);
              } catch (error) {
                console.error("Failed to create dev user:", error);
                return done(null, false, { message: "Failed to create development user" });
              }
            }

            console.log("Dev user authenticated successfully:", user);
            return done(null, user);
          }

          console.log("Invalid credentials provided");
          return done(null, false, { message: "Invalid email or password" });
        } catch (error) {
          console.error("Authentication error:", error);
          return done(error);
        }
      }
    )
  );

  // Google Strategy (keep existing implementation)
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: process.env.NODE_ENV === 'production'
            ? "https://aestheticc-web.replit.app/api/auth/google/callback"
            : "https://aestheticc-web.replit.app/api/auth/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            let user = await db.query.users.findFirst({
              where: eq(users.googleId, profile.id),
            });

            if (!user) {
              const [newUser] = await db
                .insert(users)
                .values({
                  email: profile.emails?.[0]?.value || "",
                  name: profile.displayName,
                  googleId: profile.id,
                  avatarUrl: profile.photos?.[0]?.value,
                  emailVerified: true,
                })
                .returning();
              user = newUser;
            }
            return done(null, user);
          } catch (error) {
            return done(error);
          }
        }
      )
    );
  }

  passport.serializeUser((user: any, done) => {
    console.log("Serializing user:", user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log("Deserializing user:", id);
      const user = await db.query.users.findFirst({
        where: eq(users.id, id),
      });
      done(null, user);
    } catch (error) {
      console.error("Deserialization error:", error);
      done(error, null);
    }
  });
}