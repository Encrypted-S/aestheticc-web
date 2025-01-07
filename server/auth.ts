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
  console.log("Validating login for email:", email);
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user || !user.password) {
    console.log("Invalid credentials - user not found or no password");
    throw new Error("Invalid credentials");
  }

  const isValid = await crypto.compare(password, user.password);
  if (!isValid) {
    console.log("Invalid credentials - password mismatch");
    throw new Error("Invalid credentials");
  }

  console.log("Login validation successful for user ID:", user.id);
  return user;
}

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
          return done(null, false, { message: error instanceof Error ? error.message : "Login failed" });
        }
      }
    )
  );

  // These serialization functions are not used during registration
  // They are only used for maintaining session after successful login
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