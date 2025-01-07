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
  const validatedData = userSchema.parse(userData);
  
  // Check if user already exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, validatedData.email),
  });

  if (existingUser) {
    throw new Error("User already exists");
  }

  // Hash password and create user
  const hashedPassword = await crypto.hash(validatedData.password);
  
  const [user] = await db
    .insert(users)
    .values({
      email: validatedData.email,
      name: validatedData.name,
      password: hashedPassword,
      subscriptionStatus: "free",
    })
    .returning();

  return user;
}

export async function validateLogin(email: string, password: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user || !user.password) {
    throw new Error("Invalid credentials");
  }

  const isValid = await crypto.compare(password, user.password);
  if (!isValid) {
    throw new Error("Invalid credentials");
  }

  return user;
}

export function setupPassport() {
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

  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, id),
      });
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  return passport;
}
