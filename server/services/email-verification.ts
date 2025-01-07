import jwt from "jsonwebtoken";
import { db } from "../../db";
import { verificationTokens, users } from "@db/schema";
import { eq } from "drizzle-orm";
import formData from "form-data";
import Mailgun from "mailgun.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-jwt-secret";
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY || ''
});

const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || '';

export async function generateVerificationToken(userId: number): Promise<string> {
  console.log(`Generating verification token for user ID: ${userId}`);
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });

  try {
    // Store token in database
    await db.insert(verificationTokens).values({
      userId,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });
    console.log('Verification token stored in database successfully');
    return token;
  } catch (error) {
    console.error('Error storing verification token:', error);
    throw new Error('Failed to generate verification token');
  }
}

export async function sendVerificationEmail(email: string, token: string) {
  console.log(`Attempting to send verification email to: ${email}`);
  console.log(`Using Mailgun domain: ${MAILGUN_DOMAIN}`);

  if (!MAILGUN_DOMAIN) {
    console.error('MAILGUN_DOMAIN environment variable is not set');
    throw new Error('Mailgun domain not configured');
  }

  const verificationUrl = `${process.env.APP_URL || 'http://localhost:5173'}/verify-email?token=${token}`;

  const emailData = {
    from: `Aesthetic Clinic CMS <noreply@${MAILGUN_DOMAIN}>`,
    to: [email],
    subject: "Verify your email address",
    text: `Welcome to Aesthetic Clinic CMS! Please verify your email address by clicking: ${verificationUrl}`,
    html: `
      <h1>Email Verification</h1>
      <p>Welcome to Aesthetic Clinic CMS! Please click the link below to verify your email address:</p>
      <a href="${verificationUrl}">${verificationUrl}</a>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't request this verification, please ignore this email.</p>
    `,
  };

  try {
    console.log('Sending email with Mailgun...');
    const result = await mg.messages.create(MAILGUN_DOMAIN, emailData);
    console.log("Verification email sent successfully:", result);
    return result;
  } catch (error) {
    console.error("Failed to send verification email:", error);
    throw new Error(`Failed to send verification email: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function verifyEmail(token: string): Promise<boolean> {
  console.log('Attempting to verify email with token');
  try {
    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    console.log(`Token decoded successfully for user ID: ${decoded.userId}`);

    // Check if token exists and is not expired
    const [dbToken] = await db
      .select()
      .from(verificationTokens)
      .where(eq(verificationTokens.token, token))
      .limit(1);

    if (!dbToken) {
      console.log('Token not found in database');
      return false;
    }

    if (dbToken.expiresAt < new Date()) {
      console.log('Token has expired');
      return false;
    }

    // Update user's email verification status
    await db
      .update(users)
      .set({ emailVerified: true })
      .where(eq(users.id, decoded.userId));
    console.log(`User ${decoded.userId} email verified successfully`);

    // Delete the used token
    await db
      .delete(verificationTokens)
      .where(eq(verificationTokens.token, token));
    console.log('Used token deleted from database');

    return true;
  } catch (error) {
    console.error("Email verification error:", error);
    return false;
  }
}