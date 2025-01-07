import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users } from "@db/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const scryptAsync = promisify(scrypt);

const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
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

export async function validateLogin(email: string, password: string) {
  console.log("Attempting to validate login for email:", email);

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    console.log("Login failed: User not found with email:", email);
    throw new Error("Invalid email or password");
  }

  if (!user.password) {
    console.log("Login failed: User has no password set");
    throw new Error("Invalid email or password");
  }

  const isValid = await crypto.compare(password, user.password);
  if (!isValid) {
    console.log("Login failed: Password mismatch for user:", email);
    throw new Error("Invalid email or password");
  }

  console.log("Login successful for user:", email);
  return user;
}

// Email login route with better error handling
export function setupPassport() {
  console.log("Setting up Passport authentication");

  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          const user = await validateLogin(email, password);
          return done(null, user);
        } catch (error) {
          console.error("Authentication error:", error);
          return done(null, false, { 
            message: error instanceof Error ? error.message : "Authentication failed" 
          });
        }
      }
    )
  );

  passport.serializeUser((user: Express.User, done) => {
    console.log("Serializing user:", user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log("Deserializing user:", id);
      const user = await db.query.users.findFirst({
        where: eq(users.id, id),
      });

      if (!user) {
        console.error("User not found during deserialization:", id);
        return done(null, null);
      }

      console.log("User deserialized successfully:", user.id);
      done(null, user);
    } catch (error) {
      console.error("Deserialization error:", error);
      done(error, null);
    }
  });

  return passport;
}