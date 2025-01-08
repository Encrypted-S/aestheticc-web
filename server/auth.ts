import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users } from "@db/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";
import type { Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";

const scryptAsync = promisify(scrypt);

const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    try {
      const [hashedPassword, salt] = storedPassword.split(".");
      if (!hashedPassword || !salt) {
        console.error("Invalid stored password format");
        return false;
      }
      const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
      const suppliedPasswordBuf = (await scryptAsync(
        suppliedPassword,
        salt,
        64
      )) as Buffer;
      return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
    } catch (error) {
      console.error("Password comparison error:", error);
      return false;
    }
  },
};

export function setupAuth(app: Express) {
  // Setup session middleware
  const MemoryStore = createMemoryStore(session);
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Local Strategy
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
        passReqToCallback: true,
      },
      async (req, email, password, done) => {
        try {
          console.log("Attempting authentication for email:", email);
          const user = await db.query.users.findFirst({
            where: eq(users.email, email),
          });

          if (!user) {
            console.log("User not found:", email);
            return done(null, false, { message: "Invalid email or password" });
          }

          console.log("Found user:", { id: user.id, email: user.email, hasPassword: !!user.password });

          // Handle users without passwords or undefined password
          if (!user.password) {
            console.log("User without password attempting login:", email);
            return done(null, false, { message: "Invalid email or password" });
          }

          const isValid = await crypto.compare(password, user.password);
          if (!isValid) {
            console.log("Invalid password for user:", email);
            return done(null, false, { message: "Invalid email or password" });
          }

          console.log("Authentication successful for user:", email, "with id:", user.id);

          if (req.session) {
            req.session.save((err) => {
              if (err) console.error("Session save error:", err);
              else console.log("Session saved successfully");
            });
          }

          return done(null, user);
        } catch (error) {
          console.error("Authentication error:", error);
          return done(error);
        }
      }
    )
  );

  // Google Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: "/auth/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            console.log("Google auth callback for profile:", profile.id);
            let user = await db.query.users.findFirst({
              where: eq(users.googleId, profile.id),
            });

            if (!user) {
              user = await db.query.users.findFirst({
                where: eq(users.email, profile.emails?.[0]?.value || ""),
              });

              if (user) {
                const [updatedUser] = await db
                  .update(users)
                  .set({
                    googleId: profile.id,
                    avatarUrl: profile.photos?.[0]?.value,
                    emailVerified: true,
                  })
                  .where(eq(users.id, user.id))
                  .returning();
                user = updatedUser;
              } else {
                const [newUser] = await db
                  .insert(users)
                  .values({
                    email: profile.emails?.[0]?.value || "",
                    name: profile.displayName,
                    googleId: profile.id,
                    avatarUrl: profile.photos?.[0]?.value,
                    password: await crypto.hash(randomBytes(32).toString("hex")),
                    emailVerified: true,
                  })
                  .returning();
                user = newUser;
              }
            }

            return done(null, user);
          } catch (error) {
            console.error("Google authentication error:", error);
            return done(error as Error);
          }
        }
      )
    );
  } else {
    console.warn("Google OAuth credentials not found, Google login will be disabled");
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

  return passport;
}

export { crypto };