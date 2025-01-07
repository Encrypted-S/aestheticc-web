import jwt from "jsonwebtoken";
import { db } from "../../db";
import { verificationTokens, users } from "@db/schema";
import { eq } from "drizzle-orm";
import mailgunJs from "mailgun-js";

const JWT_SECRET = process.env.JWT_SECRET || "your-jwt-secret";
const mailgun = mailgunJs({
  apiKey: process.env.MAILGUN_API_KEY!,
  domain: process.env.MAILGUN_DOMAIN!
});

export async function generateVerificationToken(userId: number): Promise<string> {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });

  // Store token in database
  await db.insert(verificationTokens).values({
    userId,
    token,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  });

  return token;
}

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

  const data = {
    from: `Aesthetic Clinic CMS <noreply@${process.env.MAILGUN_DOMAIN}>`,
    to: email,
    subject: "Verify your email address",
    html: `
      <h1>Email Verification</h1>
      <p>Welcome to Aesthetic Clinic CMS! Please click the link below to verify your email address:</p>
      <a href="${verificationUrl}">${verificationUrl}</a>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't request this verification, please ignore this email.</p>
    `,
  };

  try {
    await mailgun.messages().send(data);
    console.log("Verification email sent successfully");
  } catch (error) {
    console.error("Failed to send verification email:", error);
    throw new Error("Failed to send verification email");
  }
}

export async function verifyEmail(token: string): Promise<boolean> {
  try {
    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };

    // Check if token exists and is not expired
    const [dbToken] = await db
      .select()
      .from(verificationTokens)
      .where(eq(verificationTokens.token, token))
      .limit(1);

    if (!dbToken || dbToken.expiresAt < new Date()) {
      return false;
    }

    // Update user's email verification status
    await db
      .update(users)
      .set({ emailVerified: true })
      .where(eq(users.id, decoded.userId));

    // Delete the used token
    await db
      .delete(verificationTokens)
      .where(eq(verificationTokens.token, token));

    return true;
  } catch (error) {
    console.error("Email verification error:", error);
    return false;
  }
}