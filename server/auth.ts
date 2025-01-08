import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users } from "@db/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { z } from "zod";
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

// User validation schema
const userSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
});

export async function registerUser(userData: z.infer<typeof userSchema>) {
  console.log("Starting user registration process");
  const validatedData = userSchema.parse(userData);

  // Check if user already exists
  console.log("Checking for existing user with email:", validatedData.email);
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, validatedData.email),
  });

  if (existingUser) {
    console.log("User already exists with email:", validatedData.email);
    throw new Error("User already exists");
  }

  try {
    // Hash password and create user
    console.log("Creating new user with email:", validatedData.email);
    const hashedPassword = await crypto.hash(validatedData.password);

    const [user] = await db
      .insert(users)
      .values({
        email: validatedData.email,
        name: validatedData.name,
        password: hashedPassword,
        subscriptionStatus: "free",
        emailVerified: false,
      })
      .returning();

    console.log("User created successfully with ID:", user.id);
    return user;
  } catch (error) {
    console.error("Error creating user:", error);
    throw new Error("Failed to create user");
  }
}

export async function updateUserPassword(email: string, newPassword: string) {
  console.log("Updating password for user:", email);
  try {
    const hashedPassword = await crypto.hash(newPassword);
    console.log("New hashed password generated");

    const [user] = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.email, email))
      .returning();

    if (!user) {
      console.error("No user found with email:", email);
      throw new Error("User not found");
    }

    console.log("Password updated successfully for user:", email);
    return user;
  } catch (error) {
    console.error("Error updating password:", error);
    throw new Error("Failed to update password");
  }
}

export async function validateLogin(email: string, password: string) {
  console.log("Validating login for email:", email);

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    console.log("User not found:", email);
    throw new Error("Invalid email or password");
  }

  if (!user.password) {
    console.log("No password set for user:", email);
    throw new Error("Invalid email or password");
  }

  const isValid = await crypto.compare(password, user.password);
  if (!isValid) {
    console.log("Password validation failed for user:", email);
    throw new Error("Invalid email or password");
  }

  console.log("Login validation successful for user:", email);
  return user;
}

export function setupAuth(app: Express) {
  console.log("Setting up authentication...");

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

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

  // Authentication routes
  app.post("/api/register", async (req, res) => {
    try {
      const { email, password, name } = req.body;

      // Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      // Hash password
      const hashedPassword = await crypto.hash(password);

      // Create user
      const [user] = await db
        .insert(users)
        .values({
          email,
          name,
          password: hashedPassword,
        })
        .returning();

      // Log the user in
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Error logging in after registration" });
        }
        return res.json({ user });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        return res.status(500).json({ error: "Authentication error" });
      }
      if (!user) {
        return res.status(401).json({ error: info.message || "Invalid credentials" });
      }
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Login error" });
        }
        return res.json({ user });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(req.user);
  });

  // Development login route (only available in development)
  if (process.env.NODE_ENV === "development") {
    app.post("/api/dev-login", async (req, res) => {
      try {
        const [user] = await db
          .select()
          .from(users)
          .limit(1);

        if (!user) {
          return res.status(404).json({ error: "No users found" });
        }

        req.login(user, (err) => {
          if (err) {
            return res.status(500).json({ error: "Login error" });
          }
          return res.json({ user });
        });
      } catch (error) {
        console.error("Dev login error:", error);
        res.status(500).json({ error: "Dev login failed" });
      }
    });
  }
}