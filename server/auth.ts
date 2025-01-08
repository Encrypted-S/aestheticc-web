import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users } from "@db/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";
import type { Express } from "express";

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
  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Local Strategy
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          console.log("Attempting authentication for email:", email);
          const user = await db.query.users.findFirst({
            where: eq(users.email, email),
          });

          if (!user) {
            console.log("User not found:", email);
            return done(null, false, { message: "Invalid email or password" });
          }

          // Handle Google-authenticated users without passwords
          if (user.google_id && !user.password) {
            console.log("Google-authenticated user attempting password login:", email);
            return done(null, false, { message: "Please use Google Sign In" });
          }

          const isValid = await crypto.compare(password, user.password);
          if (!isValid) {
            console.log("Invalid password for user:", email);
            return done(null, false, { message: "Invalid email or password" });
          }

          console.log("Authentication successful for user:", email);
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
              where: eq(users.google_id, profile.id),
            });

            if (!user) {
              // Check if user exists with same email
              user = await db.query.users.findFirst({
                where: eq(users.email, profile.emails?.[0]?.value || ""),
              });

              if (user) {
                // Update existing user with Google ID
                const [updatedUser] = await db
                  .update(users)
                  .set({
                    google_id: profile.id,
                    avatar_url: profile.photos?.[0]?.value,
                    email_verified: true,
                  })
                  .where(eq(users.id, user.id))
                  .returning();
                user = updatedUser;
              } else {
                // Create new user
                const [newUser] = await db
                  .insert(users)
                  .values({
                    email: profile.emails?.[0]?.value || "",
                    name: profile.displayName,
                    google_id: profile.id,
                    avatar_url: profile.photos?.[0]?.value,
                    password: await crypto.hash(randomBytes(32).toString("hex")),
                    email_verified: true,
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