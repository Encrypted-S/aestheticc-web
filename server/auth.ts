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
      console.log("Starting password comparison");
      const [hashedPassword, salt] = storedPassword.split(".");

      if (!hashedPassword || !salt) {
        console.error("Invalid stored password format:", { hashedPassword: !!hashedPassword, salt: !!salt });
        return false;
      }

      const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
      const suppliedPasswordBuf = (await scryptAsync(
        suppliedPassword,
        salt,
        64
      )) as Buffer;

      const isMatch = timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
      console.log("Password comparison completed. Match:", isMatch);
      return isMatch;
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
      },
      async (email, password, done) => {
        try {
          console.log("Local strategy authentication for email:", email);

          const user = await db.query.users.findFirst({
            where: eq(users.email, email),
          });

          if (!user) {
            console.log("User not found:", email);
            return done(null, false, { message: "Invalid email or password" });
          }

          console.log("User found:", { id: user.id, email: user.email });

          if (!user.password) {
            console.log("User has no password set:", email);
            return done(null, false, { message: "Invalid email or password" });
          }

          const isValid = await crypto.compare(password, user.password);
          console.log("Password validation result:", isValid);

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

export { crypto };