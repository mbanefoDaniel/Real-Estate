import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;

function generateOtp(): string {
  const bytes = crypto.randomBytes(4);
  const num = bytes.readUInt32BE(0) % 10 ** OTP_LENGTH;
  return String(num).padStart(OTP_LENGTH, "0");
}

function hashOtp(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

/**
 * Create an OTP, store it hashed in the DB, and email the plain code.
 */
export async function sendOtp(
  userId: string,
  email: string,
  purpose: "email-verify" | "password-change"
) {
  // Invalidate any previous unused OTPs for this user + purpose
  await prisma.emailOtp.updateMany({
    where: { userId, purpose, usedAt: null },
    data: { usedAt: new Date() },
  });

  const code = generateOtp();
  const codeHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.emailOtp.create({
    data: { userId, codeHash, purpose, expiresAt },
  });

  const subjectMap = {
    "email-verify": "Verify your email — Christoland",
    "password-change": "Password change OTP — Christoland",
  };

  const bodyMap = {
    "email-verify": `Your Christoland verification code is:\n\n${code}\n\nThis code expires in ${OTP_EXPIRY_MINUTES} minutes. If you didn't create an account, ignore this email.`,
    "password-change": `Your Christoland password change code is:\n\n${code}\n\nThis code expires in ${OTP_EXPIRY_MINUTES} minutes. If you didn't request this, secure your account immediately.`,
  };

  await sendEmail({
    to: email,
    subject: subjectMap[purpose],
    text: bodyMap[purpose],
  });

  return { sent: true };
}

/**
 * Verify a submitted OTP code against the database.
 */
export async function verifyOtp(
  userId: string,
  code: string,
  purpose: "email-verify" | "password-change"
): Promise<{ valid: boolean; error?: string }> {
  if (!code || code.length !== OTP_LENGTH) {
    return { valid: false, error: "Invalid OTP format." };
  }

  const codeHash = hashOtp(code);

  const otp = await prisma.emailOtp.findFirst({
    where: {
      userId,
      purpose,
      codeHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    return { valid: false, error: "Invalid or expired OTP." };
  }

  await prisma.emailOtp.update({
    where: { id: otp.id },
    data: { usedAt: new Date() },
  });

  return { valid: true };
}
