import { sendEmail } from "@/lib/email";

type LeadNotificationInput = {
  ownerEmail: string;
  propertyTitle: string;
  city: string;
  leadName: string;
  leadEmail: string;
  leadPhone?: string | null;
  leadMessage: string;
};

type ModerationNotificationInput = {
  ownerEmail: string;
  propertyTitle: string;
  city: string;
  status: "APPROVED" | "REJECTED";
  moderatedByEmail?: string | null;
  reason?: string | null;
};

type KycStatusNotificationInput = {
  email: string;
  status: "NOT_SUBMITTED" | "PENDING" | "VERIFIED" | "REJECTED";
  reviewedByEmail?: string | null;
};

type FeaturedPaymentNotificationInput = {
  ownerEmail: string;
  propertyTitle: string;
  city: string;
  reference: string;
  amountKobo: number;
  status: "PAID" | "FAILED" | "CANCELLED";
};

export async function sendLeadOwnerNotification(input: LeadNotificationInput) {
  const subject = `New lead for ${input.propertyTitle}`;
  const text = [
    `You have a new enquiry for your listing: ${input.propertyTitle} (${input.city}).`,
    "",
    `Name: ${input.leadName}`,
    `Email: ${input.leadEmail}`,
    `Phone: ${input.leadPhone || "Not provided"}`,
    "",
    "Message:",
    input.leadMessage,
  ].join("\n");

  await sendEmail({
    to: input.ownerEmail,
    subject,
    text,
  });
}

export async function sendModerationOwnerNotification(input: ModerationNotificationInput) {
  const action = input.status === "APPROVED" ? "approved" : "rejected";
  const subject = `Your listing was ${action}: ${input.propertyTitle}`;

  const text = [
    `Your listing \"${input.propertyTitle}\" in ${input.city} was ${action}.`,
    input.moderatedByEmail ? `Reviewed by: ${input.moderatedByEmail}` : "",
    input.status === "REJECTED" && input.reason ? `Reason: ${input.reason}` : "",
    "",
    "Sign in to Christoland to review your listing status.",
  ]
    .filter(Boolean)
    .join("\n");

  await sendEmail({
    to: input.ownerEmail,
    subject,
    text,
  });
}

export async function sendPasswordResetEmail(input: { email: string; resetUrl: string }) {
  const subject = "Reset your Christoland password";
  const text = [
    "We received a request to reset your password.",
    "",
    `Reset link: ${input.resetUrl}`,
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  await sendEmail({
    to: input.email,
    subject,
    text,
  });
}

export async function sendKycStatusNotification(input: KycStatusNotificationInput) {
  if (input.status === "PENDING" || input.status === "NOT_SUBMITTED") {
    return;
  }

  const statusText = input.status === "VERIFIED" ? "verified" : "rejected";
  const subject = `Your KYC has been ${statusText}`;
  const text = [
    `Your KYC submission has been ${statusText}.`,
    input.reviewedByEmail ? `Reviewed by: ${input.reviewedByEmail}` : "",
    input.status === "VERIFIED"
      ? "Your account is now compliance-verified."
      : "Please update your profile and re-submit your KYC document.",
    "",
    "Sign in to your dashboard for full details.",
  ]
    .filter(Boolean)
    .join("\n");

  await sendEmail({
    to: input.email,
    subject,
    text,
  });
}

export async function sendFeaturedPaymentStatusNotification(input: FeaturedPaymentNotificationInput) {
  const amountNgn = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Math.round(input.amountKobo / 100));

  const statusText =
    input.status === "PAID"
      ? "successful"
      : input.status === "FAILED"
        ? "failed"
        : "cancelled";

  const subject = `Featured payment ${statusText}: ${input.propertyTitle}`;
  const text = [
    `Your featured listing payment for \"${input.propertyTitle}\" (${input.city}) is ${statusText}.`,
    `Amount: ${amountNgn}`,
    `Reference: ${input.reference}`,
    input.status === "PAID"
      ? "Your listing boost is now active."
      : "You can retry the payment from your Manage Listings page.",
  ].join("\n");

  await sendEmail({
    to: input.ownerEmail,
    subject,
    text,
  });
}
